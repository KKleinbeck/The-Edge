const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;
export default class CombatantBaseData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            movementIndex: new NumberField({ initial: 0, integer: true }),
            strainInitiative: new NumberField({ initial: 0, integer: true }),
            strainLog: new ArrayField(new SchemaField({
                name: new StringField({ intial: "" }),
                strainChange: new NumberField({ initial: 0, integer: true })
            }), { initial: [] })
        };
    }
}
