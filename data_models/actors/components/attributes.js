import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField } = foundry.data.fields;
function ATTR_FIELD() {
  return new SchemaField({
    status: new NumberField({ initial: 0 }),
    advances: new NumberField({ initial: 0 }),
  });
}

export default class AttributeData extends DataModelComponent {
  static SCHEMA = {
    attributes: new SchemaField({
      end: ATTR_FIELD(),
      str: ATTR_FIELD(),
      spd: ATTR_FIELD(),
      crd: ATTR_FIELD(),
      cha: ATTR_FIELD(),
      emp: ATTR_FIELD(),
      foc: ATTR_FIELD(),
      res: ATTR_FIELD(),
      int: ATTR_FIELD(),
    }),
  }
}