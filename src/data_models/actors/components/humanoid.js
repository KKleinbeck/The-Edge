import { DataModelComponent } from "../../abstracts.js";
import ChatServer from "../../../system/chat_server.js";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class HumanoidData extends DataModelComponent {
  static defineSchema() {
    return {
      age: new NumberField({ initial: 21, integer: true, min: 0, required: true }),
      sex: new StringField({ initial: "female" }),
      handedness: new StringField({ initial: "right" }),
      race: new StringField({ initial: "Human" }),
      nativeLanguage: new StringField({ initial: "Standard"}),
    };
  }

  // Rest related
  shortRest() {this._rest("1d3 % 2", "1d3-1", "short rest")}
  longRest() {this._rest("2d3kh", "2d6 / 2", "long rest")}

  async _rest(coagulationDice, healingDice, type) {
    let accHealing = 0;
    let accCoagulation = 0;

    const newWounds = [];
    for (const wound of this.wounds) {
      if (wound.bleeding > 0) {
        const coagulationRoll = await new Roll(coagulationDice).evaluate()
        const coagulation = Math.floor(coagulationRoll.total);
        accCoagulation += Math.min(coagulation, wound.bleeding);
        if (wound.damage == 0 && wound.bleeding <= coagulation) continue;

        wound.bleeding = Math.max(wound.bleeding - coagulation, 0);
      } else {
        const healingRoll = await new Roll(healingDice).evaluate();
        const healing = Math.floor(healingRoll.total);
        accHealing += Math.min(healing, wound.damage);
        if (wound.damage <= healing) continue;

        wound.damage = Math.max(wound.damage - healing, 0);
      }
      newWounds.push(wound);
    }

    this.parent.update({
      "system.health.value": Math.min(this.health.max.value, this.health.value + accHealing),
      "system.wounds": newWounds
    });
    ChatServer.transmitEvent(
      type, {healing: accHealing, coagulation: accCoagulation}
    )
  }
}
