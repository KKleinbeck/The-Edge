import { generateDataModelWithComponents } from "../abstracts.js";

import DescriptionData from "./components/description.js";
import StackableData from "./components/stackable.js";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class AmmunitionData extends generateDataModelWithComponents(
  DescriptionData, StackableData
) {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.loaded = new BooleanField({ initial: false });
    schema.capacity = new SchemaField({
      max: new NumberField({ initial: 30, integer: true, positive: true }),
      value: new NumberField({ initial: 30, integer: true }),
    });
    schema.reloadDuration = new NumberField({ initial: 0, integer: true });
    schema.type = new StringField({ initial: "energy" });
    schema.subtype = new StringField({ initial: "small" });
    schema.whitelist = new SchemaField({
      energy: new SchemaField({
        "Blaster Pistols": new BooleanField({ initial: true }),
        "Pulse Rifle": new BooleanField({ initial: true }),
        "SABs": new BooleanField({ initial: true }),
        "Blaster Shockguns": new BooleanField({ initial: true }),
        "Blaster Snipers": new BooleanField({ initial: true })
      }),
      kinetic: new SchemaField({
        "Kinetic Pistols": new BooleanField({ initial: true }),
        "Slug Throwers": new BooleanField({ initial: true }),
        "LMGs": new BooleanField({ initial: true }),
        "Shotguns": new BooleanField({ initial: true }),
        "Projectile Snipers": new BooleanField({ initial: true })
      }),
      others: new SchemaField({
        "Recoilless Rifles": new BooleanField({ initial: true })
      })
    });
    schema.damage = new SchemaField({
      bonus: new NumberField({ initial: 0, integer: true }),
      penetration: new NumberField({ initial: 0, integer: true })
    });
    schema.rangeChart = new SchemaField({
      less_2m: new ArrayField(new NumberField(), { initial: [0, 0] }),
      less_20m: new ArrayField(new NumberField(), { initial: [0, 0] }),
      less_200m: new ArrayField(new NumberField(), { initial: [0, 0] }),
      less_1km: new ArrayField(new NumberField(), { initial: [0, 0] }),
      more_1km: new ArrayField(new NumberField(), { initial: [0, 0] })
    });

    return schema;
  }
}