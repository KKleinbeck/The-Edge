import { EntitySheetHelper } from "../helper.js";
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
      template: "systems/the_edge/templates/items/item-sheet.html",
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
    // Items.registerSheet("dsa5", ItemCareerDSA5, { makeDefault: true, types: ["career"] });
    // Items.registerSheet("dsa5", ItemCultureDSA5, { makeDefault: true, types: ["culture"] });
    // Items.registerSheet("dsa5", VantageSheetDSA5, { makeDefault: true, types: ["advantage", "disadvantage"] });
    // Items.registerSheet("dsa5", SpellSheetDSA5, { makeDefault: true, types: ["ritual", "ceremony", "liturgy", "spell"] });

    Items.unregisterSheet("the_edge", TheEdgeItemSheet, {
      types: [
        "weapon"
      ]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.systemData = context.data.system;
    context.dtypes = ATTRIBUTE_TYPES;
    context.descriptionHTML = await TextEditor.enrichHTML(context.systemData.description, {
      secrets: this.document.isOwner,
      async: true
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Attribute Management
    html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = EntitySheetHelper.updateAttributes(formData, this.object);
    formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
}

class ItemSheetWeapon extends TheEdgeItemSheet {

}
