import { ArmourItemTheEdge } from "../items/item.js";
import THE_EDGE from "../system/config-the-edge.js";
import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";

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
        1: {
          value: 5 * Math.floor(sys.heartRate.max * 75 / 500),
          tooltip: "75% Max Heart Rate".replace(/[ ]/g, "\u00a0")
        },
        2: {
          value: 5 * Math.floor(sys.heartRate.max * 90 / 500),
          tooltip: "90% Max Heart Rate".replace(/[ ]/g, "\u00a0")
        }
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
      let currentEncumbrance = effects?.find(obj => obj.name == "Encumbrance")
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
  
  async applyDamage(damage, crit, damageType) {
    let [location, locationDetail] = this._generateLocation(crit)

    console.log(this, this.itemTypes)
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

      const cls = getDocumentClass("Item");
      let wound = await cls.create(
        {name: LocalisationServer.localise("Wound"), type: "Wounds"}, {parent: this}
      );
      wound.update({"system.bodyPart": [location, locationDetail]});
    }

    if(this.sheet.rendered) this.sheet._render();
  }

  _generateLocation(crit) {
    if (crit) return ["Head", ""];
    let rand = Math.random();
    if (rand < 0.02) { // 20% legs
      return ["Legs", ["Left", "Right"].random()]
    } if (rand < 0.04) { // 20% arms
      return ["Arms", ["Left", "Right"].random()]
    }
    return ["Torso", ""]
  }

  _attrCost(n) { return 10 * Math.floor(14 + 6 * Math.pow(1.2, n)); }
  _profCost(n) { return  5 * Math.floor( 5 + 5 * Math.pow(1.1, n)); }
}
