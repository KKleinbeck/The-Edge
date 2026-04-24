import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, BooleanField, NumberField, ObjectField, StringField } = foundry.data.fields;

export default class SkillTemplateData extends DataModelComponent {
  static defineSchema() {
    return {
      effects: new ArrayField(
        new ArrayField(new ObjectField(), { initial: [] }),
        { initial: [[]] }
      ),
      requirements: new ArrayField(
        new ArrayField(new ObjectField(), { initial: [] }),
        { initial: [[]] }
      ),
      level: new NumberField({ initial: 1, integer: true, positive: true }),
      maxLevel: new NumberField({ initial: 1, integer: true, positive: true }),
      active: new BooleanField({ initial: true }),
      cost: new StringField({ initial: "0" })
    };
  }

  async toggleActive(options = {}) {
    await this.parent.update({"system.active": !this.active}, options);
  }

  get modifiers() {
    return this.effects.slice(0, this.level)
      .reduce((a, b) => [...a, ...b], []);
  }
}