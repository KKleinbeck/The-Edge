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
        await this.parent.update({ "system.equipped": !this.equipped });
    }
    get modifiers() { return this.effect; }
}
