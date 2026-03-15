import { generateDataModelWithComponents } from "../abstracts.js";

import DescriptionData from "./components/description.js";
import EquipableData from "./components/equipable.js";
import NonstackableData from "./components/nonstackable.js";

const { ArrayField, BooleanField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

export default class WeaponData extends generateDataModelWithComponents(
  DescriptionData, EquipableData, NonstackableData
) {
  static defineSchema() {
    const schema = super.defineSchema()
    schema.type = new StringField({ initial: "Pulse Rifle" });
    schema.isElemental = new BooleanField({ initial: false });
    schema.multipleTargets = new BooleanField({ initial: false });
    schema.fireModes = new ArrayField(
      new ObjectField(),
      { initial: [{ name: "Single", damage: "1d20", cost: 1, dices: 1, precisionPenalty: [0, 0] }] }
    );
    schema.reloadDuration = new NumberField({ initial: 1, integer: true });
    schema.leadAttr1 = new SchemaField({
      name: new StringField({ initial: "str" }),
      value: new NumberField({ initial: 10, integer: true })
    });
    schema.leadAttr2 = new SchemaField({
      name: new StringField({ initial: "str" }),
      value: new NumberField({ initial: 10, integer: true })
    });
    schema.rangeChart = new SchemaField({
      less_2m: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
      less_20m: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
      less_200m: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
      less_1km: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
      more_1km: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] })
    });
    schema.attachments = new ArrayField(new ObjectField(), { initial: [] });
    schema.ammunitionType = new StringField({ initial: "small" });
    schema.ammunitionID = new StringField({ initial: "" });
    return schema;
  }
}