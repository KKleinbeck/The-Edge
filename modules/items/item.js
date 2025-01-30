import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";

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
    Medicalskill: "systems/the_edge/icons/medical_skill.png",
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

  async toggleActive() {
    if (this.system.active === undefined) return undefined;
    await this.update({"system.active": !this.system.active})
  }

  async toggleEquipped() {
    if (this.system.equipped === undefined) return undefined;
    if (this.system.structurePoints <= 0) {
      let msg = LocalisationServer.parsedLocalisation("EquipBroken", "Notifications")
      ui.notifications.notify(msg)
      return undefined;
    }
    await this.update({"system.equipped": !this.system.equipped})
  }

  useOne() {
    if (this.system.quantity > 1) {
      this.update({"system.quantity": this.system.quantity - 1});
    } else this.delete();
  }
}

export class ArmourItemTheEdge extends TheEdgeItem {
  static async protect(damage, damageType, location, protectionLog) {
    const protectedLoc = this.system.bodyPart;
    const isProtective = protectedLoc === "Entire" || (location === protectedLoc) || (location !== "Head" && protectedLoc === "Below_Neck")
    if (!isProtective) return damage;

    // Process inner armour first
    if (this.system.layer == "Inner") {
      for (const attachment of this.system.attachments) {
        const actor = Aux.getActor(attachment.actorId, attachment.tokenId);
        const shell = actor.items.get(attachment.shellId);
        damage = await ArmourItemTheEdge.protect.call(shell, damage, damageType, location, protectionLog);
      }
    }

    if (damageType == "HandToHand" || damageType == "fall" || damageType == "impact") {
      damage = "kinetic";
    }
    const protection = this.system.protection[damageType];
    protectionLog[this.name] = Math.min(damage, protection.absorption);
    damage = Math.max(0, damage - protection.absorption);

    const update = {}
    if (damage <= protection.threshold) {
      update["system.structurePoints"] = Math.max(0, this.system.structurePoints - damage)
      protectionLog[this.name] += damage;
      damage = 0;
    } else {
      update["system.structurePoints"] = Math.max(0, this.system.structurePoints - protection.threshold)
      protectionLog[this.name] += protection.threshold;
      damage -= protection.threshold;
    }

    if (update["system.structurePoints"] == 0) {
      let msg = LocalisationServer.parsedLocalisation("Destroyed", "Notifications", {name: this.name})
      ui.notifications.notify(msg)
      update["name"] = this.name + " (broken)";
      update["system.equipped"] = false;
      if (this.system.layer == "Outer") {
        const parentInfo = this.system.attachments[0];
        const actor = Aux.getActor(parentInfo.actorId, parentInfo.tokenId);
        const parent = actor.items.get(parentInfo.armourId);
        await Aux.detachFromParent(parent, this.id, this.system.attachmentPoints.max);
      }
    }
    await this.update(update);
    if(this.sheet.rendered) { this.sheet._render() }

    return damage;
  }
}