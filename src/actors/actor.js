import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import NotificationServer from "../system/notifications.js";
import THE_EDGE from "../system/config-the-edge.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class TheEdgeActor extends Actor {
  async update(data={}, operation={}) {
    this.system.onUpdate(data);
    await super.update(data, operation)
  }

  /**
   * Is this Actor used as a template for other Actors?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("the_edge", "isTemplate");
  }

  interpretCheck(type, roll) {
    return this.diceServer.interpretCheck(type, roll);
  }

  get itemWeight() {
    return this.items.reduce(
      (a, b) => a + ((b.system?.quantity || 1) * b.system?.weight || 0), 0
    );
  }

  learnSkill(newSkill) {
    for (const skill of this.items) {
      if (skill.name == newSkill.name && skill.type == newSkill.type && skill.system.level) {
        // Skill already exists and can potentially be leveled
        this.skillLevelIncrease(skill.id);
        return false;
      }
    }

    // Skill doesn't exist yet
    if (!this.fulfillsRequirements(newSkill, true)) return false;
    const ph = this.system.PracticeHours
    let cost = Aux.getSkillCost(newSkill)
    if (cost <= ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      return true;
    } else {
      const msg = LocalisationServer.parsedLocalisation(
        "Missing PH", "Notifications",
        {name: newSkill.name, need: cost, available: ph.max - ph.used}
      )
      ui.notifications.notify(msg);
    }
    
    return false
  }

  fulfillsRequirements(skill, newSkill = false) {
    if (skill.type == "Languageskill") return true;
    const level = skill.system.level - newSkill;
    const requirements = skill.system.requirements[level];
    if (requirements === undefined || requirements.length == 0) return true;

    for (const requirement of requirements) {
      const group = requirement.group;
      const details = structuredClone(requirement);
      if (group == "skills") {
        const skillRef = this.items.filter(x => 
          x.name.toLowerCase() == requirement.field.toLowerCase());
        if (skillRef.length == 0) {
          NotificationServer.notify("Missing requirements", details)
          return false;
        } else if (skillRef[0].system.level < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: skillRef[0].system.level})
          NotificationServer.notify("Unmet requirements", details);
          return false;
        }
      } else {
        const target = THE_EDGE.coreValueMap[group][requirement.field] + ".advances";
        const sysMod = Aux.objectAt(this.system, target);
        if (sysMod < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: sysMod});
          NotificationServer.notify("Unmet requirements", details);
          return false;
        }
      }
    }
    return true;
  }

  skillLevelIncrease(skillID) {
    let skill = this.items.get(skillID)
    if (!this.fulfillsRequirements(skill)) return false;
    let cost = Aux.getSkillCost(skill, "increase");
    const ph = this.system.PracticeHours
    if (cost < ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      skill.update({"system.level": skill.system.level + 1})
      return true
    }
    return false
  }

  skillLevelDecrease(skillID) {
    let skill = this.items.get(skillID)
    let level = skill.system.level
    let gain = Aux.getSkillCost(skill, "decrease")
    const ph = this.system.PracticeHours
    this.update({"system.PracticeHours.used": ph.used - gain})
    if (level > 1) skill.update({"system.level": level - 1});
    else skill.delete()
  }

  deleteSkill(skillID) {
    const skill = this.items.get(skillID)
    let gain = Aux.getSkillCost(skill, "delete");
    const ph = this.system.PracticeHours
    this.update({"system.PracticeHours.used": ph.used - gain})
    skill.delete()
  }

  async addOrCreateVantage(vantage) {
    let AP = this.system.AdvantagePoints;

    // Can be created or leveled?
    if (vantage.type == "Advantage" && vantage.system.AP + AP.used > AP.max) {
      let msg = LocalisationServer.parsedLocalisation(
        "AP missing", "Notifications",
        {name: vantage.name, need: vantage.system.AP, available: AP.max - AP.used}
      )
      ui.notifications.notify(msg);
      return false;
    } 
    const existingCopy = this.findItem(vantage)
    if (existingCopy && existingCopy.system.level >= existingCopy.system.maxLevel) {
      let msg = LocalisationServer.parsedLocalisation(
        "Max Level", "Notifications", {name: vantage.name}
      )
      ui.notifications.notify(msg)
      return false;
    } 

    // Now create or level
    let update = vantage.type == "Advantage" ?
      {"system.AdvantagePoints.used": this.system.AdvantagePoints.used + vantage.system.AP} :
      {"system.AdvantagePoints.max": this.system.AdvantagePoints.max + vantage.system.AP}

    if (existingCopy) {
      const sys = existingCopy.system
      if (sys.maxLevel > sys.level) {
        await existingCopy.update({"system.level": sys.level + 1})
      }
    } else {
      const cls = getDocumentClass("Item");
      const newVantage = await cls.create({name: vantage.name, type: vantage.type}, {parent: this});
      newVantage.update({"system": vantage.system});
    }
    await this.update(update);
  }

  decrementVantage(vantage) {
    const AP = this.system.AdvantagePoints;
    const itemAP = vantage.system.AP;
    if (vantage.type == "Disadvantage" && AP.max - itemAP < AP.used) {
      let msg = LocalisationServer.parsedLocalisation(
        "AP missing decrement", "Notifications", {name: vantage.name, need: itemAP, available: AP.max - AP.used}
      )
      ui.notifications.notify(msg);
      return undefined;
    }

    if (vantage.type == "Advantage") this.update({"system.AdvantagePoints.used": AP.used - itemAP});
    else this.update({"system.AdvantagePoints.max": AP.max - itemAP});

    if (vantage.system.level > 1) vantage.update({"system.level": vantage.system.level - 1});
    else vantage.delete();
  }

  deleteVantage(vantage) {
    const AP = this.system.AdvantagePoints;
    const itemAP = (vantage.system.hasLevels ? vantage.system.level : 1) * vantage.system.AP;
    if (vantage.type == "Disadvantage" && AP.max - itemAP < AP.used) {
      let msg = LocalisationServer.parsedLocalisation(
        "AP missing deletion", "Notifications", {name: vantage.name, need: itemAP, available: AP.max - AP.used}
      )
      ui.notifications.notify(msg);
      return undefined;
    }

    if (vantage.type == "Advantage") this.update({"system.AdvantagePoints.used": AP.used - itemAP});
    else this.update({"system.AdvantagePoints.max": AP.max - itemAP});
    vantage.delete();
  }

  findItem(item) {
    let _existingCopy = false
    for (const _item of this.itemTypes[item.type]) {
      if (_item.name == item.name) {
        if (_item.type == "Ammunition") {
          const _cap = _item.system.capacity;
          const cap = item.system.capacity;
          if (_cap.max == cap.max && _cap.value == cap.value && !_item.system.loaded) {
            _existingCopy = _item
          }
        } else {
          _existingCopy = _item
        }
      }
    }
    return _existingCopy;
  }

  getSkillEffects(onlyActive = false) {
    function skillFilter(skill) {
      const hasEffect = skill.system.modifiers.length > 0;
      const isActive = !onlyActive || skill.system.active;
      return hasEffect && isActive;
    }

    const skillItems = [
      ...(this.itemTypes["Combatskill"]?.filter(x => skillFilter(x)) ?? []),
      ...(this.itemTypes["Skill"]?.filter(x => skillFilter(x)) ?? []),
      ...(this.itemTypes["Medicalskill"]?.filter(x => skillFilter(x)) ?? []),
    ];
    return skillItems.map(item => {
      return {
        name: item.name, id: item.id, active: item.system.active,
        modifiers: item.system.modifiers
      };
    });
  }

  getItemEffects(onlyEquipped = false) {
    function itemFilter(item) {
      const hasEffect = item.system.modifiers.length > 0;
      const isEquipped = !onlyEquipped || item.system.equipped;
      return hasEffect && isEquipped;
    }

    const effectItems = [
      ...(this.itemTypes["Armour"]?.filter(x => itemFilter(x)) ?? []),
      ...(this.itemTypes["Weapon"]?.filter(x => itemFilter(x)) ?? []),
    ];
    return effectItems.map(item => {
      return {
        name: item.name, id: item.id, equipped: item.system.equipped,
        modifiers: item.system.modifiers
      }
    });
  }

  attachOuterArmour(armourId, shellId, tokenId) {
    const armour = this.items.get(armourId);
    const shell = this.items.get(shellId);
    const availableAttachment = armour.system.attachmentPoints.max - armour.system.attachmentPoints.used;
    if (shell.system.attachmentPoints.max > availableAttachment) {
      let msg = LocalisationServer.parsedLocalisation(
        "Missing Attachment points", "Notifications",
        {available: availableAttachment, needed: shell.system.attachmentPoints.max}
      )
      ui.notifications.notify(msg)
    }
    // Hack relevant information into the shells attachment list, needed in item.js upon breaking
    shell.update({"system.equipped": true, "system.attachments": [{actorId: this.id, tokenId: tokenId, armourId: armour._id}]});
    const attachments = armour.system.attachments;
    attachments.push({actorId: this.id, tokenId: tokenId, shellId: shell._id, shell: shell});
    armour.update({
      "system.attachments": attachments,
      "system.attachmentPoints.used": armour.system.attachmentPoints.used + shell.system.attachmentPoints.max
    });
  }
}
