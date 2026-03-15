import Aux from "../../modules/system/auxilliaries.js";
import LocalisationServer from "../../modules/system/localisation_server.js";
import NotificationServer from "../../modules/system/notifications.js";
import THE_EDGE from "../../modules/system/config-the-edge.js";
import { generateDataModelWithComponents } from "../abstracts.js";

import DescriptionData from "./components/description.js";
import EquipableData from "./components/equipable.js";
import NonstackableData from "./components/nonstackable.js";

const { ArrayField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

export default class ArmourData extends generateDataModelWithComponents(
  DescriptionData, EquipableData, NonstackableData
) {
  static defineSchema() {
    const schema = super.defineSchema()
    schema.bodyPart = new StringField({ initial: "Torso" });
    schema.layer = new StringField({ initial: "Inner" });
    schema.structurePoints = new NumberField({ initial: 10, integer: true });
    schema.structurePointsOriginal = new NumberField({ initial: 10, integer: true });
    schema.attachmentPoints = new SchemaField({
      max: new NumberField({ initial: 0, integer: true }),
      used: new NumberField({ initial: 0, integer: true })
    });
    schema.attachments = new ArrayField(new ObjectField(), { initial: [] });
    schema.protection = new SchemaField({
      energy: new SchemaField({
        absorption: new NumberField({ initial: 0, integer: true }),
        threshold: new NumberField({ initial: 0, integer: true })
      }),
      kinetic: new SchemaField({
        absorption: new NumberField({ initial: 0, integer: true }),
        threshold: new NumberField({ initial: 0, integer: true })
      }),
      elemental: new SchemaField({
        absorption: new NumberField({ initial: 0, integer: true }),
        threshold: new NumberField({ initial: 0, integer: true })
      })
    });
    return schema;
  }

  async protect(damage, penetration, damageType, location, protectionLog) {
    const protectedLoc = this.bodyPart;
    const isProtective = THE_EDGE.cover_map[protectedLoc].includes(location);
    if (!isProtective) return [damage, penetration];

    // Process inner armour first
    if (this.layer == "Inner") {
      for (const attachment of this.attachments) {
        const actor = Aux.getActor(attachment.actorId, attachment.tokenId);
        const shell = actor.items.get(attachment.shellId);
        [damage, penetration] = await shell.system.protect(
          damage, penetration, damageType, location, protectionLog
        );
      }
    }

    if (damageType == "HandToHand" || damageType == "fall" || damageType == "impact") {
      damageType = "kinetic";
    }
    const protection = this.protection[damageType];
    protectionLog[this.parent.name] = Math.min(damage, protection.absorption);
    damage = Math.max(0, damage - protection.absorption);

    const update = {}
    if (damage <= protection.threshold) {
      update["system.structurePoints"] = Math.max(0, this.structurePoints - damage)
      protectionLog[this.parent.name] += damage;
      damage = Math.max(0, Math.min(penetration, protection.threshold));
    } else { // TODO: It could be that structurePoints < Threshold => propagate damage
      update["system.structurePoints"] = Math.max(0, this.structurePoints - protection.threshold)
      protectionLog[this.parent.name] += protection.threshold;
      damage -= Math.max(protection.threshold - penetration, 0);
    }
    penetration = Math.max(penetration - protection.threshold, 0);

    if (update["system.structurePoints"] == 0) {
      NotificationServer.notify("Destroyed", {name: this.parent.name});
      update["name"] = this.parent.name + " - " + LocalisationServer.localise("broken");
      update["system.equipped"] = false;
      update["system.attachments"] = [];
      if (this.layer == "Outer") {
        const parentInfo = this.attachments[0];
        const actor = Aux.getActor(parentInfo.actorId, parentInfo.tokenId);
        const innerArmour = actor.items.get(parentInfo.armourId);
        await Aux.detachFromParent(innerArmour, this.parent.id, this.attachmentPoints.max);
      }
    }
    await this.parent.update(update);
    if(this.parent.sheet.rendered) { this.parent.sheet.render(true) }

    return [damage, penetration];
  }
}