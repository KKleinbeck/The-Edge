import { DataModelComponent } from "../../abstracts.js";
import ChatServer from "../../../system/chat_server.js";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class HumanoidData extends DataModelComponent {
  static defineSchema() {
    return {
      age: new NumberField({ initial: 21, integer: true, min: 0, required: true }),
      sex: new StringField({ initial: "female" }),
      bloodType: new StringField({ initial: "AB" }),
      handedness: new StringField({ initial: "right" }),
      race: new StringField({ initial: "Human" }),
      heartRate: new SchemaField({
        value: new NumberField({ initial: 60, integer: true, min: 0, required: true }),
        min: new SchemaField({
          value: new NumberField({ initial: 0, integer: true, min: 0 }),
          status: new NumberField({ initial: 0, integer: true, min: 0 }),
          baseline : new NumberField({ initial: 60, integer: true, min: 0 }),
        }),
        max: new SchemaField({
          value: new NumberField({ initial: 195, integer: true, min: 0 }),
          status: new NumberField({ initial: 0, integer: true, min: 0 }),
          baseline : new NumberField({ initial: 195, integer: true, min: 0 }),
        }),
        damageThreshold: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
      }),
      nativeLanguage: new StringField({ initial: "Standard"}),
    };
  }

  // Heartrate  related
  get hrZone1() {return 5 * Math.floor(this.heartRate.max.value * 75 / 500)}
  get hrZone2() {return 5 * Math.floor(this.heartRate.max.value * 90 / 500)}

  getHRZone(hr = undefined) {
    hr = hr ? hr : this.heartRate.value;
    if (hr < this.hrZone1) return 1;
    if (hr < this.hrZone2) return 2;
    return 3;
  }

  getHrChangeFromStrain(strain) {
    const zone = this.getHRZone();
    if (strain < zone) return 2 * (strain - zone);
    return 4 * (strain - zone + 1);
  }

  async applyStrains(strains) { // TODO: yeet
    const hr = this.heartRate;
    const isRest = Math.max(...strains) <= 0;
    const threshold = isRest ? hr.min.value : hr.max.value;
    const clamper = isRest ? Math.max : Math.min;

    let hrChange = isRest ? strains.sum() : strains.filter(x => x >= 0).sum();
    const hrNew = clamper(hr.value + hrChange, threshold);
    hrChange = hrNew - hr.value;
    await this.parent.update({"system.heartRate.value": hrNew});

    return hrChange;
  }

  // Rest related
  shortRest() {this._rest("1d3 % 2", "1d3-1", "0", "short rest")}
  longRest() {this._rest("2d3kh", "2d6 / 2", "1d3-1", "long rest")}

  async _rest(coagulationDice, healingDice, bloodRegenDice, type) {
    const wounds = this.parent.itemTypes["Wounds"];
    let accHealing = 0;
    let accCoagulation = 0;
    let remainingBleeding = 0;
    for (const wound of wounds) {
      if (wound.system.bleeding > 0) {
        const coagulationRoll = await new Roll(coagulationDice).evaluate()
        const coagulation = Math.floor(coagulationRoll.total);
        if (wound.system.damage == 0 && wound.system.bleeding <= coagulation) {
          accCoagulation += wound.system.bleeding;
          wound.delete();
        } else if (coagulation > 0) {
          accCoagulation += Math.min(coagulation, wound.system.bleeding);
          const newBleeding = Math.max(wound.system.bleeding - coagulation, 0);
          wound.update({"system.bleeding": newBleeding});
          remainingBleeding += newBleeding;
        }
      } else {
        const healingRoll = await new Roll(healingDice).evaluate();
        const healing = Math.floor(healingRoll.total);
        if (wound.system.damage <= healing) {
          accHealing += wound.system.damage;
          wound.delete();
        } else if (healing > 0) {
          accHealing += Math.min(healing, wound.system.damage)
          wound.update({"system.damage": Math.max(wound.system.damage - healing, 0)});
        }
      }
    }

    const bloodRegenRoll = await new Roll(bloodRegenDice).evaluate();
    const bloodRegen = Math.min(this.bloodLoss.value, bloodRegenRoll.total - remainingBleeding);
    this.parent.update({
      "system.health.value": Math.min(this.health.max.max, this.health.value + accHealing),
      "system.heartRate.value": this.heartRate.min.value,
      "system.bloodLoss.value": this.bloodLoss.value - bloodRegen
    });
    ChatServer.transmitEvent(
      type, {healing: accHealing, coagulation: accCoagulation, bloodRegen: bloodRegen}
    )
  }
}
