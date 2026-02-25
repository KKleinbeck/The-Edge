import { DataModelComponent } from "../../abstracts.js";
import ValueSchemaField from "../../Fields/value_schema.js";

const { NumberField, SchemaField } = foundry.data.fields;
function ATTR_FIELD() {
  return new ValueSchemaField({
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

  get strideSpeed() {
    const {spd, foc} = this.attributes;
    return Math.min(5 + Math.floor(spd.value / 6  ), Math.floor(foc.value * 0.75));
  }

  get runSpeed() {
    const {spd, foc} = this.attributes;
    return Math.min(7 + Math.floor(spd.value / 3  ), Math.floor(foc.value * 1.25));
  }

  get sprintSpeed() {
    const {spd, foc} = this.attributes;
    return Math.min(8 + Math.floor(spd.value / 1.5), Math.floor(foc.value * 1.75));
  }

  get combaticsDamage() {
    const {crd, str} = this.attributes;
    return `1d${str.value+crd.value}+${str.value}`;
  }
}