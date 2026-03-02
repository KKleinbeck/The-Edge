import THE_EDGE from "../system/config-the-edge.js";
import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import ChatServer from "../system/chat_server.js";
import DiceServer from "../system/dice_server.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class TheEdgeActor extends Actor {
  constructor(...args) {
    super(...args);
    this.diceServer = new DiceServer();
  }

  async update(data={}, operation={}) {
    console.log("I want to change: ", structuredClone(data))
    this.system.onUpdate(data);
    console.log(structuredClone(data))
    super.update(data, operation)
  }

  /**
   * Is this Actor used as a template for other Actors?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("the_edge", "isTemplate");
  }

  interpretCheck(type, roll) {
    return this.diceServer._interpretCheck(type, roll);
  }

  async rollAttributeCheck(checkData, roll = "roll", transmit = true) {
    checkData.threshold = this.system.attributes[checkData.attribute]["value"] +
      checkData.temporaryMod;
    const result = await game.the_edge.diceServer.attributeCheck(checkData.threshold, checkData.vantage);

    if (transmit) {
      foundry.utils.mergeObject(checkData, result);
      ChatServer.transmitEvent("AbilityCheck", checkData, roll);
    }
  }

  async rollProficiencyCheck(checkData, roll = "roll", transmit = true) {
    checkData.proficiency = checkData.proficiency.toLowerCase();
    const proficiencyData = Object.values(this.system.proficiencies)
      .find(profClass => checkData.proficiency in profClass)[checkData.proficiency]
    checkData.dices = proficiencyData.dices;
    checkData.permanentMod = proficiencyData.value;
    checkData.thresholds = checkData.dices.map(dice => this.system.attributes[dice]["value"]);

    const results = await game.the_edge.diceServer.proficiencyCheck(
      checkData.thresholds, checkData.permanentMod + (checkData.temporaryMod || 0), checkData.vantage
    );

    if (transmit) {
      foundry.utils.mergeObject(checkData, results)
      ChatServer.transmitEvent("ProficiencyCheck", checkData, roll);
    }
    return results;
  }

  async rollAttackCheck(dices, threshold, vantage, damageDice, damageType) {
    const results = await this.diceServer.attackCheck(
      dices, threshold, vantage, damageDice,
      Math.floor((this.system.weapons.general["General weapon proficiency"].value || 0) / 2)
    );
    return results;
  }

  async _advanceAttr(attrName, type) {
    const attrValue = this.system.attributes[attrName].advances;
    const newVal = attrValue + (type == "advance" ? 1 : -1);

    this.changeCoreValue(`system.attributes.${attrName}.advances`, Math.max(newVal, 0));
  }

  coreValueChangeCost(coreName, newVal) {
    newVal = newVal ? +newVal : 0; // If empty / undefined
    if (!Number.isInteger(+newVal)) {return;}

    const oldVal = Aux.objectAt(this, coreName);

    let costFun = coreName.includes("proficiencies") ? THE_EDGE.profCost : THE_EDGE.attrCost;
    let cost = 0;
    if (newVal > oldVal) {
      for (let n = oldVal; n < newVal; n++) cost += costFun(n);
    } else {
      for (let n = newVal; n < oldVal; n++) cost -= costFun(n);
    }
    return cost;
  }

  changeCoreValue(coreName, newVal) {
    newVal = newVal ? +newVal : 0; // If empty / undefined
    if (!Number.isInteger(+newVal)) {return;}

    const cost = this.coreValueChangeCost(coreName, newVal);
    const availablePH = this.system.PracticeHours.max - this.system.PracticeHours.used;
    const parts = coreName.split(".");
    if (cost > availablePH) {
      const msg = LocalisationServer.parsedLocalisation(
        "PH missing", "Notifications",
        {name: parts[parts.length - 2], level: newVal, need: cost, available: availablePH}
      )
      ui.notifications.notify(msg)
      return;
    }
    if (coreName.split(".")[1] === "weapons") {
      if (coreName.includes("Hand-to-Hand combat")) {
        const combaticsBasic = Math.floor(
          (this.system.attributes.str.value + this.system.attributes.crd.value) / 2
        );
        if (newVal > combaticsBasic) {
          const msg = LocalisationServer.parsedLocalisation(
            "Core Value combatics too small", "Notifications",
            {level: newVal, basic: combaticsBasic}
          )
          ui.notifications.notify(msg)
          return;
        } 
      } else if (coreName.includes("General weapon proficiency")) { // Do nothing
      } else if (newVal > this.system.weapons.general["General weapon proficiency"].value) {
        const msg = LocalisationServer.parsedLocalisation(
          "Core Value too small", "Notifications",
          {name: parts[parts.length - 2], level: newVal, basic: this.system.weapons.general["General weapon proficiency"].value}
        )
        ui.notifications.notify(msg)
        return;
      }
    }

    this.update({
      [coreName]: newVal, "system.PracticeHours.used": this.system.PracticeHours.used + cost
    })
  }

  get itemWeight() {
    return this.items.reduce(
      (a, b) => a + ((b.system?.quantity || 1) * b.system?.weight || 0), 0
    );
  }

  async updateBloodloss() {
    let res = this.system.attributes.res.advances + this.system.attributes.res.status;
    let currentBloodLoss = this._getEffect("Vertigo");
    if (currentBloodLoss) res -= currentBloodLoss?.system?.effects[0].value || 0;
    if (res <= 1) return; // Cannot possibly do sensible things right now

    const bloodloss = this.system.bloodLoss.value;
    const statusThreshold = this.system.statusEffects.bloodlossThreshold.status;
    const bloodlossEff = Math.max(bloodloss - statusThreshold - res + 1, 0);
    const stepSize = this.system.statusEffects.bloodlossStepSize.status + Math.floor(res / 2);
    const level = Math.ceil(bloodlossEff / stepSize) + this.system.statusEffects.vertigo.status;
    if (level == 0) {
      await this._deleteEffect("Vertigo");
      return;
    }

    if (!currentBloodLoss) currentBloodLoss = await this._getEffectOrCreate("Vertigo");
    if (currentBloodLoss.system.effects[0].value != -level) {
      await currentBloodLoss.update({"system.effects": [
        {group: "attributes", name: "mental", value: -level},
      ], "system.statusEffect": true, "system.gm_description": `${level}`})
    }
  }

  _updateCritDice(effect, critDice) {
    if (effect.name == "crit") {
      const index = critDice[effect.group].critFail.indexOf(effect.value);
      if (index > -1) {
        critDice[effect.group].critFail.splice(index, 1);
        return true;
      }
      critDice[effect.group].crit.push(effect.value)
      return true;
    } else if (effect.name == "critFail") {
      const index = critDice[effect.group].crit.indexOf(effect.value);
      if (index > -1) {
        critDice[effect.group].crit.splice(index, 1);
        return true;
      }
      critDice[effect.group].critFail.push(effect.value)
      return true;
    }
    return false;
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
        const skillRef = this.items.filter(x => x.name.toLowerCase() == requirement.name.toLowerCase());
        if (skillRef.length == 0) {
          const msg = LocalisationServer.parsedLocalisation(
            "Missing requirements", "Notifications", details
          )
          ui.notifications.notify(msg);
          return false;
        } else if (skillRef[0].system.level < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: skillRef[0].system.level})
          const msg = LocalisationServer.parsedLocalisation(
            "Unmet requirements", "Notifications", details
          )
          ui.notifications.notify(msg);
          return false;
        }
      } else {
        const target = THE_EDGE.coreValueMap[group][requirement.name] + ".advances";
        const sysMod = Aux.objectAt(this.system, target);
        if (sysMod < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: sysMod});
          const msg = LocalisationServer.parsedLocalisation("Unmet requirements", "Notifications", details);
          ui.notifications.notify(msg);
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
    for (const _item of this.items) {
      if (_item.name == item.name) {
        if (_item.type == "Ammunition") {
          let _cap = _item.system.capacity
          let cap = item.system.capacity
          if (_cap.max == cap.max && _cap.value == cap.value) {
            _existingCopy = _item
          }
        } else {
          _existingCopy = _item
        }
      }
    }
    return _existingCopy;
  }

  async generateNewWound(name, location, locationCoord, damage, bleeding, damageType) {
    const cls = getDocumentClass("Item");
    const wound = await cls.create({name: name, type: "Wounds"}, {parent: this});
    const type = Aux.pickFromOdds(THE_EDGE.wound_odds(damage, damageType));
    await wound.update({
      "system.bodyPart": location, "system.coordinates": locationCoord,
      "system.damage": damage, "system.bleeding": bleeding, "system.type": type
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

  getHrChangeFromStrain(strain) {
    const zone = this.system.getHRZone();
    if (strain < zone) return 2 * (strain - zone);
    return 4 * (strain - zone + 1);
  }

  async applyCombatStrain() {
    if (this.system.health.value <= 0) {
      await this.system.updateHr(Math.max(this.system.heartRate.value - 10, 0));
    } else {
      this.applyStrains(game.the_edge.combatLog.strainLog.map(x => x.hrChange));
    }
  }

  async applyStrains(strains) {
    const hr = this.system.heartRate;
    const isRest = Math.max(...strains) <= 0;
    const threshold = isRest ? hr.min.value : hr.max.value;
    const clamper = isRest ? Math.max : Math.min;

    let hrChange = isRest ? strains.sum() : strains.filter(x => x >= 0).sum();
    const hrNew = clamper(hr.value + hrChange, threshold);
    hrChange = hrNew - hr.value;
    await this.system.updateHr(hrNew);

    return hrChange;
  }

  _getEffect(name) {
    const effects = this.itemTypes["Effect"];
    return effects?.find(obj => obj.name == LocalisationServer.localise(name));
  }

  async _getEffectOrCreate(name) {
    let effect = this._getEffect(name);

    if (!effect) {
      const cls = getDocumentClass("Item");
      effect = await cls.create(
        {name: LocalisationServer.localise(name), type: "Effect"}, {parent: this}
      );
    }
    return effect;
  }

  async _deleteEffect(name) {
    const effect = this._getEffect(name)
    if (effect) { await effect.delete() }
  }
}
