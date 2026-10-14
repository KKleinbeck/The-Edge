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
}
