const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class CombatantBaseData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, foundryAny> {
    return {
      movementIndex: new NumberField({ initial: 0, integer: true }),
      strainInitiative: new NumberField({ initial: 0, integer: true }),
      actionLog: new ArrayField(
        new SchemaField({
          name: new StringField({ intial: "" }),
          actionCost: new NumberField({ initial: 0, integer: true })
        }),
        { initial: [] }
      )
    }
  }
}
