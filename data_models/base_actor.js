import { DataModelComponent } from "./abstracts.js";

const { ArrayField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class CharacterBaseData extends DataModelComponent {
  static SCHEMA = {
    health: new SchemaField({
      value: new NumberField({ required: true, integer: true, min: 0, initial: 100 }),
      max: new NumberField({ required: true, integer: true, min: 0, initial: 100 }),
      statusMax: new NumberField({ required: true, integer: true, initial: 0 }),
    }),
    biography: new HTMLField(),
    heroToken: new SchemaField({
      max: new NumberField({ initial: 2, min: 0, required: true }),
      available: new NumberField({ initial: 1, min: 0, required: true }),
    }),
    height: new NumberField({ initial: 170, integer: true, required: true, min: 0 }),
    PracticeHours: new SchemaField({
      used: new NumberField({ initial: 0, integer: true, required: true, min: 0 }),
      max: new NumberField({ initial: 50000, integer: true, required: true, min: 0 })
    }),
    AdvantagePoints: new SchemaField({
      used: new NumberField({ initial: 0, integer: true, required: true }),
      max: new NumberField({ initial: 0, integer: true, required: true })
    }),
    credits: new SchemaField({
      chids: new NumberField({ initial: 0, integer: true, required: true }),
      digital: new NumberField({ initial: 0, integer: true, required: true })
    }),
    counters: new ArrayField(
      new SchemaField({
        name: new StringField({ initial: "" }),
        value: new NumberField({ initial: 1, integer: true, min: 0 }),
        max: new NumberField({ initial: 1, integer: true, min: 0 }),
      }),
      { initial: [] }
    ),
  };

  static migrateData(source) {
    // source.health.statusMax = source.health.max.status;
    if (source.health?.max?.value) source.health.max = source.health.max.value;
  }
}