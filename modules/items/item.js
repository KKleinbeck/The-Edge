import LocalisationServer from "../system/localisation_server.js";

/**
 * Extend the base Item document to support attributes and groups with a custom template creation dialog.
 * @extends {Item}
 */
export class TheEdgeItem extends Item {
  static defaultImages = {
    Weapon: "systems/the_edge/icons/rifle.png",
    Armour: "systems/the_edge/icons/helmet.png",
    Ammunition: "systems/the_edge/icons/ammunition.png",
    Advantage: "systems/the_edge/icons/advantage.png",
    Disadvantage: "systems/the_edge/icons/disadvantage.png",
    Skill: "systems/the_edge/icons/skill.png",
    Combatskill: "systems/the_edge/icons/combat_skill.png",
    Languageskill: "systems/the_edge/icons/speech.png",
    Gear: "systems/the_edge/icons/gear.png",
    Consumables: "systems/the_edge/icons/consumables.png",
    Credits: "systems/the_edge/icons/credits.png",
    Effect: "systems/the_edge/icons/effect.png",
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
      armour: ArmourItemTheEdge
    }
  }

  toggleEquipped() {
    if (this.system.equipped === undefined) return undefined;
    if (this.system.structurePoints <= 0) {
      let msg = LocalisationServer.parsedLocalisation("EquipBroken", "Notifications")
      ui.notifications.notify(msg)
      return undefined;
    }
    this.update({"system.equipped": !this.system.equipped})
  }
}

export class ArmourItemTheEdge extends TheEdgeItem {
  static async protect(damage, damageType) {
    let protection = this.system.protection[damageType];
    damage = Math.max(0, damage - protection.absorption);

    let update = {}
    if (damage <= protection.threshold) {
      update["system.structurePoints"] = Math.max(0, this.system.structurePoints - damage)
      damage = 0;
    } else {
      update["system.structurePoints"] = Math.max(0, this.system.structurePoints - protection.threshold)
      damage -= protection.threshold
    }

    if (update["system.structurePoints"] == 0) {
      let msg = LocalisationServer.parsedLocalisation("Destroyed", "Notifications", {name: this.name})
      ui.notifications.notify(msg)
      update["system.equipped"] = false
      update["name"] = this.name + " (broken)"
    }
    await this.update(update)
    if(this.sheet.rendered) {
      this.sheet._render()
    }

    return damage
  }
}