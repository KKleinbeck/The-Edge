import { generateDataModelWithComponents } from "../abstracts.js";
import DescriptionData from "./components/description.js";
import StackableData from "./components/stackable.js";
const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
export default class AmmunitionData extends generateDataModelWithComponents(DescriptionData, StackableData) {
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
        schema.damage = new SchemaField({
            bonus: new StringField({
                initial: "0",
                validate: AmmunitionData._bonusDamageValidator,
            }),
            penetration: new NumberField({ initial: 0, integer: true }),
        });
        schema.rangeChart = new SchemaField({
            less_2m: new ArrayField(new NumberField(), { initial: [0, 0] }),
            less_10m: new ArrayField(new NumberField(), { initial: [0, 0] }),
            less_25m: new ArrayField(new NumberField(), { initial: [0, 0] }),
            less_100m: new ArrayField(new NumberField(), { initial: [0, 0] }),
            more_100m: new ArrayField(new NumberField(), { initial: [0, 0] }),
        });
        return schema;
    }
    static _bonusDamageValidator(value, _options) {
        return Roll.validate(value);
    }
}
