import { ArmourItemTheEdge } from "../items/item.js";

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
      ch.value = ch.status + ch.advances + ch.modifier;
    }
    this.system.heartRate["max"] = this.system.heartRate.baseline_max + 
      this.system.attributes["End"].value -
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
    let preparedData = { system: { attr: {}, prof: {}, weapons: {} } };
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
        let n = this.system.weapons[category][weapon]
        preparedData.system.weapons[weapon] = {
          cost: this._attrCost(n),
          refund: n == 0 ? 0 : this._attrCost(n-1)
        }
      }
    }

    foundry.utils.mergeObject(preparedData, {proficienciesLeft: {}, proficienciesRight: {}})
    for (const proficiencyClass of ["Physical", "Environmental", "Mental"]) {
      preparedData.proficienciesLeft[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }
    for (const proficiencyClass of ["Technical", "Social", "Knowledge"]) {
      preparedData.proficienciesRight[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }

    let sys = this.system;
    let ch = sys.attributes;
    foundry.utils.mergeObject(preparedData, {
      attrs: ["End","Str","Spd","Crd","Cha","Emp","Foc","Res","Int"],
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
          value: Math.min(5 + Math.floor(ch["Spd"].value / 6  ), Math.floor(ch["Foc"].value * 0.665)),
          tooltip: "Min(5 + Spd/6, 66% Foc)".replace(/[ ]/g, "\u00a0")
         },
        Run: { 
          value: Math.min(7 + Math.floor(ch["Spd"].value / 3  ),            ch["Foc"].value),
          tooltip: "Min(7 + Spd/3, Foc)".replace(/[ ]/g, "\u00a0")
         },
        Sprint: { 
          value: Math.min(8 + Math.floor(ch["Spd"].value / 1.5), Math.floor(ch["Foc"].value * 1.5)),
          tooltip: "Min(9 + Spd/1.5, 150% Foc)".replace(/[ ]/g, "\u00a0")
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
      let str = this.system.attributes.Str.value;

      // Correct for the current encumbrance level
      let effects = this.itemTypes["effect"]
      let currentEncumbrance = effects?.find(obj => obj.name == "Encumbrance")
      str += currentEncumbrance?.modifiers?.reduce((a,b) => a + b.value, 0) || 0
      
      let encumbranceLevel = str == 0 ? 100 : Math.ceil((weight - str) / (str/2))
      let physicalMalus = Math.ceil(encumbranceLevel / 2)
      let allMalus = Math.floor(encumbranceLevel / 2)
      console.log(weight, encumbranceLevel, physicalMalus, allMalus, currentEncumbrance)

      if (encumbranceLevel == 0 && currentEncumbrance) {
        await currentEncumbrance.delete()
      } else if (encumbranceLevel > 0) {
        if (currentEncumbrance) {
          currentEncumbrance.update({"system.modifiers": [
            {modifier: "Attr.Physical", value: physicalMalus},
            {modifier: "Attr.All", value: allMalus}
          ]})
        } else {
          const cls = getDocumentClass("Item");
          encumbrance = cls.create({name: "Encumbrance", type: "effect"}, {parent: this});
        }
      }
      return true
  };

  async _advanceAttr(attrName, type) {
    const attr = this.system.attributes[attrName]
    const ph = this.system.PracticeHours

    let update = {}
    if ((type == "advance") && (ph.max - ph.used >= this._attrCost(attr.advances)) ) {
      update[`system.attributes.${attrName}.advances`] = attr.advances + 1
      update[`system.attributes.${attrName}.value`] = attr.value + 1
      update[`system.PracticeHours.used`] = ph.used + this._attrCost(attr.advances)
    }
    else if ((type == "refund") && (attr.advances > 0) ) {
      update[`system.attributes.${attrName}.advances`] = attr.advances - 1
      update[`system.attributes.${attrName}.value`] = attr.value - 1
      update[`system.PracticeHours.used`] = ph.used - this._attrCost(attr.advances - 1)
    }
    this.update(update)
  }

  async _advanceProf(profName, type) {
    let profValues = undefined;
    let cat = undefined;
    for (const [category, proficiencies] of Object.entries(this.system.proficiencies)) {
      if (profName in proficiencies) {
        cat = category
        profValues = proficiencies[profName]
      }
    }
    const ph = this.system.PracticeHours

    let update = {}
    if ((type == "advance") && (ph.max - ph.used >= this._profCost(profValues.advances)) ) {
      update[`system.proficiencies.${cat}.${profName}.advances`] = profValues.advances + 1
      update[`system.PracticeHours.used`] = ph.used + this._profCost(profValues.advances)
    }
    else if ((type == "refund") && (profValues.advances > 0) ) {
      update[`system.proficiencies.${cat}.${profName}.advances`] = profValues.advances - 1
      update[`system.PracticeHours.used`] = ph.used - this._profCost(profValues.advances - 1)
    }
    this.update(update)
  }

  async _advanceWeaponProf(profName, type) {
    let profValue = undefined;
    let cat = undefined;
    for (const [category, weapons] of Object.entries(this.system.weapons)) {
      if (profName in weapons) {
        cat = category
        profValue = weapons[profName]
      }
    }
    const ph = this.system.PracticeHours

    let update = {}
    if ((type == "advance") && (ph.max - ph.used >= this._attrCost(profValue)) ) {
      update[`system.weapons.${cat}.${profName}`] = profValue + 1
      update[`system.PracticeHours.used`] = ph.used + this._attrCost(profValue)
    }
    else if ((type == "refund") && (profValue > 0) ) {
      update[`system.weapons.${cat}.${profName}`] = profValue - 1
      update[`system.PracticeHours.used`] = ph.used - this._attrCost(profValue - 1)
    }
    this.update(update)
  }

  _language_cost_table(humanSpoken) {
    return humanSpoken ? [200, 400, 1000, 2000, 3200, 3200] : [600, 3000, 6400]
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
    let cost = this._language_cost_table(spoken)[0]
    if (cost < ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      return true;
    }
    
    return false
  }

  skillLevelIncrease(skillID) {
    let skill = this.items.get(skillID)
    let level = skill.system.level
    let cost = 0;
    if (skill.type == "languageskill") {
      if ((skill.system.humanSpoken && level == 6) || (!skill.system.humanSpoken && level == 3)) return false;
      cost = this._language_cost_table(skill.system.humanSpoken)[level];
    }
    const ph = this.system.PracticeHours
    if (cost < ph.max - ph.used) {
      this.update({"system.PracticeHours.used": ph.used + cost})
      skill.update({"system.level": level + 1})
      return true
    }
    return false
  }

  skillLevelDecrease(skillID) {
    let skill = this.items.get(skillID)
    let level = skill.system.level
    let gain = this._language_cost_table(skill.system.humanSpoken)[level-1]
    const ph = this.system.PracticeHours
    this.update({"system.PracticeHours.used": ph.used - gain})
    if (level > 1) skill.update({"system.level": level - 1});
    else skill.delete()
  }

  deleteSkill(skillID) {
    const skill = this.items.get(skillID)
    let gain = 0;
    for (let i = 0; i < skill.system.level; i++) {
      gain += this._language_cost_table(skill.system.humanSpoken)[i];
    }
    const ph = this.system.PracticeHours
    this.update({"system.PracticeHours.used": ph.used - gain})
    skill.delete()
  }

  _getWeaponPL(weaponID) {
    const weapon = this.items.get(weaponID).system

    let level = 0;
    for (const type of ["Energy", "Kinetic", "Others"]) {
        if (this.system.weapons[type][weapon.type] === undefined) continue;
        level += this.system.weapons[type][weapon.type];
    }
    let attr_mod = Math.floor( (
        this.system.attributes[weapon.leadAttr1.name].value - weapon.leadAttr1.value +
        this.system.attributes[weapon.leadAttr2.name].value - weapon.leadAttr2.value
    ) / 4)

    return Math.max(level + attr_mod, 0)
  }
  
  async applyDamage(damage, crit, damageType) {
    let [location, locationDetail] = this._generateLocation(crit)

    for (const armour of this.items) {
      if (armour.type == "armour") {
        if(!armour.system.equipped) continue;
        // TODO: Inner vs outer armour.
        let protectedLoc = armour.system.bodyPart;
        if (protectedLoc === "Entire" || (location === protectedLoc) || (location !== "Head" && protectedLoc === "Below_Neck")) {
          damage = await ArmourItemTheEdge.protect.call(armour, damage, damageType)
        }
      }
    }

    let update = {}
    update["system.health.value"] = this.system.health.value - damage
    await this.update(update)

    if(this.sheet.rendered) {
      this.sheet._render()
    }
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
