import THE_EDGE from "../system/config-the-edge.js";
import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class TheEdgeItemSheet extends ItemSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item"],
      width: 390,
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
    Items.registerSheet("the_edge", ItemSheetSkill, { makeDefault: true, types: ["Skill", "Combatskill", "Medicalskill"] });
    Items.registerSheet("the_edge", ItemSheetLanguage, { makeDefault: true, types: ["Languageskill"] });
    Items.registerSheet("the_edge", ItemSheetGear, { makeDefault: true, types: ["Gear"] });
    Items.registerSheet("the_edge", ItemSheetConsumables, { makeDefault: true, types: ["Consumables"] });
    Items.registerSheet("the_edge", ItemSheetCredits, { makeDefault: true, types: ["Credits"] });
    Items.registerSheet("the_edge", ItemSheetWounds, { makeDefault: true, types: ["Wounds"] });
    Items.registerSheet("the_edge", ItemSheetEffect, { makeDefault: true, types: ["Effect"] });

    Items.unregisterSheet("the_edge", TheEdgeItemSheet, {
      types: [
        "Weapon", "Armour", "Ammunition", "Advantage", "Disadvantage", "Skill", "Combatskill",
        "Medicalskill", "Languageskill", "Gear", "Consumables", "Credits", "Wounds", "Effect"
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
    context.gmDescriptionHTML = await TextEditor.enrichHTML(context.systemData.gm_description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.systemData.userIsGM = game.user.isGM;
    context.definedEffects = structuredClone(THE_EDGE.effect_map);
    for (const group of ["attributes", "proficiencies", "weapons"]) {
      context.definedEffects[group].crit = undefined;
      context.definedEffects[group].critFail = undefined;
    }
    return context;
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
    effects.push({group: "attributes", name: "end", value: 0});
    this.item.update({"system.effects": effects});
  }

  async _onModify(ev) {
    const button = ev.currentTarget;
    const index = button.dataset.index;
    const effects = this.item.system.effects;
    const target = button.dataset.target;
    effects[index][target] = target == "value" ? parseInt(button.value) : button.value;
    // The next line also sets the name to something sensible if the group changes
    const context = await this.getData();
    if (target == "group") {
      effects[index].name = Object.keys(context.definedEffects[button.value])[0];
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
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {
      attrs: THE_EDGE.attrs,
      weapon_types: Object.keys(THE_EDGE.core_value_map.weapons).filter(x => !x.includes("General"))
    };
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".firing-mode-add").click(_ => this._onModeAdd());
    html.find(".firing-mode-delete").click(ev => this._onModeDelete(ev));
    html.find(".firing-mode-modify").on("change", ev => this._onModeModify(ev));
  }

  async _onModeAdd() {
    const context = await this.getData();
    const fireModes = context.systemData.fireModes;
    fireModes.push(
      {name: "", damage: "1d20", dices: 1, cost: 1, precisionPenalty: [0, 0]}
    )
    this.item.update({"system.fireModes": fireModes})
  }

  async _onModeDelete(ev) {
    const dataHtml = ev.currentTarget.closest(".firing-mode");
    const index = dataHtml.dataset.index;

    const context = await this.getData();
    const fireModes = context.systemData.fireModes;
    fireModes.splice(index, 1)
    this.item.update({"system.fireModes": fireModes})
  }

  async _onModeModify(ev) {
    const button = ev.currentTarget;
    const dataHtml = ev.currentTarget.closest(".firing-mode");
    const index = dataHtml.dataset.index;

    const target = button.dataset.target;
    const context = await this.getData();
    const fireModes = context.systemData.fireModes;
    if (target.includes("precisionPenalty")) {
      const penaltyIndex = +target.slice(-1);
      fireModes[+index].precisionPenalty[penaltyIndex] = +button.value
    } else if (target === "name" || target === "damage") {
      fireModes[+index][target] = button.value;
    } else {
      fireModes[+index][target] = +button.value;
    }
    this.item.update({"system.fireModes": fireModes})
  }
}

class ItemSheetArmour extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {bodyParts: THE_EDGE.body_parts};
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".attachment-edit").click(ev => this._onAttachmentEdit(ev));
    html.find(".attachment-detach").click(ev => this._onAttachmentDetach(ev));
  }

  _fetchAttachment(event) {
    const dataElement = $(event.currentTarget).parent()[0];

    const actorId = dataElement.dataset.actorId;
    const tokenId = dataElement.dataset.tokenId;
    const actor = Aux.getActor(actorId, tokenId)

    const attachmentId = dataElement.dataset.attachmentId;
    return actor.items.get(attachmentId);
  }

  _onAttachmentEdit(event) {
    const attachment = this._fetchAttachment(event);
    attachment.sheet.render(true);
  }

  _onAttachmentDetach(event) {
    const attachment = this._fetchAttachment(event);
    attachment.update({"system.equipped": false, "system.attachments": []});
    Aux.detachFromParent(this.item, attachment._id, attachment.system.attachmentPoints.max);
    this.render()
  }
}

class ItemSheetAmmunition extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
      displayHint: false,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
  
  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {displayHint: this.options.displayHint};
    context.coreRequirements = structuredClone(THE_EDGE.core_value_map);
    context.coreRequirements.skills = {};
    const skills = game.items.filter(x => x.type.toLowerCase().includes("skill"));
    for (const skill of skills) {
      context.coreRequirements.skills[skill.name] = skill.name;
    }
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
    let re = this.item.system.requirements;
    if (le.length >= maxLevel) {
      this.item.update({
        "system.maxLevel": maxLevel, "system.levelEffects": le.slice(0, maxLevel),
        "system.requirements": re.slice(0, maxLevel)
      })
    } else {
      for (let i = le.length; i < maxLevel ; ++i) {
        le.push([])
        re.push([])
      }
      this.item.update({
        "system.maxLevel": maxLevel, "system.levelEffects": le,
        "system.requirements": re
      });
    }
  }

  _onLevelAdd(ev) {
    const dataHtml = ev.currentTarget.closest(".effect-level");
    const level = dataHtml.dataset.index;
    const target = dataHtml.dataset.type;
    let targetList = this.item.system[target];
    targetList[level].push({group: "attributes", name: "end", value: 0});
    if (target == "levelEffects") this.item.update({"system.levelEffects": targetList});
    if (target == "requirements") this.item.update({"system.requirements": targetList});
  }

  async _onLevelModify(ev) {
    const button = ev.currentTarget;
    const dataHtml = ev.currentTarget.closest(".effect-level");
    const type = dataHtml.dataset.type;

    const targetList = this.item.system[type];
    const level = dataHtml.dataset.index;
    const index = button.dataset.index;
    const target = button.dataset.target;
    targetList[level][index][target] = target == "value" ? parseInt(button.value) : button.value;
    // The next line also sets the name to something sensible if the group changes
    const context = await this.getData();
    if (target == "group") {
      effects[index].name = Object.keys(context.definedEffects[button.value])[0];
    }
    if (type == "levelEffects") this.item.update({"system.levelEffects": targetList});
    if (type == "requirements") this.item.update({"system.requirements": targetList});
  }

  _onLevelDelete(ev) {
    const button = ev.currentTarget;
    const dataHtml = ev.currentTarget.closest(".effect-level");
    const level = dataHtml.dataset.index;
    const target = dataHtml.dataset.type;
    let index = button.dataset.index;
    let targetList = this.item.system[target];
    targetList[level].splice(index, 1);
    if (target == "levelEffects") this.item.update({"system.levelEffects": targetList});
    if (target == "requirements") this.item.update({"system.requirements": targetList});
    this._render();
  }

  get template() {
    return `systems/the_edge/templates/items/item-skill.html`;
  }
}

class ItemSheetLanguage extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetGear extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetConsumables extends ItemSheetSkill {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
      height: 240,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }
}

class ItemSheetWounds extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-wounds"],
      height: 240,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {bodyParts: Object.keys(THE_EDGE.wounds_pixel_coords.female)};
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".wound-location").on("change", ev => this._onLocationChange(ev));
    html.find(".damage-input").on("change", ev => this._onDamageChange(ev));
  }

  async _onLocationChange(event) {
    const newLocation = $(event.currentTarget).val();
    await this.item.update({"system.coordinates": Aux.generateWoundLocation(
      false, this.item.actor?.system.sex || "female", newLocation
    )[1]});
  }

  async _onDamageChange(event) {
    const parent = this.item.parent;
    if (parent) {
      const damageChange = $(event.currentTarget).val() - this.item.system.damage;
      parent.update({"system.health.value": parent.system.health.value - damageChange});
    }
  }
}

class ItemSheetEffect extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "effects"}],
    });
  }

  get template() {
    return `systems/the_edge/templates/items/item-effect.html`;
  }
}