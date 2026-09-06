import { DataModelComponent } from "../../abstracts.js";
const { ArrayField, BooleanField, ObjectField } = foundry.data.fields;
export default class EquipableData extends DataModelComponent {
  static defineSchema() {
    return {
      equipped: new BooleanField({ initial: false }),
      effect: new ArrayField(new ObjectField(), { initial: [] }),
    };
  }
  async toggleEquipped() {
    const newValue = !this.equipped;
    await this.parent.update({ "system.equipped": newValue });
    return newValue;
  }
  get modifiers() {
    return this.effect;
  }
}
