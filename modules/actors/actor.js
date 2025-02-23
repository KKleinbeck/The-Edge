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
    for (const coreValPath of Object.values(foundry.utils.flattenObject(THE_EDGE.core_value_map))) {
      const coreVal = Aux.objectAt(this.system, coreValPath);
      coreVal.value = coreVal.advances + coreVal.status;
    }
    sys.health.max.value = sys.health.max.baseline + sys.health.max.status +
      sys.attributes.str.advances + Math.floor((sys.attributes.end.advances + sys.attributes.res.advances) / 2);
    
    sys.heartRate.max.value = sys.heartRate.max.baseline + sys.heartRate.max.status +
      sys.attributes.end.value - 2 * Math.floor((sys.age - 21) / 3) - sys.bloodLoss.value;
    sys.heartRate.min.value = Math.max(20, sys.heartRate.min.baseline + sys.heartRate.min.status +
      (sys.health.max.value - sys.health.value) - sys.attributes.end.value);

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
    let preparedData = { system: { attr: {}, profGroups: [], weapons: {} } };
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

  useHeroToken(reason = "generic") {
    this.update({"system.heroToken.available": this.system.heroToken.available - 1});
    ChatServer.transmitEvent("Hero Token", {name: this.name, reason: reason});
  }

  regenerateHeroToken() {
    this.update({"system.heroToken.available": this.system.heroToken.available + 1});
  }

  interpretCheck(type, roll) {
    return this.diceServer._interpretCheck(type, roll);
  }

  async rollAttributeCheck(checkData, roll = "roll", transmit = true) {
    checkData.threshold = this.system.attributes[checkData.attribute]["value"] +
      checkData.temporaryMod;
    const result = await this.diceServer.attributeCheck(checkData.threshold, checkData.vantage);

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

    const results = await this.diceServer.proficiencyCheck(
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

    this.changeCoreValue(`system.attributes.${attrName}.advances`, newVal);
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
    const parts = coreName.split(".");
    if (cost > availablePH) {
      const msg = LocalisationServer.parsedLocalisation(
        "PH missing", "Notifications",
        {name: parts[parts.length - 2], level: newVal, need: cost, available: availablePH}
      )
      ui.notifications.notify(msg)
      return;
    }
    if (coreName.includes("weapons")) {
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

  _determineWeight() {
    return this.items.reduce(
      (a, b) => a + ((b.system?.quantity || 1) * b.system?.weight || 0), 0
    );
  }
  
  async determineOverload() {
    const weight = this._determineWeight() - this.system.statusEffects.overloadThreshold.status;
    let str = this.system.attributes.str.value;

    // Correct for the current overload level
    let currentOverload = this._getEffect("Overload");
    str += currentOverload?.system?.effects?.reduce(
      (a,b) => a - b.value, -1
    ) || 0 // -1 for the phyiscal proficiencies
    if (str <= 0) return false; // We can't possibly do sensible things yet
    
    const overloadLevel = Math.max(Math.ceil((weight - str) / (str / 2)), 0) +
      this.system.statusEffects.overload.status;
    if (overloadLevel <= 0) this._deleteEffect("Overload");
    else {
      if (!currentOverload) currentOverload = await this._getEffectOrCreate("Overload")
      await currentOverload.update({"system.effects": [
        {group: "proficiencies", name: "physical", value: -1},
        {group: "attributes", name: "physical", value: -overloadLevel + 1},
      ], "system.statusEffect": true, "system.gm_description": `${overloadLevel}`})
    }
    return true
  };

  async updateStrain() {
    let zone = this.getHRZone();
    if (zone == 1) {
      this._deleteEffect("Strain");
      return;
    }

    let currentStrain = await this._getEffectOrCreate("Strain")
    if (zone == 2) {
      await currentStrain.update({"system.effects": [
        {group: "weapons", name: "all", value: -1},
        {group: "attributes", name: "crd", value: -1},
        {group: "attributes", name: "spd", value: 1}
      ], "system.statusEffect": true, "system.gm_description": zone - 1})
    } else {
      await currentStrain.update({"system.effects": [
        {group: "weapons", name: "all", value: -3},
        {group: "attributes", name: "crd", value: -2},
        {group: "attributes", name: "social", value: -1},
        {group: "attributes", name: "mental", value: -1}
      ], "system.statusEffect": true, "system.gm_description": zone - 1})
    }
  }

  async updatePain() {
    const res = 5 + this.system.attributes.res.value;
    const damageTotal = this.system.health.max.value - this.system.health.value -
      this.system.statusEffects.painThreshold.status;
    const levelPain = Math.floor(damageTotal / res) + this.system.statusEffects.pain.status;
    if (levelPain <= 0) { await this._deleteEffect("Pain") }
    else {
      const currentPain = await this._getEffectOrCreate("Pain");
      await currentPain.update({"system.effects": [
        {group: "proficiencies", name: "all", value: -levelPain},
        {group: "weapons", name: "all", value: -levelPain}
        ], "system.statusEffect": true, "system.gm_description": `${levelPain}`
      })
    }

    // Injuries
    const damageBodyParts = {arms: 0, legs: 0, torso: 0, head: 0};
    const wounds = this.itemTypes["Wounds"];
    for (const wound of wounds) {
      if (!wound.system.active) continue;
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

    for (const [bodyPart, damage] of Object.entries(damageBodyParts)) {
      const n = Math.floor(damage / res) + this.system.statusEffects[`injuries ${bodyPart.toLowerCase()}`].status;
      if (n <= 0) { await this._deleteEffect(`Injuries ${bodyPart}`) }
      else {
        const injury = await this._getEffectOrCreate(`Injuries ${bodyPart}`);
        await injury.update({"system.effects": [
            {group: "attributes", name: THE_EDGE.injury_map[bodyPart], value: -n}
          ], "system.statusEffect": true, "system.gm_description": `${n}`,
        })
      }
    }
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

  async updateStatus() {
    // Reset to a blank state
    let update = {}
    for (const group of ["attributes", "proficiencies", "weapons"]) {
      for (const elem of THE_EDGE.effect_map[group].all) {
        update[elem] = 0;
      }
    }
    for (const elems of Object.values(THE_EDGE.effect_map.statusEffects)) {
      for (const elem of Object.values(elems)) update[elem] = 0;
    }
    for (const elems of Object.values(THE_EDGE.effect_map.others)) {
      for (const elem of Object.values(elems)) update[elem] = 0;
    }
    const critDice = {
      attributes: {crit: [1], critFail: [20]},
      proficiencies: {crit: [1], critFail: [20]},
      weapons: {crit: [1], critFail: [20]}
    }

    // Iterate through items and apply their effects
    for (const item of this.items) {
      if (!item.system.active && !item.system.equipped) continue;

      if (item.type == "Skill" || item.type == "Combatskill" || item.type == "Medicalskill") {
        for (let i = 0; i < item.system.level; ++i) {
          for (const effect of item.system.levelEffects[i]) {
            if (this._updateCritDice(effect, critDice)) continue;
            for (const effectPath of THE_EDGE.effect_map[effect.group][effect.name]) {
              update[effectPath] += effect.value;
            }
          }
          if (!item.system.levelEffects[i]) continue;
        }
      } else if (item.system.effects) {
        for (const effect of item.system.effects) {
          if (this._updateCritDice(effect, critDice)) continue;
          for (const effectPath of THE_EDGE.effect_map[effect.group][effect.name]) {
            update[effectPath] += effect.value;
          }
        }
      }
    }
    
    for (const [group, dice] of Object.entries(critDice)) {
      this.diceServer.interpretationParams[group].crit = dice.crit;
      this.diceServer.interpretationParams[group].critFail = dice.critFail;
    }
    await this.update(update);
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
        const target = THE_EDGE.core_value_map[group][requirement.name] + ".advances";
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

  _attrCost(n) { return 10 * Math.floor(12 + 8 * Math.pow(1.2, n)); }
  _profCost(n) { return  5 * Math.floor(10 + 4 * Math.pow(1.2, n)); }

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

  deleteWound(wound) {
    this.update({"system.health.value": this.system.health.value + wound.system.damage});
    wound.delete();
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

  getWeaponLevel(weaponType) {
    const type = THE_EDGE.weapon_damage_types[weaponType];
    if (type == "general") {
      return this.system.weapons["general"]["Hand-to-Hand combat"].value;
    }
    let level = Math.floor((
      this.system.weapons[type][weaponType].value +
      this.system.weapons.general["General weapon proficiency"].value
    ) / 2);
    const partner = THE_EDGE.weapon_partners[weaponType];
    if (partner) {
      const partnerType = THE_EDGE.weapon_damage_types[partner];
      level += Math.floor(this.system.weapons[partnerType][partner].value / 4);
    }
    return level;
  }

  _getWeaponPL(weaponID) {
    const weapon = this.items.get(weaponID).system;

    const level = this.getWeaponLevel(weapon.type);

    let attr_mod = Math.floor( (
      this.system.attributes[weapon.leadAttr1.name].value - weapon.leadAttr1.value +
      this.system.attributes[weapon.leadAttr2.name].value - weapon.leadAttr2.value
    ) / 4)

    return Math.max(level + attr_mod, 0)
  }

  _getCombaticsPL() {
    const sys = this.system;
    const attr_mod = Math.floor((sys.attributes.str.value + sys.attributes.crd.value) / 4);
    const level = sys.weapons.general["Hand-to-Hand combat"].advances +
      sys.weapons.general["Hand-to-Hand combat"].status;

    return Math.max(level + attr_mod, 0);
  }

  _getCombaticsDamage() {
    const str = this.system.attributes.str.value;
    const crd = this.system.attributes.crd.value;
    return `1d${str+crd}+${str}`;
  }
  
  async applyDamage(damage, crit, damageType, name, givenLocation = undefined) {
    const [location, locationCoord] = Aux.generateWoundLocation(crit, this.system.sex, givenLocation)

    const protectionLog = {};
    for (const armour of this.itemTypes["Armour"]) {
      if(!armour.system.equipped || armour.system.layer == "Outer") continue;
      damage = await ArmourItemTheEdge.protect.call(armour, damage, damageType, location, protectionLog)
    }

    if (damage > 0) {
      const health = this.system.health.value;
      const heartRate = this.system.heartRate;
      const update = {};
      update["system.health.value"] = Math.max(health - damage, 0)
      const hrChange = Math.max(damage - this.system.heartRate.damageThreshold.status, 0);
      if (health > damage) { // increase heartrate upon damage
        update["system.heartRate.value"] = Math.min(heartRate.value + hrChange, heartRate.max.value)
      } else if (health > 0) { // Dying damage
        update["system.heartRate.value"] = Math.max(heartRate.max.value - (hrChange - health), 0)
      } else { // bleeding out
        update["system.heartRate.value"] = Math.max(heartRate.value - hrChange, 0)
      }
      await this.update(update)

      const bt = THE_EDGE.bleeding_threshold[damageType];
      const bleeding = Math.floor(damage / bt) + ((damage % bt) / bt < Math.random());

      this.generateNewWound(name, location, locationCoord, damage, bleeding, damageType);
    }

    if(this.sheet.rendered) this.sheet._render();
    return protectionLog;
  }

  async applyFallDamage(height, location) {
    const damageRoll = `${height}d12 + ${4*height-22}`;
    const damage = Math.max((await DiceServer.genericRoll(damageRoll)), 0);
    const n = Math.floor(height / 2);
    await this._applyImpactOrFallDamage(n, damage, "fall", `${height}m`, location)
    ChatServer.transmitEvent("fall", {actor: this.name, height: height, damage: damage, damageRoll: damageRoll});
  }

  async applyImpactDamage(speed, location) {
    const damageRoll = `${speed}d${speed}+${speed-30}`;
    const damage = Math.max((await DiceServer.genericRoll(damageRoll)), 0);
    const n = Math.floor(speed / 3);
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
    await wound.update({
      "system.bodyPart": location, "system.coordinates": locationCoord,
      "system.damage": damage, "system.bleeding": bleeding, "system.type": type
    });
  }

  _generateWoundType(damage, damageType) {
    let odds = undefined;
    switch (damageType) {
      case "energy":
        odds = {"abrasion": 10, "light burn": damage, "strong burn": Math.max(0, Math.ceil(damage*(damage - 10)/10))};
        break;
      case "kinetic":
        odds = {"abrasion": 10, "laceration": damage, "fracture":    Math.max(0, Math.ceil(damage*(damage - 10)/10))};
        break;
      case "elemental":
        odds = {"light burn": damage, "strong burn": Math.max(0, damage*(damage - 10)/10)};
        break;
      case "fall": case "impact":
        odds = {"abrasion": 20, "laceration": Math.ceil(damage/2), "fracture": Math.max(0, Math.ceil(damage*(damage - 10)/10))};
        break;
      case "HandToHand":
        odds = {"abrasion": 20, "fracture": Math.max(0, Math.ceil(damage*(damage - 10)/10))};
    }
    return Aux.pickFromOdds(odds);
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
    shell.update({"system.equipped": true, "system.attachments": [{actorId: this.id, tokenId, armourId: armour._id}]});
    const attachments = armour.system.attachments;
    attachments.push({actorId: this.id, tokenId, shellId: shell._id, shell: shell});
    armour.update({
      "system.attachments": attachments,
      "system.attachmentPoints.used": armour.system.attachmentPoints.used + shell.system.attachmentPoints.max
    });
  }

  async applyBloodLoss() {
    const wounds = this.itemTypes["Wounds"];
    const bleeding = wounds.map(x => x.system.bleeding).sum();
    const sys = this.system;
    const lossRate = sys.heartRate.value / sys.heartRate.max.value;
    const bloodLoss = Math.floor(lossRate * bleeding);
    this.update({"system.bloodLoss.value": sys.bloodLoss.value + bloodLoss});
  }

  async applyCombatStrain(strains, communication) {
    let zone = this.getHRZone();
    let maxStrain = Math.max(...strains);
    let isRest = maxStrain < zone;
    let hrChange = 0;
    if (isRest) {
      hrChange = 2 * strains.map(x => x - zone).sum();
    } else {
      hrChange = 4 * strains.map(x => Math.max(x - zone + 1, 0)).sum();
    }

    hrChange += 4 * communication * !isRest;
    
    let hr = this.system.heartRate;
    let threshold = [hr.min.value, this.hrZone1(), this.hrZone2(), hr.max.value][maxStrain];
    let clamper = isRest ? Math.max : Math.min;
    await this.update({"system.heartRate.value": clamper(hr.value + hrChange, threshold)});
    
    let newZone = this.getHRZone();
    if (newZone != zone) {this.updateStrain()}
    
    ChatServer.transmitEvent("strainUpdate",
      {strains: strains, communication: communication, hrChange: hrChange})
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

  getHRZone() {
    let hr = this.system.heartRate.value;
    if (hr < this.hrZone1()) return 1;
    if (hr < this.hrZone2()) return 2;
    return 3;
  }

  hrZone1() {return 5 * Math.floor(this.system.heartRate.max.value * 75 / 500)}
  hrZone2() {return 5 * Math.floor(this.system.heartRate.max.value * 90 / 500)}

  shortRest() {this._rest("1d3 % 2", "1d3-1", "0", "short rest")}
  longRest() {this._rest("2d3kh", "2d6 / 2", "1d3-1", "long rest")}

  async _rest(coagulationDice, healingDice, bloodRegenDice, type) {
    const wounds = this.itemTypes["Wounds"];
    let accHealing = 0;
    let accCoagulation = 0;
    let remainingBleeding = 0;
    for (const wound of wounds) {
      if (wound.system.bleeding > 0) {
        const coagulationRoll = await new Roll(coagulationDice).evaluate()
        const coagulation = Math.floor(coagulationRoll.total);
        if (wound.system.damage == 0 && wound.system.bleeding <= coagulation) {
          accCoagulation += wound.system.bleeding;
          wound.delete();
        } else if (coagulation > 0) {
          accCoagulation += Math.min(coagulation, wound.system.bleeding);
          const newBleeding = Math.max(wound.system.bleeding - coagulation, 0);
          wound.update({"system.bleeding": newBleeding});
          remainingBleeding += newBleeding;
        }
      } else {
        const healingRoll = await new Roll(healingDice).evaluate();
        const healing = Math.floor(healingRoll.total);
        if (wound.system.damage <= healing) { // shortcut: wound healed afterwards
          accHealing += wound.system.damage;
          wound.delete();
        } else if (healing > 0) {
          accHealing += Math.min(healing, wound.system.damage)
          wound.update({"system.damage": Math.max(wound.system.damage - healing, 0)});
        }
      }
    }

    const bloodRegenRoll = await new Roll(bloodRegenDice).evaluate();
    const bloodRegen = Math.min(this.system.bloodLoss.value, bloodRegenRoll.total - remainingBleeding);
    this.update({
      "system.health.value": Math.min(this.system.health.max.value, this.system.health.value + accHealing),
      "system.heartRate.value": this.system.heartRate.min.value - accHealing,
      "system.bloodLoss.value": this.system.bloodLoss.value - bloodRegen
    });
    ChatServer.transmitEvent(
      type, {healing: accHealing, coagulation: accCoagulation, bloodRegen: bloodRegen}
    )
  }
}
