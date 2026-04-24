import { generateDataModelWithComponents } from "../abstracts.js";
import DescriptionData from "./components/description.js";
import StackableData from "./components/stackable.js";
const { ArrayField, BooleanField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;
export default class ConsumablesData extends generateDataModelWithComponents(DescriptionData, StackableData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.current_type = new StringField({ initial: "food" });
        schema.subtypes = new SchemaField({
            medicine: new SchemaField({
                healing: new StringField({ initial: "0" }),
                coagulation: new StringField({ initial: "0" }),
                effect: new StringField({ initial: "heals" }),
                actionCost: new StringField({ initial: "1" })
            }),
            grenade: new SchemaField({
                blastDistance: new ArrayField(new NumberField(), { initial: [0, 0] }),
                damage: new ArrayField(new StringField(), { initial: ["0", "0"] }),
                type: new StringField({ initial: "kinetic" }),
                effects: new SchemaField({
                    shellshock: new SchemaField({
                        active: new BooleanField({ initial: false }),
                        close: new ArrayField(new ObjectField(), { initial: [] }),
                        far: new ArrayField(new ObjectField(), { initial: [] })
                    }),
                    emp: new SchemaField({
                        active: new BooleanField({ initial: false }),
                        close: new ArrayField(new ObjectField(), { initial: [] }),
                        far: new ArrayField(new ObjectField(), { initial: [] })
                    }),
                    smoke: new SchemaField({
                        active: new BooleanField({ initial: false })
                    })
                })
            }),
            food: new SchemaField({
                strainReduction: new StringField({ initial: "0" })
            }),
            drugs: new SchemaField({}),
            generic: new SchemaField({})
        });
        schema.effect = new ArrayField(new ObjectField(), { initial: [] });
        return schema;
    }
}
