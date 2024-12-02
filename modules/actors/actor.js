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

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.attributes = this.system.attributes || {};

    for (let ch of Object.values(this.system.attributes)) {
      ch.value = Math.max(ch.status + ch.advances + ch.modifier, 0);
    }
    this.system.heartRate["max"] = this.system.heartRate.baseline_max + 
      this.system.attributes["end"].value -
      2 * Math.floor((this.system.age - 21) / 3)
    this.system.heartRate["min"] = this.system.heartRate.baseline_min -
      this.system.attributes["end"].value

    this.system.wounds = {}
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
    let preparedData = { system: { attr: {}, prof: {}, weapons: {}, generalCombatAdvances: {}} };
    for (const key of Object.keys(this.system.attributes)) {
      let n = this.system.attributes[key].advances;
      preparedData.system.attr[key] = {
        cost: this._attrCost(n),
        refund: n == 0 ? 0 : this._attrCost(n-1)
      }
    }
    for (const [category, proficiencies] of Object.entries(this.system.proficiencies)) {
      for (const proficiency of Object.keys(proficiencies)) {
        let n = this.system.proficiencies[category][proficiency].advances
        preparedData.system.prof[proficiency] = {
          cost: this._profCost(n),
          refund: n == 0 ? 0 : this._profCost(n-1)
        }
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
    for (const proficiencyClass of ["physical", "environmental", "mental"]) {
      preparedData.proficienciesLeft[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }
    for (const proficiencyClass of ["technical", "social", "knowledge"]) {
      preparedData.proficienciesRight[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }

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

  async rollProficiencyCheck(proficiency, tempModifier = 0, advantage = false, transmit = true) {
    let proficiencyData = Object.values(this.system.proficiencies)
      .find(profClass => proficiency in profClass)[proficiency]

    let check = {
      name: proficiency,
      dices: proficiencyData.dices,
      thresholds: proficiencyData.dices.map(dice => this.system.attributes[dice]["value"])
    }

    let modificator = proficiencyData["advances"] + proficiencyData["modifier"] + proficiencyData["status"];
    let modificators = {modificator: modificator + tempModifier, advantage: advantage}
    let results = await DiceServer.proficiencyCheck(check, modificators);

    if (transmit) {
      let chatDetails = {
        proficiency: proficiency, dices: check.dices, thresholds: check.thresholds,
        character_mod: modificator, temporary_mod: tempModifier, advantage: advantage
      };
      foundry.utils.mergeObject(chatDetails, results)
      ChatServer.transmitEvent("ProficiencyCheck", chatDetails);
    }
    return results;
  }

  _determineWeight() {
    return this.items.reduce(
      (a, b) => a + ((b.system?.quantity || 1) * b.system?.weight || 0), 0
    );
  }
  
  async _determineEncumbrance() {
      let weight = this._determineWeight();
      // let str = this.system.attributes.Str.value;
      let str = this.system.attributes.str.modifier +
        this.system.attributes.str.advances + this.system.attributes.str.status;

      // Correct for the current encumbrance level
      let effects = this.itemTypes["Effect"]
      let currentEncumbrance = effects?.find(
        obj => obj.name == LocalisationServer.localise("Encumbrance"))
      str += -1 + currentEncumbrance?.system.effects?.reduce(
        (a,b) => a - b.value, 0
      ) || 0 // -1 for the phyiscal proficiencies
      if (str <= 0) return false; // We can't possibly do sensible things yet
      else if (weight <= str) {
        if (currentEncumbrance) await currentEncumbrance.delete();
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
    let update = {}
    let map = THE_EDGE.effect_map

    // Reset to a blank state
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

    for (const item of this.items) {
      if (!["Effect", "Skill", "Combatskill"].includes(item.type) && (!item.system.equipped || !item.system.hasEffect)) continue;

      let effects = [];
      if (["Skill", "Combatskill"].includes(item.type)) {
        for (let i = 0; i < item.system.level; ++i) {
          if (!item.system.levelEffects[i]) continue;
          effects.push(...item.system.levelEffects[i])
        }
      } else effects = item.system.effects;
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
        // Skill already exists and can be leveled
        this.skillLevelIncrease(skill.id)
        return false;
      }
    }

    // Languages doesn't exist yet
    const ph = this.system.PracticeHours
    const spoken = newSkill.system.humanSpoken
    let cost = Aux.getSkillCost(newSkill)
    if (cost < ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      return true;
    }
    
    return false
  }

  _attrCost(n) { return 10 * Math.floor(14 + 6 * Math.pow(1.2, n)); }
  _profCost(n) { return  5 * Math.floor( 5 + 5 * Math.pow(1.1, n)); }

  skillLevelIncrease(skillID) {
    let skill = this.items.get(skillID)
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
  
  async applyDamage(damage, crit, damageType, name) {
    let [location, locationCoord] = this._generateLocation(crit)

    for (const armour of this.itemTypes["Armour"]) {
      if(!armour.system.equipped) continue;
      // TODO: Inner vs outer armour.
      let protectedLoc = armour.system.bodyPart;
      if (protectedLoc === "Entire" || (location === protectedLoc) || (location !== "Head" && protectedLoc === "Below_Neck")) {
        damage = await ArmourItemTheEdge.protect.call(armour, damage, damageType)
      }
    }

    if (damage > 0) {
      let update = {}
      update["system.health.value"] = this.system.health.value - damage
      await this.update(update)

      let bt = THE_EDGE.bleeding_threshold[damageType]
      let bleeding = Math.floor(damage / bt) + ((damage % bt) / bt < Math.random())

      const cls = getDocumentClass("Item");
      let wound = await cls.create({name: name, type: "Wounds"}, {parent: this});
      wound.update({
        "system.bodyPart": location, "system.coordinates": locationCoord,
        "system.damage": damage, "system.bleeding": bleeding
      });
    }

    if(this.sheet.rendered) this.sheet._render();
  }

  _generateLocation(crit) {
    let locationDescription = "";
    if (crit) locationDescription = "Head";
    else {
      let rand = Math.random();
      if (rand < 0.15) locationDescription = "Legs" + ["Left", "Right"].random(); // 15%
      else if (rand < 0.30) locationDescription = "Arms" + ["Left", "Right"].random(); // 30%
      else locationDescription = "Torso"; // 65%, as p(crit) == 5%
    }
    let cordDescription = THE_EDGE.wounds_pixel_coords[this.system.sex][locationDescription]
    let [x0, y0] = cordDescription.coords[0];
    let [x1, y1] = cordDescription.coords[1];
    let r = cordDescription.radius * Math.random();
    let [t, phi] = [Math.random(), 2 * Math.PI * Math.random()];
    let x = (1-t)*x0 + t*x1 + r * Math.cos(phi);
    let y = (1-t)*y0 + t*y1 + r * Math.sin(phi);
    return [locationDescription, [x,y]];
  }

  async applyCombatStrain(strains) {
    let zone = this.getHRZone();
    let maxStrain = Math.max(...strains);
    let isRest = maxStrain < zone;
    let hrChange = 0;
    if (isRest) {
      hrChange = 2 * strains.map(x => x - zone).reduce((a, b) => a+b, 0)
    } else {
      hrChange = 4 * strains.map(x => Math.max(x - zone + 1, 0)).reduce((a,b) => a+b, 0)
    }
    let hr = this.system.heartRate;
    let threshold = [hr.min, this.hrZone1(), this.hrZone2(), hr.max][maxStrain]
    let clamper = isRest ? Math.max : Math.min;
    await this.update({"system.heartRate.value": clamper(hr.value + hrChange, threshold)});
    
    let newZone = this.getHRZone();
    if (newZone != zone) {this._updateStrain()}
  }

  async _updateStrain() {
    let effects = this.itemTypes["Effect"]
    let currentStrain = effects?.find(
      obj => obj.name == LocalisationServer.localise("Strain"))
    let zone = this.getHRZone();
    if (zone == 1) {
      currentStrain?.delete()
      return;
    }

    if (!currentStrain) {
      const cls = getDocumentClass("Item");
      currentStrain = await cls.create(
        {name: LocalisationServer.localise("Strain"), type: "Effect"}, {parent: this}
      );
    }

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
