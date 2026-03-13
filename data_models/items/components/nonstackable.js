import { DataModelComponent } from "../../abstracts.js";

const { NumberField } = foundry.data.fields;

export default class NonstackableData extends DataModelComponent {
  static defineSchema() {
    return {
      value: new NumberField({ initial: 0, integer: true }),
      weight: new NumberField({ initial: 0, integer: true }),
    };
  }
}