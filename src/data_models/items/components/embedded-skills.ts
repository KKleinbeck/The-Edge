import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, ObjectField } = foundry.data.fields;

export default class EmbeddedSkillsData extends DataModelComponent {
  declare equipped: boolean;
  declare effect: IModifier[];

  static defineSchema(): Record<string, foundryAny> {
    return {
      counters: new ArrayField(new ObjectField(), { initial: [] }),
      embeddedSkills: new ArrayField(new ObjectField(), { initial: [] }),
    };
  }
}
