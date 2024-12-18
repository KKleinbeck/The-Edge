import THE_EDGE from "../system/config-the-edge.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class TheEdgeItemSheet extends ItemSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      scrollY: [".attributes"],
    });
  }
  
  static setupSheets() {
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("the_edge", TheEdgeItemSheet, { makeDefault: true });
    Items.registerSheet("the_edge", ItemSheetWeapon, { makeDefault: true, types: ["Weapon"] });
    Items.registerSheet("the_edge", ItemSheetArmour, { makeDefault: true, types: ["Armour"] });
    Items.registerSheet("the_edge", ItemSheetAmmunition, { makeDefault: true, types: ["Ammunition"] });
    Items.registerSheet("the_edge", ItemSheetVantage, { makeDefault: true, types: ["Advantage", "Disadvantage"] });
    Items.registerSheet("the_edge", ItemSheetSkill, { makeDefault: true, types: ["Skill", "Combatskill"] });
    Items.registerSheet("the_edge", ItemSheetLanguage, { makeDefault: true, types: ["Languageskill"] });
    Items.registerSheet("the_edge", ItemSheetGear, { makeDefault: true, types: ["Gear"] });
    Items.registerSheet("the_edge", ItemSheetConsumables, { makeDefault: true, types: ["Consumables"] });
    Items.registerSheet("the_edge", ItemSheetCredits, { makeDefault: true, types: ["Credits"] });
    Items.registerSheet("the_edge", ItemSheetWounds, { makeDefault: true, types: ["Wounds"] });
    Items.registerSheet("the_edge", ItemSheetEffect, { makeDefault: true, types: ["Effect"] });

    Items.unregisterSheet("the_edge", TheEdgeItemSheet, {
      types: [
        "Weapon", "Armour", "Ammunition", "Advantage", "Disadvantage", "Skill", "Combatskill",
        "Languageskill", "Gear", "Consumables", "Credits", "Wounds", "Effect"
      ]
    });
  }

  get template() {
    return `systems/the_edge/templates/items/item-${this.item.type}.html`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    context.systemData = context.data.system;
    context.descriptionHTML = await TextEditor.enrichHTML(context.systemData.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.systemData.userIsGM = game.user.isGM;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    return formData;
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".effect-add").click(ev => this._onAdd(ev));
    html.find(".effect-modify").on("change", ev => this._onModify(ev));
    html.find(".effect-delete").click(ev => this._onDelete(ev));
  }

  _onAdd(event) {
    let effects = this.item.system.effects;
    effects.push({modifier: "", value: 0});
    this.item.update({"system.effects": effects});
  }

  _onModify(ev) {
    const button = ev.currentTarget;
    let index = button.dataset.index;
    let effects = this.item.system.effects;
    switch (button.type) {
      case "text":
        effects[index].modifier = button.value;
        break;
      case "number":
        effects[index].value = parseInt(button.value);
        break;
    }
    this.item.update({"system.effects": effects});
  }

  _onDelete(ev) {
    const button = ev.currentTarget;
    let index = button.dataset.index;
    let effects = this.item.system.effects;
    effects.splice(index, 1);
    this.item.update({"system.effects": effects});
    this._render();
  }
}

class ItemSheetWeapon extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-weapon"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {attrs: THE_EDGE.attrs, weapon_types: THE_EDGE.effect_map.weapons.all};
    return context;
  }
}

class ItemSheetArmour extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-armour"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {bodyParts: THE_EDGE.body_parts};
    return context;
  }
}

class ItemSheetAmmunition extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-ammunition"],
      width: 390,
      height: 480,
      title: "Drop the beat",
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.designatedWeaponsHTML = await TextEditor.enrichHTML(context.systemData.designatedWeapons, {
      secrets: this.document.isOwner,
      async: true
    })
    return context;
  }
}

class ItemSheetVantage extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-vantage"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }

  get template() {
    return `systems/the_edge/templates/items/item-vantage.html`;
  }
}

class ItemSheetSkill extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-skill"],
      width: 390,
      height: 480,
      displayHint: false,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
  
  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {displayHint: this.options.displayHint};
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".effect-hint").click(ev => {
      this.options.displayHint = !this.options.displayHint;
      this._render()
    });
    html.find(".max-level").on("change", ev => this._onMaxLevelChange(ev));
    html.find(".effect-level-add").click(ev => this._onLevelAdd(ev));
    html.find(".effect-level-modify").on("change", ev => this._onLevelModify(ev));
    html.find(".effect-level-delete").click(ev => this._onLevelDelete(ev));
  }

  _onMaxLevelChange(ev) {
    const button = ev.currentTarget;
    let maxLevel = button.value;
    let le = this.item.system.levelEffects;
    if (le.length >= maxLevel) {
      this.item.update({"system.maxLevel": maxLevel, "system.levelEffects": le.slice(0, maxLevel)})
    } else {
      for (let i = le.length; i < maxLevel ; ++i) {
        le.push([])
      }
      this.item.update({"system.maxLevel": maxLevel, "system.levelEffects": le});
    }
  }

  _onLevelAdd(ev) {
    const level = ev.currentTarget.closest(".effect-level").dataset.index;
    let le = this.item.system.levelEffects;
    le[level].push({modifier: "", value: 0});
    this.item.update({"system.levelEffects": le});
  }

  _onLevelModify(ev) {
    const button = ev.currentTarget;
    const level = button.closest(".effect-level").dataset.index;
    let index = button.dataset.index;
    let le = this.item.system.levelEffects;
    switch (button.type) {
      case "text":
        le[level][index].modifier = button.value;
        break;
      case "number":
        le[level][index].value = parseInt(button.value);
        break;
    }
    this.item.update({"system.levelEffects": le});
  }

  _onLevelDelete(ev) {
    const button = ev.currentTarget;
    const level = button.closest(".effect-level").dataset.index;
    let index = button.dataset.index;
    let le = this.item.system.levelEffects;
    le[level].splice(index, 1);
    this.item.update({"system.levelEffects": le});
    this._render();
  }

  get template() {
    return `systems/the_edge/templates/items/item-skill.html`;
  }
}

class ItemSheetLanguage extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-speech"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetGear extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-speech"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetConsumables extends ItemSheetSkill {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-speech"],
      width: 390,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "effects"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {
      medicineEffects: THE_EDGE.medicine_effects,
      displayHint: this.options.displayHint,
      damageTypes: Object.keys(THE_EDGE.bleeding_threshold)
    };
    return context;
  }

  get template() {
    return `systems/the_edge/templates/items/item-consumables.html`;
  }
}

class ItemSheetCredits extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-credits"],
      width: 390,
      height: 240,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetWounds extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-wounds"],
      width: 390,
      height: 240,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {bodyParts: Object.keys(THE_EDGE.wounds_pixel_coords.female)};
    return context;
  }
}

class ItemSheetEffect extends ItemSheetSkill {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-effect"],
      width: 390,
      height: 240,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "effects"}],
    });
  }

  get template() {
    return `systems/the_edge/templates/items/item-effect.html`;
  }
}