import { EntitySheetHelper } from "./helper.js";
import { ArmourItemTheEdge } from "./items/item.js";

/**
 * Extend the base Actor document to support attributes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class SimpleActor extends Actor {

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.attributes = this.system.attributes || {};

    for (let ch of Object.values(this.system.attributes)) {
      ch.value = ch.initial + ch.advances + ch.species + ch.modifier + (ch.gearmodifier || 0);
    }
    this.system.heartRate["max"] = this.system.heartRate.baseline_max + 
      this.system.attributes["End"].value -
      2 * Math.floor((this.system.age - 21) / 3)

    this.system.wounds = {}
  }

  /* -------------------------------------------- */

  /** @override */
  static async createDialog(data={}, options={}) {
    return EntitySheetHelper.createDialog.call(this, data, options);
  }

  /* -------------------------------------------- */

  /**
   * Is this Actor used as a template for other Actors?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("the_edge", "isTemplate");
  }

  /* -------------------------------------------- */
  /*  Roll Data Preparation                       */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getRollData() {

    // Copy the actor's system data
    const data = this.toObject(false).system;
    const shorthand = game.settings.get("the_edge", "macroShorthand");
    const formulaAttributes = [];
    const itemAttributes = [];

    // Handle formula attributes when the short syntax is disabled.
    this._applyShorthand(data, formulaAttributes, shorthand);

    // Map all item data using their slugified names
    this._applyItems(data, itemAttributes, shorthand);

    // Evaluate formula replacements on items.
    this._applyItemsFormulaReplacements(data, itemAttributes, shorthand);

    // Evaluate formula attributes after all other attributes have been handled, including items.
    this._applyFormulaReplacements(data, formulaAttributes, shorthand);

    // Remove the attributes if necessary.
    if ( !!shorthand ) {
      delete data.attr;
      delete data.groups;
    }
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Apply shorthand syntax to actor roll data.
   * @param {Object} data The actor's data object.
   * @param {Array} formulaAttributes Array of attributes that are derived formulas.
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyShorthand(data, formulaAttributes, shorthand) {
    // Handle formula attributes when the short syntax is disabled.
    for ( let [k, v] of Object.entries(data.attributes || {}) ) {
      // Make an array of formula attributes for later reference.
      if ( v.dtype === "Formula" ) formulaAttributes.push(k);
      // Add shortened version of the attributes.
      if ( !!shorthand ) {
        if ( !(k in data) ) {
          // Non-grouped attributes.
          if ( v.dtype ) {
            data[k] = v.value;
          }
          // Grouped attributes.
          else {
            data[k] = {};
            for ( let [gk, gv] of Object.entries(v) ) {
              data[k][gk] = gv.value;
              if ( gv.dtype === "Formula" ) formulaAttributes.push(`${k}.${gk}`);
            }
          }
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Add items to the actor roll data object. Handles regular and shorthand
   * syntax, and calculates derived formula attributes on the items.
   * @param {Object} data The actor's data object.
   * @param {string[]} itemAttributes
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyItems(data, itemAttributes, shorthand) {
    // Map all items data using their slugified names
    data.items = this.items.reduce((obj, item) => {
      const key = item.name.slugify({strict: true});
      const itemData = item.toObject(false).system;

      // Add items to shorthand and note which ones are formula attributes.
      for ( let [k, v] of Object.entries(itemData.attributes) ) {
        // When building the attribute list, prepend the item name for later use.
        if ( v.dtype === "Formula" ) itemAttributes.push(`${key}..${k}`);
        // Add shortened version of the attributes.
        if ( !!shorthand ) {
          if ( !(k in itemData) ) {
            // Non-grouped item attributes.
            if ( v.dtype ) {
              itemData[k] = v.value;
            }
            // Grouped item attributes.
            else {
              if ( !itemData[k] ) itemData[k] = {};
              for ( let [gk, gv] of Object.entries(v) ) {
                itemData[k][gk] = gv.value;
                if ( gv.dtype === "Formula" ) itemAttributes.push(`${key}..${k}.${gk}`);
              }
            }
          }
        }
        // Handle non-shorthand version of grouped attributes.
        else {
          if ( !v.dtype ) {
            if ( !itemData[k] ) itemData[k] = {};
            for ( let [gk, gv] of Object.entries(v) ) {
              itemData[k][gk] = gv.value;
              if ( gv.dtype === "Formula" ) itemAttributes.push(`${key}..${k}.${gk}`);
            }
          }
        }
      }

      // Delete the original attributes key if using the shorthand syntax.
      if ( !!shorthand ) {
        delete itemData.attributes;
      }
      obj[key] = itemData;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  _applyItemsFormulaReplacements(data, itemAttributes, shorthand) {
    for ( let k of itemAttributes ) {
      // Get the item name and separate the key.
      let item = null;
      let itemKey = k.split('..');
      item = itemKey[0];
      k = itemKey[1];

      // Handle group keys.
      let gk = null;
      if ( k.includes('.') ) {
        let attrKey = k.split('.');
        k = attrKey[0];
        gk = attrKey[1];
      }

      let formula = '';
      if ( !!shorthand ) {
        // Handle grouped attributes first.
        if ( data.items[item][k][gk] ) {
          formula = data.items[item][k][gk].replace('@item.', `@items.${item}.`);
          data.items[item][k][gk] = Roll.replaceFormulaData(formula, data);
        }
        // Handle non-grouped attributes.
        else if ( data.items[item][k] ) {
          formula = data.items[item][k].replace('@item.', `@items.${item}.`);
          data.items[item][k] = Roll.replaceFormulaData(formula, data);
        }
      }
      else {
        // Handle grouped attributes first.
        if ( data.items[item]['attributes'][k][gk] ) {
          formula = data.items[item]['attributes'][k][gk]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k][gk]['value'] = Roll.replaceFormulaData(formula, data);
        }
        // Handle non-grouped attributes.
        else if ( data.items[item]['attributes'][k]['value'] ) {
          formula = data.items[item]['attributes'][k]['value'].replace('@item.', `@items.${item}.attributes.`);
          data.items[item]['attributes'][k]['value'] = Roll.replaceFormulaData(formula, data);
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply replacements for derived formula attributes.
   * @param {Object} data The actor's data object.
   * @param {Array} formulaAttributes Array of attributes that are derived formulas.
   * @param {Boolean} shorthand Whether or not the shorthand syntax is used.
   */
  _applyFormulaReplacements(data, formulaAttributes, shorthand) {
    // Evaluate formula attributes after all other attributes have been handled, including items.
    for ( let k of formulaAttributes ) {
      // Grouped attributes are included as `group.attr`, so we need to split them into new keys.
      let attr = null;
      if ( k.includes('.') ) {
        let attrKey = k.split('.');
        k = attrKey[0];
        attr = attrKey[1];
      }
      // Non-grouped attributes.
      if ( data.attributes[k]?.value ) {
        data.attributes[k].value = Roll.replaceFormulaData(String(data.attributes[k].value), data);
      }
      // Grouped attributes.
      else if ( attr ) {
        data.attributes[k][attr].value = Roll.replaceFormulaData(String(data.attributes[k][attr].value), data);
      }

      // Duplicate values to shorthand.
      if ( !!shorthand ) {
        // Non-grouped attributes.
        if ( data.attributes[k]?.value ) {
          data[k] = data.attributes[k].value;
        }
        // Grouped attributes.
        else {
          if ( attr ) {
            // Initialize a group key in case it doesn't exist.
            if ( !data[k] ) {
              data[k] = {};
            }
            data[k][attr] = data.attributes[k][attr].value;
          }
        }
      }
    }
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

    mergeObject(preparedData, {proficienciesLeft: {}, proficienciesRight: {}})
    for (const proficiencyClass of ["Physical", "Environmental", "Mental"]) {
      preparedData.proficienciesLeft[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }
    for (const proficiencyClass of ["Technical", "Social", "Knowledge"]) {
      preparedData.proficienciesRight[proficiencyClass] = Object.keys(this.system.proficiencies[proficiencyClass]);
    }

    let sys = this.system;
    let ch = sys.attributes;
    mergeObject(preparedData, {
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
          tooltip: "Min(7+ Spd/3, Foc)".replace(/[ ]/g, "\u00a0")
         },
        Sprint: { 
          value: Math.min(8 + Math.floor(ch["Spd"].value / 1.5), Math.floor(ch["Foc"].value * 1.5)),
          tooltip: "Min(9+ Spd/1.5, 150% Foc)".replace(/[ ]/g, "\u00a0")
         }
      },
      herotoken: Array(sys.heroToken.max).fill(false).fill(true, 0, sys.heroToken.available)
    });

    return preparedData
  }

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
        // TODO: Inner vs outer armour. Check equipped
        let protectedLoc = armour.system.bodyPart;
        if (protectedLoc === "Entire" || (location === protectedLoc) || (location !== "Head" && protectedLoc === "Below_Neck")) {
          let [remDamage, destroyed] = await ArmourItemTheEdge.protect.call(armour, damage, damageType)
          console.log("Hit to:", location, "Absorbed", damage - remDamage, "Remaining", remDamage)
          damage = remDamage
          if (destroyed) {
            armour.system.equipped = false
            // TODO: notify
          }
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
