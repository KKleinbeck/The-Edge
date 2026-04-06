import ChatServer from "../../../system/chat_server.js";
import ValueSchemaField from "../../Fields/value_schema.js";
import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField } = foundry.data.fields;
function ATTR_FIELD() {
  return new ValueSchemaField({
    status: new NumberField({ initial: 0 }),
    advances: new NumberField({ initial: 0 }),
  });
}

export default class AttributeData extends DataModelComponent {
  declare attributes: {
    end: foundryAny,
    str: foundryAny,
    spd: foundryAny,
    crd: foundryAny,
    cha: foundryAny,
    emp: foundryAny,
    foc: foundryAny,
    res: foundryAny,
    int: foundryAny,
  }
  
  static defineSchema() {
    return {
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
    };
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

  async rollAttributeCheck(checkData, roll = "roll", transmit = true) {
    checkData.threshold = this.attributes[checkData.attribute]["value"] +
      checkData.temporaryMod;
    const result = await this.parent.diceServer.attributeCheck(
      checkData.threshold, checkData.vantage);

    if (transmit) {
      foundry.utils.mergeObject(checkData, result);
      ChatServer.transmitEvent("AbilityCheck", checkData, roll);
    }
  }
}