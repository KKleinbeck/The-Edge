import ChatServer from "../../../system/chat_server.js";
import ValueSchemaField from "../../Fields/value_schema.js";
import { DataModelComponent } from "../../abstracts.js";
const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;
function PROF_FIELD(diceStrings) {
    return new ValueSchemaField({
        dices: new ArrayField(new StringField(), { initial: diceStrings, min: 3, max: 3 }),
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
    async rollProficiencyCheck(checkData, roll = "roll", transmit = true) {
        checkData.proficiency = checkData.proficiency.toLowerCase();
        const proficiencyData = Object.values(this.proficiencies)
            .find(profClass => checkData.proficiency in profClass)[checkData.proficiency];
        checkData.dices = proficiencyData.dices;
        checkData.permanentMod = proficiencyData.value;
        checkData.thresholds = checkData.dices.map(dice => this.attributes[dice]["value"]);
        const results = await this.parent.diceServer.proficiencyCheck(checkData.thresholds, checkData.permanentMod + (checkData.temporaryMod || 0), checkData.vantage);
        if (transmit) {
            foundry.utils.mergeObject(checkData, results);
            ChatServer.transmitEvent("ProficiencyCheck", checkData, roll);
        }
        return results;
    }
}
