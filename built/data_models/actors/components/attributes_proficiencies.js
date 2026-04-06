import ChatServer from "../../../system/chat_server.js";
import ValueSchemaField from "../../Fields/value_schema.js";
import { DataModelComponent } from "../../abstracts.js";
const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;
function PROF_FIELD(diceStrings) {
    return new ValueSchemaField({
        dice: new ArrayField(new StringField(), { initial: diceStrings, min: 3, max: 3 }),
        status: new NumberField({ initial: 0 }),
        advances: new NumberField({ initial: 0 }),
    });
}
export default class ProficiencyData extends DataModelComponent {
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
                    "explosives": PROF_FIELD(["crd", "foc", "res"]),
                    "electronics": PROF_FIELD(["crd", "int", "int"]),
                    "computer systems": PROF_FIELD(["int", "int", "int"]),
                    "mechanical": PROF_FIELD(["str", "crd", "crd"]),
                    "bots and mechs": PROF_FIELD(["str", "int", "int"]),
                    "chemicals": PROF_FIELD(["crd", "foc", "int"]),
                    "weapons": PROF_FIELD(["crd", "foc", "int"]),
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
    get strideSpeed() {
        const { spd, foc } = this.attributes;
        return Math.min(5 + Math.floor(spd.value / 6), Math.floor(foc.value * 0.75));
    }
    get runSpeed() {
        const { spd, foc } = this.attributes;
        return Math.min(7 + Math.floor(spd.value / 3), Math.floor(foc.value * 1.25));
    }
    get sprintSpeed() {
        const { spd, foc } = this.attributes;
        return Math.min(8 + Math.floor(spd.value / 1.5), Math.floor(foc.value * 1.75));
    }
    get combaticsDamage() {
        const { crd, str } = this.attributes;
        return `1d${str.value + crd.value}+${str.value}`;
    }
    async rollAttributeCheck(checkData, roll = "roll", transmit = true) {
        checkData.threshold = this.attributes[checkData.attribute]["value"] +
            checkData.temporaryMod;
        const result = await this.parent.diceServer.attributeCheck(checkData.threshold, checkData.vantage);
        if (transmit) {
            foundry.utils.mergeObject(checkData, result);
            ChatServer.transmitEvent("AbilityCheck", checkData, roll);
        }
    }
    async rollProficiencyCheck(promptResult, transmit = true) {
        const proficiency = promptResult.proficiency;
        const proficiencyData = Object.values(this.proficiencies)
            .find(profClass => proficiency in profClass)[proficiency];
        var basicThreshold = proficiencyData.value;
        basicThreshold += proficiencyData.dice.reduce((acc, x) => acc + this.attributes[x].value, 0);
        const diceConfg = {
            ...this.diceParameters,
        };
        const rollResult = structuredClone(promptResult);
        rollResult.threshold = promptResult.strain + promptResult.modifier + basicThreshold;
        // rollResult.dices = proficiencyData.dices;
        // rollResult.permanentMod = proficiencyData.value;
        // rollResult.thresholds = rollResult.dices.map(dice => this.attributes[dice]["value"]);
        // const results = await this.parent.diceServer.proficiencyCheck(
        //   promptResult.thresholds, promptResult.permanentMod + (promptResult.temporaryMod || 0), promptResult.vantage
        // );
        // if (transmit) {
        //   foundry.utils.mergeObject(promptResult, results)
        //   ChatServer.transmitEvent("ProficiencyCheck", promptResult, roll);
        // }
        // return results;
    }
}
