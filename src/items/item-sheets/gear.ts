import { TheEdgeItemSheet } from "../item-sheet.js";

export class ItemSheetGear extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    position: { height: 170, width: 360 },
  };

  static PARTS = {
    description: {
      template: "systems/the_edge/templates/items/meta-description.hbs",
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.userIsGM = false; // Prevent GM notes on credits
    return context;
  }
}
