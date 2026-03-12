import { DataModelComponent } from "../../abstracts.js";

const { NumberField } = foundry.data.fields;

export default class StackableData extends DataModelComponent {
  static defineSchema() {
    return {
      quantity: new NumberField({ initial: 0, integer: true }),
      value: new NumberField({ initial: 0, integer: true }),
      weight: new NumberField({ initial: 0, integer: true }),
    };
  }
}