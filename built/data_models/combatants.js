const { ArrayField, NumberField, ObjectField } = foundry.data.fields;
export default class CombatantData {
    static defineSchema() {
        return {
            movementIndex: new NumberField({ initial: 0, integer: true }),
            movementOptions: new ArrayField(new ObjectField(), { initial: [] }),
            strainLog: new ArrayField(new ObjectField(), { initial: [] })
        };
    }
}
