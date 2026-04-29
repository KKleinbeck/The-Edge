import NewChatServer from "../../../system/new_chat_server.js";
import NewDiceServer from "../../../system/new_dice_server.js";
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
  declare attributes: ATTRIBUTES
  
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

  get attributeDiceParameters(): IDiceParameters { // Placeholder
    return {
      critDice: [1],
      critBonus: 2,
      critDieBonus: 0,

      critFailDice: [20],
      critFailMalus: -2,
      critFailDieMalus: 0,
      critFailEvents: [],

      qualityStep: 2
    }
  }

  async rollAttributeCheck(promptResult: IAttributePromptResult, transmit = true): Promise<IRollResult> {
    const diceServerConfig: IDiceServerConfig = {
      ...this.attributeDiceParameters,
      modifier: promptResult.modifier,
      threshold: this.attributes[promptResult.attribute].value,
      vantage: promptResult.vantage
    }

    const rollResult: IRollResult = await NewDiceServer.attributeCheck(diceServerConfig);

    if (transmit) {
      const details: IAttributeRollMessage = {
        ...rollResult,
        attribute: promptResult.attribute,
        attributeValue: this.attributes[promptResult.attribute].value,
        diceServerConfig: diceServerConfig,
        effectiveThreshold: rollResult.effectiveThreshold,
        modifier: promptResult.modifier,
        strain: 0,
        vantage: promptResult.vantage
      }
      const chatConfig: IChatServerConfig = {
        roll: promptResult.roll,
        speaker: {
          actor: promptResult.actorId,
          scene: promptResult.sceneId,
          token: promptResult.tokenId
        }
      }
      NewChatServer.transmitEvent("ATTRIBUTE CHECK", details, chatConfig);
    }
    return rollResult;
  }
}