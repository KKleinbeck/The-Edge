import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class HumanoidData extends DataModelComponent {
  static SCHEMA = {
    age: new NumberField({ initial: 21, integer: true, min: 0, required: true }),
    sex: new StringField({ initial: "female" }),
    bloodType: new StringField({ initial: "AB" }),
    bloodLoss: new SchemaField({ value: new NumberField({ initial: 0, integer: true, min: 0, required: true }) }),
    handedness: new StringField({ initial: "right" }),
    race: new StringField({ initial: "Human" }),
    heartRate: new SchemaField({
      value: new NumberField({ initial: 60, integer: true, min: 0, required: true }),
      min: new SchemaField({
        value: new NumberField({ initial: 0, integer: true, min: 0 }),
        status: new NumberField({ initial: 0, integer: true, min: 0 }),
        baseline : new NumberField({ initial: 60, integer: true, min: 0 }),
      }),
      max: new SchemaField({
        value: new NumberField({ initial: 195, integer: true, min: 0 }),
        status: new NumberField({ initial: 0, integer: true, min: 0 }),
        baseline : new NumberField({ initial: 195, integer: true, min: 0 }),
      }),
      damageThreshold: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
    }),
    nativeLanguage: new StringField({ initial: "Standard"}),
  }

  get hrZone1() {return 5 * Math.floor(this.heartRate.max.value * 75 / 500)}
  get hrZone2() {return 5 * Math.floor(this.heartRate.max.value * 90 / 500)}

  getHRZone(hr = undefined) {
    hr = hr ? hr : this.heartRate.value;
    if (hr < this.hrZone1) return 1;
    if (hr < this.hrZone2) return 2;
    return 3;
  }
}
