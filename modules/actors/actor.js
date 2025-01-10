import { ArmourItemTheEdge } from "../items/item.js";
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

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    const sys = this.system;
    for (let ch of Object.values(sys.attributes)) {
      ch.value = Math.max(ch.status + ch.advances, 0);
    }
    sys.health["max"] = sys.health.baseline_max + sys.health.status
    sys.heartRate["max"] = sys.heartRate.baseline_max + 
      sys.heartRate.status_max + sys.attributes["end"].value -
      2 * Math.floor((sys.age - 21) / 3)
    sys.heartRate["min"] = sys.heartRate.baseline_min + sys.heartRate.status_min -
      sys.attributes["end"].value
    sys.bloodVolumn["max"] = sys.bloodVolumn.baseline_max + sys.bloodVolumn.status

    sys.wounds = {}
  }

  /**
   * Is this Actor used as a template for other Actors?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("the_edge", "isTemplate");
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    const current = foundry.utils.getProperty(this.system, attribute);
    if ( !isBar || !isDelta || (current?.dtype !== "Resource") ) {
      return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }
    const updates = {[`system.${attribute}.value`]: Math.clamped(current.value + value, current.min, current.max)};
    const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  // Generates dict for the charactersheet to parse
  prepareSheet() {
    let preparedData = { system: { attr: {}, profGroups: [], weapons: {}, generalCombatAdvances: {}} };
    for (const key of Object.keys(this.system.attributes)) {
      let n = this.system.attributes[key].advances;
      preparedData.system.attr[key] = {
        cost: this._attrCost(n),
        refund: n == 0 ? 0 : this._attrCost(n-1)
      }
    }
    for (const [category, weapons] of Object.entries(this.system.weapons)) {
      for (const weapon of Object.keys(weapons)) {
        let n = this.system.weapons[category][weapon].advances
        preparedData.system.weapons[weapon] = {
          cost: this._attrCost(n),
          refund: n == 0 ? 0 : this._attrCost(n-1)
        }
      }
    }
    for (const [category, n] of Object.entries(this.system.generalCombatAdvances)) {
      preparedData.system.generalCombatAdvances[category] = {
        cost: this._attrCost(n),
        refund: n == 0 ? 0 : this._attrCost(n-1)
      }
    }

    foundry.utils.mergeObject(preparedData, {proficienciesLeft: {}, proficienciesRight: {}})
    preparedData.system.profGroups.push({
      physical: Object.keys(this.system.proficiencies["physical"]),
      social: Object.keys(this.system.proficiencies["social"]),
      technical: Object.keys(this.system.proficiencies["technical"]),
    })
    preparedData.system.profGroups.push({
      environmental: Object.keys(this.system.proficiencies["environmental"]),
      knowledge: Object.keys(this.system.proficiencies["knowledge"]),
      mental: Object.keys(this.system.proficiencies["mental"]),
    })

    let sys = this.system;
    let ch = sys.attributes;
    foundry.utils.mergeObject(preparedData, {
      attrs: THE_EDGE.attrs,
      canAdvance: true,
      zones: {
        1: {value: this.hrZone1(), tooltip: "75% Max Heart Rate".replace(/[ ]/g, "\u00a0")},
        2: {value: this.hrZone2(), tooltip: "90% Max Heart Rate".replace(/[ ]/g, "\u00a0")}
      },
      speeds: {
        Stride: { 
          value: Math.min(5 + Math.floor(ch.spd.value / 6  ), Math.floor(ch.foc.value * 0.665)),
          tooltip: "Min(5 + Spd/6, 66% foc)".replace(/[ ]/g, "\u00a0")
         },
        Run: { 
          value: Math.min(7 + Math.floor(ch.spd.value / 3  ),            ch.foc.value),
          tooltip: "Min(7 + Spd/3, Foc)".replace(/[ ]/g, "\u00a0")
         },
        Sprint: { 
          value: Math.min(8 + Math.floor(ch.spd.value / 1.5), Math.floor(ch.foc.value * 1.5)),
          tooltip: "Min(8 + Spd/1.5, 150% Foc)".replace(/[ ]/g, "\u00a0")
         }
      },
      herotoken: Array(sys.heroToken.max).fill(false).fill(true, 0, sys.heroToken.available)
    });

    return preparedData
  }

  useHeroToken(reason = "generic", details = {}) {
    this.update({"system.heroToken.available": this.system.heroToken.available - 1});
    foundry.utils.mergeObject(details, {name: this.name, reason: reason});
    ChatServer.transmitEvent("Hero Token", details);
  }

  regenerateHeroToken() {
    this.update({"system.heroToken.available": this.system.heroToken.available + 1});
  }

  async rollAttributeCheck(attribute, tempModifier = 0, vantage, transmit = true) {
    const threshold = this.system.attributes[attribute]["value"] + tempModifier;
    let result = await this.diceServer.attributeCheck(threshold, vantage)

    if (transmit) {
      let chatDetails = result
      foundry.utils.mergeObject(chatDetails, {
        attribute: attribute, threshold: threshold, actorId: this.id,
        advantage: vantage, temporary: tempModifier
      });
      ChatServer.transmitEvent("AbilityCheck", chatDetails);
    }
  }

  async rollProficiencyCheck(proficiency, tempModifier = 0, vantage, transmit = true) {
    let proficiencyData = Object.values(this.system.proficiencies)
      .find(profClass => proficiency in profClass)[proficiency]
    const dices = proficiencyData.dices;
    const thresholds = dices.map(dice => this.system.attributes[dice]["value"]);

    const modificator = proficiencyData["advances"] + proficiencyData["modifier"] + proficiencyData["status"];
    const results = await this.diceServer.proficiencyCheck(thresholds, modificator + tempModifier, vantage);

    if (transmit) {
      let chatDetails = {
        actorId: this.id, proficiency: proficiency, dices: dices, thresholds: thresholds,
        character_mod: modificator, temporary_mod: tempModifier, advantage: vantage
      };
      foundry.utils.mergeObject(chatDetails, results)
      ChatServer.transmitEvent("ProficiencyCheck", chatDetails);
    }
    return results;
  }

  async rollAttackCheck(dices, threshold, vantage, damageDice, damageType) {
    const results = await this.diceServer.attackCheck(
      dices, threshold, vantage, damageDice, this.system.generalCombatAdvances[damageType] || 0
    );
    return results;
  }

  coreValueChangeCost(coreName, newVal) {
    newVal = newVal ? +newVal : 0; // If empty / undefined
    if (!Number.isInteger(+newVal)) {return;}

    const oldVal = Aux.objectAt(this, coreName);

    let costFun = coreName.includes("proficiencies") ? this._profCost : this._attrCost;
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
    if (cost > availablePH) {
      const msg = LocalisationServer.parsedLocalisation(
        "AP missing", "Notifications",
        {name: coreName.split(".").last(), level: newVal, need: cost, available: availablePH}
      )
      ui.notifications.notify(msg)
      return;
    }

    this.update({
      [coreName]: newVal, "system.PracticeHours.used": this.system.PracticeHours.used + cost
    })
  }

  _determineWeight() {
    return this.items.reduce(
      (a, b) => a + ((b.system?.quantity || 1) * b.system?.weight || 0), 0
    );
  }
  
  async _determineEncumbrance() {
    let weight = this._determineWeight();
    // let str = this.system.attributes.Str.value;
    let str = this.system.attributes.str.advances + this.system.attributes.str.status;

    // Correct for the current encumbrance level
    let effects = this.itemTypes["Effect"]
    let currentEncumbrance = effects?.find(
      obj => obj.name == LocalisationServer.localise("Encumbrance"))
    str += currentEncumbrance?.system.effects?.reduce(
      (a,b) => a - b.value, -1
    ) || 0 // -1 for the phyiscal proficiencies
    if (str <= 0) return false; // We can't possibly do sensible things yet
    else if (weight <= str) {
      this._deleteEffect("Encumbrance");
      return true; // exit without being encumbered
    }
    
    let encumbranceLevel = Math.max(Math.ceil((weight - 1.5 * str) / (str / 2)), 0)
    let physicalMalus = -Math.ceil(encumbranceLevel / 2)
    let allMalus = -Math.floor(encumbranceLevel / 2)

    if (!currentEncumbrance) {
      const cls = getDocumentClass("Item");
      currentEncumbrance = await cls.create(
        {name: LocalisationServer.localise("Encumbrance"), type: "Effect"}, {parent: this}
      );
    }
    await currentEncumbrance.update({"system.effects": [
      {modifier: "Proficiencies.Physical", value: -1},
      {modifier: "Attributes.Physical", value: physicalMalus},
      {modifier: "Attributes.All", value: allMalus}
    ]})
    return true
  };

  async _updateStatus() {
    let map = THE_EDGE.effect_map

    // Reset to a blank state
    let update = {
      "system.health.status": 0, "system.heartRate.status_min": 0,
      "system.heartRate.status_max": 0, "system.bloodVolumn.status": 0
    }
    for (const attr of THE_EDGE.attrs) {
      update[`system.attributes.${attr}.status`] = 0;
    }
    for (const group of Object.keys(map.proficiencies)) {
      if (group === "all") continue;
      for (const proficiency of map.proficiencies[group]) {
        update[`system.proficiencies.${group}.${proficiency}.status`] = 0;
      }
    }
    for (const group of Object.keys(map.weapons)) {
      if (group === "all") continue;
      for (const proficiency of map.weapons[group]) {
        update[`system.weapons.${group}.${proficiency}.status`] = 0;
      }
    }

    // Iterate through items and apply their effects
    for (const item of this.items) {
      if (!["Effect", "Skill", "Combatskill"].includes(item.type) && (!item.system.equipped || !item.system.hasEffect)) continue;

      // Fetch item effect list
      let effects = [];
      if (["Skill", "Combatskill"].includes(item.type)) {
        for (let i = 0; i < item.system.level; ++i) {
          if (!item.system.levelEffects[i]) continue;
          effects.push(...item.system.levelEffects[i])
        }
      } else effects = item.system.effects;

      // Iterate effects
      for (const effect of effects) {
        let [modifierClass, modifierSubclass] = effect.modifier.split(".");
        switch (modifierClass.toLowerCase()) {
          case "attributes":
            modifierSubclass = modifierSubclass.toLowerCase();
            if (map["attributes"].all?.includes(modifierSubclass)) {
              // Individual part
              update[`system.attributes.${modifierSubclass}.status`] += effect.value;
            } else if (map["attributes"][modifierSubclass]) {
              // Grouped parts
              for (const subclass of map["attributes"][modifierSubclass]) {
                update[`system.attributes.${subclass}.status`] += effect.value;
              }
            }
            break;
          
          case "proficiencies":
            if (map["proficiencies"].all?.includes(modifierSubclass)) {
              // Individual part
              let group = Aux.getProficiencyGroup(modifierSubclass)
              update[`system.proficiencies.${group}.${modifierSubclass}.status`] += effect.value;
            } else if (modifierSubclass.toLowerCase() === "all") {
              for (const group of Object.keys(map.proficiencies)) {
                if (group === "all") continue;
                for (const proficiency of map.proficiencies[group]) {
                  update[`system.proficiencies.${group}.${proficiency}.status`] += effect.value;
                }
              }
            } else if (map["proficiencies"][modifierSubclass.toLowerCase()]) {
              // Grouped parts
              modifierSubclass = modifierSubclass.toLowerCase();
              for (const subclass of map["proficiencies"][modifierSubclass]) {
                update[`system.proficiencies.${modifierSubclass}.${subclass}.status`] += effect.value;
              }
            }
            break;

          case "weapons":
            if (map["weapons"].all?.includes(modifierSubclass)) {
              let group = Aux.getWeaponGroup(modifierSubclass)
              update[`system.weapons.${group}.${modifierSubclass}.status`] += effect.value;
            } else if (modifierSubclass.toLowerCase() === "all") {
              for (const group of Object.keys(map.weapons)) {
                if (group === "all") continue;
                for (const proficiency of map.weapons[group]) {
                  update[`system.weapons.${group}.${proficiency}.status`] += effect.value;
                }
              }
            } else if (map["weapons"][modifierSubclass.toLowerCase()]) {
              // Grouped parts
              modifierSubclass = modifierSubclass.toLowerCase();
              for (const subclass of map["weapons"][modifierSubclass]) {
                update[`system.weapons.${modifierSubclass}.${subclass}.status`] += effect.value;
              }
            }
            break;
          
          case "health":
            update["system.health.status"] += effect.value;
            break;
          
          case "heartrate":
            if (modifierSubclass.toLowerCase() == "min") {
              update["system.heartRate.status_min"] += effect.value;
            } else if (modifierSubclass.toLowerCase() == "max") {
              update["system.heartRate.status_max"] += effect.value;
            }
            break;
          
          case "bloodvolumn":
            update["system.bloodVolumn.status"] += effect.value;
            break;
        }
      }
    }
    await this.update(update);
  }

  async _advanceAttr(attrName, type) {
    const attrValue = this.system.attributes[attrName].advances;

    this._levelingSrv(`system.attributes.${attrName}.advances`, type, attrValue, this._attrCost)
  }

  async _advanceProf(profName, type) {
    let group = Aux.getProficiencyGroup(profName);
    let profValue = this.system.proficiencies[group][profName].advances;

    this._levelingSrv(`system.proficiencies.${group}.${profName}.advances`, type, profValue, this._profCost)
  }

  async _advanceWeaponProf(profName, type) {
    let group = Aux.getWeaponGroup(profName);
    let profValue = this.system.weapons[group][profName].advances;
    if (profValue >= this.system.generalCombatAdvances[group] && type == "advance") return undefined;

    this._levelingSrv(`system.weapons.${group}.${profName}.advances`, type, profValue, this._attrCost)
  }

  async _advanceCombatGeneral(category, type) {
    let profValue = this.system.generalCombatAdvances[category];
    this._levelingSrv(`system.generalCombatAdvances.${category}`, type, profValue, this._attrCost)
  }

  async _levelingSrv(updateName, type, level, costFunc) {
    const ph = this.system.PracticeHours;
    let update = {}
    if ((type == "advance") && (ph.max - ph.used >= costFunc(level)) ) {
      update[updateName] = level + 1
      update[`system.PracticeHours.used`] = ph.used + costFunc(level)
    }
    else if ((type == "refund") && (level > 0) ) {
      update[updateName] = level - 1
      update[`system.PracticeHours.used`] = ph.used - costFunc(level - 1)
    }
    this.update(update)
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
    if (cost < ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      return true;
    }
    
    return false
  }

  fulfillsRequirements(skill, newSkill = false) {
    const level = skill.system.level - newSkill;
    const requirements = skill.system.requirements[level];
    if (requirements === undefined || requirements.length == 0) return true;

    for (const requirement of requirements) {
      const sysMod = Aux.objectAt(this.system, requirement.modifier.toLowerCase());
      const skillRef = this.items.filter(x => x.name.toLowerCase() == requirement.modifier.toLowerCase());
      const details = structuredClone(requirement);
      if (sysMod) {
        if (sysMod.value < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: sysMod.value})
          const msg = LocalisationServer.parsedLocalisation(
            "Unmet requirements", "Notifications", details
          )
          ui.notifications.notify(msg);
          return false;
        }
      } else if (skillRef.length > 0) {
        if (skillRef[0].system.level < requirement.value) {
          foundry.utils.mergeObject(details, {valueIs: skillRef[0].system.level})
          const msg = LocalisationServer.parsedLocalisation(
            "Unmet requirements", "Notifications", details
          )
          ui.notifications.notify(msg);
          return false;
        }
      } else {
        const msg = LocalisationServer.parsedLocalisation(
          "Missing requirements", "Notifications", details
        )
        ui.notifications.notify(msg);
        return false;
      }
    }
    return true;
  }

  _attrCost(n) { return 10 * Math.floor(14 + 6 * Math.pow(1.2, n)); }
  _profCost(n) { return  5 * Math.floor( 5 + 5 * Math.pow(1.1, n)); }

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
      if (sys.hasLevels && sys.maxLevel > sys.level) {
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
          if (_cap.max == cap.max && _cap.used == cap.used) {
            _existingCopy = _item
          }
        } else {
          _existingCopy = _item
        }
      }
    }
    return _existingCopy;
  }

  _getWeaponPL(weaponID) {
    const weapon = this.items.get(weaponID).system

    let level = 0;
    for (const type of ["energy", "kinetic", "others"]) {
      if (this.system.weapons[type][weapon.type] === undefined) continue;
      level += this.system.weapons[type][weapon.type].advances +
        this.system.weapons[type][weapon.type].status +
        Math.floor((this.system.generalCombatAdvances[type] || 0) / 2);
    }
    let attr_mod = Math.floor( (
      this.system.attributes[weapon.leadAttr1.name].value - weapon.leadAttr1.value +
      this.system.attributes[weapon.leadAttr2.name].value - weapon.leadAttr2.value
    ) / 4)

    return Math.max(level + attr_mod, 0)
  }

  _getCombaticsPL() {
    const sys = this.system;
    const attr_mod = Math.floor((sys.attributes.str.value + sys.attributes.crd.value) / 4);
    const level = sys.weapons.others.Combatics.advances + sys.weapons.others.Combatics.status;

    return Math.max(level + attr_mod, 0);
  }

  _getCombaticsDamage() {
    const str = this.system.attributes.str.value;
    const crd = this.system.attributes.crd.value;
    return `1d${Math.floor((str+crd)/4)}+${Math.floor(str / 4)}`;
  }
  
  async applyDamage(damage, crit, damageType, name, givenLocation = undefined) {
    let [location, locationCoord] = Aux.generateWoundLocation(crit, this.system.sex, givenLocation)

    for (const armour of this.itemTypes["Armour"]) {
      if(!armour.system.equipped || armour.system.layer == "Outer") continue;
      let protectedLoc = armour.system.bodyPart;
      if (protectedLoc === "Entire" || (location === protectedLoc) || (location !== "Head" && protectedLoc === "Below_Neck")) {
        damage = await ArmourItemTheEdge.protect.call(armour, damage, damageType)
      }
    }

    if (damage > 0) {
      let health = this.system.health.value;
      let heartRate = this.system.heartRate;
      let update = {}
      update["system.health.value"] = Math.max(health - damage, 0)
      if (health > damage) { // increase heartrate upon damage
        update["system.heartRate.value"] = Math.min(heartRate.value + 5*damage, heartRate.max)
      } else if (health > 0) { // Dying damage
        update["system.heartRate.value"] = Math.max(heartRate.max - 5*(damage - health), 0)
      } else { // bleeding out
        update["system.heartRate.value"] = Math.max(heartRate.value - 5*damage, 0)
      }
      await this.update(update)

      let bt = THE_EDGE.bleeding_threshold[damageType]
      let bleeding = Math.floor(damage / bt) + ((damage % bt) / bt < Math.random())

      this.generateNewWound(name, location, locationCoord, damage, bleeding, damageType);
    }

    if(this.sheet.rendered) this.sheet._render();
  }

  async applyFallDamage(height, location) {
    const n = Math.floor(height / 2);
    const damageRoll = `${n*n}d4+${n*n+n}`;
    const damage = (await DiceServer.genericRoll(damageRoll));
    await this._applyImpactOrFallDamage(n, damage, "fall", `${height}m`, location)
    ChatServer.transmitEvent("fall", {actor: this.name, height: height, damage: damage, damageRoll: damageRoll});
  }

  async applyImpactDamage(speed, location) {
    const n = Math.floor(speed / 3);
    const damageRoll = `${n}d8+${n*n}`;
    const damage = (await DiceServer.genericRoll(damageRoll));
    await this._applyImpactOrFallDamage(n, damage, "impact", `${speed}m/s`, location)
    ChatServer.transmitEvent("impact", {actor: this.name, speed: speed, damage: damage, damageRoll: damageRoll});
  }

  async _applyImpactOrFallDamage(n, damage, name, description, location = undefined) {
    const nApproxWounds = Aux.randomInt(Math.ceil(n/3), n);
    const approxIncr = Math.ceil(damage / nApproxWounds)
    for (let i = 0; i < 2*nApproxWounds; i++) {
      const nextDamage = Math.min(damage, Math.floor(approxIncr / 2) + Aux.randomInt(1, approxIncr));
      await this.applyDamage(
        nextDamage, false, name,
        LocalisationServer.localise(`${name} damage title`) + " " + description,
        location
      );
      damage -= Math.ceil(nextDamage);
      if (damage <= 0) break;
    }
  }

  async generateNewWound(name, location, locationCoord, damage, bleeding, damageType) {
    const cls = getDocumentClass("Item");
    const wound = await cls.create({name: name, type: "Wounds"}, {parent: this});
    const type = this._generateWoundType(damage, damageType);
    wound.update({
      "system.bodyPart": location, "system.coordinates": locationCoord,
      "system.damage": damage, "system.bleeding": bleeding, "system.type": type
    });
  }

  _generateWoundType(damage, damageType) {
    let odds = undefined;
    switch (damageType) {
      case "energy":
        odds = {"abrasion": 5, "light burn": damage, "strong burn": Math.max(0, Math.ceil(damage*(damage - 9)/10))};
        break;
      case "kinetic":
        odds = {"abrasion": 5, "laceration": damage, "fracture":    Math.max(0, Math.ceil(damage*(damage - 9)/10))};
        break;
      case "elemental":
        odds = {"light burn": damage, "strong burn": Math.max(0, damage*(damage - 5)/20)};
        break;
      case "fall":
      case "impact":
        odds = {"abrasion": 10, "laceration": Math.ceil(damage/2), "fracture": Math.max(0, Math.ceil(damage*(damage - 9)/10))};
        break;
      case "HandToHand":
        odds = {"abrasion": 10, "fracture": Math.max(0, Math.ceil(damage*(damage - 9)/10))};
    }
    return Aux.pickFromOdds(odds);
  }

  attachOuterArmour(armourId, shellId, tokenId) {
    const armour = this.items.get(armourId);
    const shell = this.items.get(shellId);
    if (shell.system.attachmentPoints > armour.system.attachmentPoints) {
      let msg = LocalisationServer.parsedLocalisation(
        "Missing Attachment points", "Notifications",
        {available: armour.system.attachmentPoints, needed: shell.system.attachmentPoints}
      )
      ui.notifications.notify(msg)
    }
    shell.update({"system.equipped": true});
    const attachments = armour.system.attachments;
    attachments.push({actorId: this.id, tokenId, shell: shell});
    armour.update({"system.attachments": attachments});
  }

  async applyBloodLoss() {
    let wounds = this.itemTypes["Wounds"];
    let bleeding = wounds.map(x => x.system.bleeding).sum();
    let sys = this.system;
    let lossRate = Math.floor(20 * sys.heartRate.value / sys.heartRate.max);
    let bloodLoss = lossRate * bleeding;
    this.update({"system.bloodVolumn.value": Math.max(sys.bloodVolumn.value - bloodLoss, 0)});
  }

  async applyCombatStrain(strains, communication) {
    let zone = this.getHRZone();
    let maxStrain = Math.max(...strains);
    let isRest = maxStrain < zone;
    let hrChange = 0;
    if (isRest) {
      hrChange = 2 * strains.map(x => x - zone).reduce((a, b) => a+b, 0)
    } else {
      hrChange = 4 * strains.map(x => Math.max(x - zone + 1, 0)).reduce((a,b) => a+b, 0)
    }

    hrChange += (maxStrain - zone + 1) * [0, 1, 2, 4][communication]
    
    let hr = this.system.heartRate;
    let threshold = [hr.min, this.hrZone1(), this.hrZone2(), hr.max][maxStrain]
    let clamper = isRest ? Math.max : Math.min;
    await this.update({"system.heartRate.value": clamper(hr.value + hrChange, threshold)});
    
    let newZone = this.getHRZone();
    if (newZone != zone) {this._updateStrain()}
    
    ChatServer.transmitEvent("strainUpdate",
      {strains: strains, communication: communication, hrChange: hrChange})
  }

  async _updatePain() {
    const damageTotal = this.system.health.max - this.system.health.value;
    const damageBodyParts = {arms: 0, legs: 0, torso: 0, head: 0};
    const wounds = this.itemTypes["Wounds"];
    for (const wound of wounds) {
      switch (wound.system.bodyPart) {
        case "Torso":
          damageBodyParts.torso += wound.system.damage;
          break;
        case "Head":
          damageBodyParts.head += wound.system.damage;
          break;
        case "LegsLeft":
        case "LegsRight":
          damageBodyParts.legs += wound.system.damage;
          break;
        case "ArmsLeft":
        case "ArmsRight":
          damageBodyParts.arms += wound.system.damage;
      }
    }

    if (damageTotal < 15) { this._deleteEffect("Pain") }
    else {
      const currentPain = await this._getEffectOrCreate("Pain");
      const n = Math.floor(damageTotal / 15);
      await currentPain.update({"system.effects": [
        {modifier: "Proficiencies.All", value: -n}, {modifier: "Weapons.All", value: -n}
      ]})
    }

    for (const [bodyPart, damage] of Object.entries(damageBodyParts)) {
      if (damage < 15) { this._deleteEffect(`Injuries ${bodyPart}`) }
      else {
        const injury = await this._getEffectOrCreate(`Injuries ${bodyPart}`);
        const n = Math.floor(damage / 15);
        await injury.update({"system.effects": [
          {modifier: `system.${THE_EDGE.injury_map[bodyPart]}`, value: -n}
        ]})
      }
    }
  }

  async _updateStrain() {
    let zone = this.getHRZone();
    if (zone == 1) {
      this._deleteEffect("Strain");
      return;
    }

    let currentStrain = await this._getEffectOrCreate("Strain")
    if (zone == 2) {
      await currentStrain.update({"system.effects": [
        {modifier: "Weapons.All", value: -1},
        {modifier: "Attributes.Crd", value: -1},
        {modifier: "Attributes.Spd", value: 1}
      ]})
    } else {
      await currentStrain.update({"system.effects": [
        {modifier: "Weapons.All", value: -3},
        {modifier: "Attributes.Crd", value: -2},
        {modifier: "Attributes.Social", value: -1},
        {modifier: "Attributes.Mental", value: -1}
      ]})
    }
  }

  async _getEffectOrCreate(name) {
    let effects = this.itemTypes["Effect"]
    let effect = effects?.find(obj => obj.name == LocalisationServer.localise(name));

    if (!effect) {
      const cls = getDocumentClass("Item");
      effect = await cls.create(
        {name: LocalisationServer.localise(name), type: "Effect"}, {parent: this}
      );
    }
    return effect;
  }

  _deleteEffect(name) {
    let effects = this.itemTypes["Effect"]
    let effect = effects?.find(obj => obj.name == LocalisationServer.localise(name));
    if (effect) { effect.delete() }
  }

  getHRZone() {
    let hr = this.system.heartRate.value;
    if (hr < this.hrZone1()) return 1;
    if (hr < this.hrZone2()) return 2;
    return 3;
  }

  hrZone1() {return 5 * Math.floor(this.system.heartRate.max * 75 / 500)}
  hrZone2() {return 5 * Math.floor(this.system.heartRate.max * 90 / 500)}

  shortRest() {this._rest("1d3 % 2", "1d3-2", "short rest")} // 2/3, 1/3 chances
  longRest() {this._rest("2d3kh", "2d3kl", "long rest")}

  async _rest(coagulationDice, healingDice, type) {
    let wounds = this.itemTypes["Wounds"];
    let accHealing = 0;
    let accCoagulation = 0;
    for (const wound of wounds) {
      if (wound.system.bleeding > 0) {
        let coagulationRoll = await new Roll(coagulationDice).evaluate()
        let coagulation = coagulationRoll.total
        if (wound.system.damage == 0 && wound.system.bleeding <= coagulation) {
          accCoagulation += wound.system.bleeding;
          wound.delete();
        } else if (coagulation > 0) {
          accCoagulation += Math.min(coagulation, wound.system.bleeding);
          wound.update({"system.bleeding": Math.max(wound.system.bleeding - coagulation, 0)});
        }
      } else {
        let healingRoll = await new Roll(healingDice).evaluate()
        let healing = healingRoll.total
        if (wound.system.damage <= healing) { // shortcut: wound healed afterwards
          accHealing += wound.system.damage;
          wound.delete();
        } else if (healing > 0) {
          accHealing += Math.min(healing, wound.system.damage)
          wound.update({"system.damage": Math.max(wound.system.damage - healing, 0)});
        }
      }
    }
    this.update({"system.health.value": Math.min(this.system.health.max, this.system.health.value + accHealing)});
    ChatServer.transmitEvent(type, {healing: accHealing, coagulation: accCoagulation})
  }
}
