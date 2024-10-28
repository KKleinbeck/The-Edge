import {EntitySheetHelper} from "../helper.js";

/**
 * Extend the base Item document to support attributes and groups with a custom template creation dialog.
 * @extends {Item}
 */
export class TheEdgeItem extends Item {
  static defaultImages = {
    weapon: "systems/the_edge/icons/rifle.png"
  }

  /* -------------------------------------------- */

  /** @override */
  static async createDialog(data={}, options={}) {
    return EntitySheetHelper.createDialog.call(this, data, options);
  }

  static defaultIcon(data) {
    if (!data.img || data.img == "") {
      if (data.type in this.defaultImages) {
        data.img = this.defaultImages[data.type]
      } else {
        data.img = "systems/the_edge/icons/rifle.png"
      }
    }
  }

  static async create(data, options) {
    this.defaultIcon(data)
    return await super.create(data, options)
  }

  /* -------------------------------------------- */

  /**
   * Is this Item used as a template for other Items?
   * @type {boolean}
   */
  get isTemplate() {
    return !!this.getFlag("the_edge", "isTemplate");
  }

  static setupSubClasses() {
    game.the_edge.config.ItemSubClasses = {
      weapon: WeaponItemTheEdge
    }
  }
}

class WeaponItemTheEdge extends TheEdgeItem {

}
