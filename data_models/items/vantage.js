import { generateDataModelWithComponents } from "../abstracts.js";

import DescriptionData from "./components/description.js";

const { NumberField } = foundry.data.fields;

export default class VantageData extends generateDataModelWithComponents(
  DescriptionData
) {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.AP = new NumberField({ initial: 0, interger: true });
    schema.level = new NumberField({ initial: 0, interger: true });
    schema.maxLevel = new NumberField({ initial: 0, interger: true });
    return schema;
  }
}