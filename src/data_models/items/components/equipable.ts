import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, BooleanField, ObjectField } = foundry.data.fields;

export default class EquipableData extends DataModelComponent {
  declare equipped: boolean;
  declare effect: IModifier[];

  static defineSchema(): Record<string, foundryAny> {
    return {
      equipped: new BooleanField({ initial: false }),
      effect: new ArrayField(new ObjectField(), { initial: [] }),
    };
  }

  async toggleEquipped(): Promise<boolean> {
    const newValue = !this.equipped;
    await this.parent.update({ "system.equipped": newValue });
    return newValue;
  }

  get modifiers(): IModifier[] {
    return this.effect;
  }
}
