import { generateDataModelWithComponents } from "../abstracts.js";
import DescriptionData from "./components/description.js";
import SkillTemplateData from "./components/skill.js";
const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;
export class SkillData extends generateDataModelWithComponents(DescriptionData, SkillTemplateData) {
}
export class CombatSkillData extends generateDataModelWithComponents(DescriptionData, SkillTemplateData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.hrCost = new StringField({ initial: "0" });
        return schema;
    }
}
export class LanguageSkillData extends generateDataModelWithComponents(DescriptionData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.level = new NumberField({ initial: 1, integer: true });
        schema.humanSpoken = new BooleanField({ initial: true });
        return schema;
    }
}
export class MedicalSkillData extends generateDataModelWithComponents(DescriptionData, SkillTemplateData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.basis = new StringField({ initial: "Medicine" });
        return schema;
    }
}
