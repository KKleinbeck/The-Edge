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
}