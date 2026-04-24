import NewChatServer from "../../../system/new_chat_server.js";
import NewDiceServer from "../../../system/new_dice_server.js";
import ValueSchemaField from "../../Fields/value_schema.js";
import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

function PROF_FIELD(diceStrings: string[]) {
  return new ValueSchemaField({
    dice: new ArrayField(
      new StringField(),
      {initial: diceStrings, min: 3, max: 3}
    ),
    status: new NumberField({ initial: 0 }),
    advances: new NumberField({ initial: 0 }),
  });
}

interface ProficiencyData {
  applyStrain(strain: number): void;
}

class ProficiencyData extends DataModelComponent {
  declare attributes: ATTRIBUTES
  declare proficiencies: PROFICIENCIES

  static defineSchema() {
    return {
      proficiencies: new SchemaField({
        physical: new SchemaField({
          "climbing": PROF_FIELD(["end", "str", "str"]),
          "swimming": PROF_FIELD(["end", "end", "str"]),
          "sneaking": PROF_FIELD(["crd", "emp", "foc"]),
          "jumping": PROF_FIELD(["str", "spd", "spd"]),
          "throwing": PROF_FIELD(["str", "str", "spd"]),
          "lock picking": PROF_FIELD(["crd", "crd", "foc"]),
          "pick pocketing": PROF_FIELD(["crd", "emp", "foc"]),
          "balance": PROF_FIELD(["str", "crd", "foc"]),
          "physical fortitude": PROF_FIELD(["end", "str", "res"]),
        }),
        environmental: new SchemaField({
          "orientation": PROF_FIELD(["foc", "foc", "int"]),
          "camouflage & hiding": PROF_FIELD(["crd", "emp", "emp"]),
          "reconnoitring": PROF_FIELD(["end", "end", "foc"]),
          "stalking & hunting": PROF_FIELD(["end", "spd", "emp"]),
          "plants": PROF_FIELD(["crd", "int", "int"]),
          "animals": PROF_FIELD(["emp", "emp", "int"]),
          "outdoor survival": PROF_FIELD(["end", "res", "int"]),
        }),
        mental: new SchemaField({
          "investigation": PROF_FIELD(["foc", "foc", "foc"]),
          "driving": PROF_FIELD(["spd", "crd", "emp"]),
          "piloting": PROF_FIELD(["spd", "crd", "res"]),
          "mental fortitude": PROF_FIELD(["foc", "res", "res"]),
          "logic & maths": PROF_FIELD(["int", "int", "int"]),
          "memory": PROF_FIELD(["foc", "foc", "int"]),
        }),
        technical: new SchemaField({
          "explosives" : PROF_FIELD(["crd", "foc", "res"]),
          "electronics" : PROF_FIELD(["crd", "int", "int"]),
          "computer systems" : PROF_FIELD(["int", "int", "int"]),
          "mechanical" : PROF_FIELD(["str", "crd", "crd"]),
          "bots and mechs" : PROF_FIELD(["str", "int", "int"]),
          "chemicals" : PROF_FIELD(["crd", "foc", "int"]),
          "weapons" : PROF_FIELD(["crd", "foc", "int"]),
        }),
        social: new SchemaField({
          "human cultures": PROF_FIELD(["cha", "emp", "int"]),
          "alien cultures": PROF_FIELD(["cha", "int", "int"]),
          "outlaws' customs": PROF_FIELD(["cha", "cha", "int"]),
          "barter": PROF_FIELD(["cha", "cha", "cha"]),
          "threaten": PROF_FIELD(["str", "cha", "cha"]),
          "convince": PROF_FIELD(["cha", "emp", "emp"]),
          "lie & deceive": PROF_FIELD(["cha", "cha", "emp"]),
          "cards & gambling": PROF_FIELD(["crd", "cha", "foc"]),
        }),
        knowledge: new SchemaField({
          "tactics": PROF_FIELD(["emp", "emp", "int"]),
          "history & legends": PROF_FIELD(["emp", "int", "int"]),
          "religions": PROF_FIELD(["cha", "int", "int"]),
          "politics": PROF_FIELD(["emp", "foc", "int"]),
          "gangs & pirates": PROF_FIELD(["cha", "int", "int"]),
          "first aid": PROF_FIELD(["crd", "end", "cha"]),
          "medicine": PROF_FIELD(["crd", "end", "foc"]),
        })
      })
    };
  }

  getProficiencyDiceThresholds(proficiency: string): IDiceThreshold[] {
    const proficiencyData = Object.values(this.proficiencies)
      .find(profClass => proficiency in profClass)[proficiency]

    const result: IDiceThreshold[] = [];
    proficiencyData.dice.forEach((attr: string) => {
      result.push({name: attr, threshold: this.attributes[attr].value});
    });
     result.push({name: "proficiency", threshold: proficiencyData.value});
    return result;
  }

  get proficiencyDiceParameter(): IDiceParameters { // Placeholder
    return {
      critDice: [1],
      critBonus: 5,
      critDieBonus: 2,

      critFailDice: [20],
      critFailMalus: -5,
      critFailDieMalus: -2,
      critFailEvents: [],

      qualityStep: 5
    }
  }

  async rollProficiencyCheck(promptResult: IProficiencyPromptResult, transmit = true): Promise<IRollResult> {
    const proficiencyData = this.getProficiencyDiceThresholds(promptResult.proficiency)

    var threshold = 0;
    for (const data of proficiencyData) threshold += data.threshold;

    const diceServerConfig: IDiceServerConfig = {
      ...this.proficiencyDiceParameter,
      modifier: promptResult.strain + promptResult.modifier,
      threshold: threshold,
      vantage: promptResult.vantage
    }

    const rollResult: IRollResult = await NewDiceServer.proficiencyCheck(diceServerConfig);
    this.applyStrain(promptResult.strain);

    if (transmit) {
      const details: IProficiencyRollMessage = {
        ...rollResult,
        dice: proficiencyData,
        diceServerConfig: diceServerConfig,
        effectiveThreshold: rollResult.effectiveThreshold,
        modifier: promptResult.modifier,
        proficiency: promptResult.proficiency,
        strain: promptResult.strain,
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
      NewChatServer.transmitEvent("Proficiency Check", details, chatConfig);
    }
    return rollResult;
  }
}

export default ProficiencyData;
