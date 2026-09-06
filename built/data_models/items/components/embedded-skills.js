import { DataModelComponent } from "../../abstracts.js";
const { ArrayField, ObjectField } = foundry.data.fields;
export default class EmbeddedSkillsData extends DataModelComponent {
  static defineSchema() {
    return {
      counters: new ArrayField(new ObjectField(), { initial: [] }),
      embeddedSkills: new ArrayField(new ObjectField(), { initial: [] }),
    };
  }
}
