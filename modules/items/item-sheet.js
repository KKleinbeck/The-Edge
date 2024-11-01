import { EntitySheetHelper } from "../helper.js";
import THE_EDGE from "../system/config-the-edge.js";
import {ATTRIBUTE_TYPES} from "../constants.js";

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
    Items.registerSheet("the_edge", ItemSheetWeapon, { makeDefault: true, types: ["weapon"] });
    Items.registerSheet("the_edge", ItemSheetArmour, { makeDefault: true, types: ["armour"] });
    // Items.registerSheet("dsa5", ItemCareerDSA5, { makeDefault: true, types: ["career"] });
    // Items.registerSheet("dsa5", ItemCultureDSA5, { makeDefault: true, types: ["culture"] });
    // Items.registerSheet("dsa5", VantageSheetDSA5, { makeDefault: true, types: ["advantage", "disadvantage"] });
    // Items.registerSheet("dsa5", SpellSheetDSA5, { makeDefault: true, types: ["ritual", "ceremony", "liturgy", "spell"] });

    Items.unregisterSheet("the_edge", TheEdgeItemSheet, {
      types: [
        "weapon", "armour"
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
    context.dtypes = ATTRIBUTE_TYPES;
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
}

class ItemSheetWeapon extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-weapon"],
      width: 420,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "details"}],
    });
  }

  async getData(options) {
    const context = await super.getData(options);
    context.helpers = {attrs: THE_EDGE.attrs, weapon_types: THE_EDGE.weapon_types};
    return context;
  }
}

class ItemSheetArmour extends TheEdgeItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "item-armour"],
      width: 385,
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