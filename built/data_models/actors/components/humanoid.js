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
            heartRate: new SchemaField({
                value: new NumberField({ initial: 60, integer: true, min: 0, required: true }),
                min: new SchemaField({
                    value: new NumberField({ initial: 0, integer: true, min: 0 }),
                    status: new NumberField({ initial: 0, integer: true, min: 0 }),
                    baseline: new NumberField({ initial: 60, integer: true, min: 0 }),
                }),
                max: new SchemaField({
                    value: new NumberField({ initial: 195, integer: true, min: 0 }),
                    status: new NumberField({ initial: 0, integer: true, min: 0 }),
                    baseline: new NumberField({ initial: 195, integer: true, min: 0 }),
                }),
                damageThreshold: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
            }),
            nativeLanguage: new StringField({ initial: "Standard" }),
        };
    }
    // Heartrate  related
    get hrZone1() { return 5 * Math.floor(this.heartRate.max.value * 75 / 500); }
    get hrZone2() { return 5 * Math.floor(this.heartRate.max.value * 90 / 500); }
    getHRZone(hr = undefined) {
        hr = hr ? hr : this.heartRate.value;
        if (hr < this.hrZone1)
            return 1;
        if (hr < this.hrZone2)
            return 2;
        return 3;
    }
    getHrChangeFromStrain(strain) {
        const zone = this.getHRZone();
        if (strain < zone)
            return 2 * (strain - zone);
        return 4 * (strain - zone + 1);
    }
    // Rest related
    shortRest() { this._rest("1d3 % 2", "1d3-1", "short rest"); }
    longRest() { this._rest("2d3kh", "2d6 / 2", "long rest"); }
    async _rest(coagulationDice, healingDice, type) {
        let accHealing = 0;
        let accCoagulation = 0;
        const newWounds = [];
        for (const wound of this.wounds) {
            if (wound.bleeding > 0) {
                const coagulationRoll = await new Roll(coagulationDice).evaluate();
                const coagulation = Math.floor(coagulationRoll.total);
                accCoagulation += Math.min(coagulation, wound.bleeding);
                if (wound.damage == 0 && wound.bleeding <= coagulation)
                    continue;
                wound.bleeding = Math.max(wound.bleeding - coagulation, 0);
            }
            else {
                const healingRoll = await new Roll(healingDice).evaluate();
                const healing = Math.floor(healingRoll.total);
                accHealing += Math.min(healing, wound.damage);
                if (wound.damage <= healing)
                    continue;
                wound.damage = Math.max(wound.damage - healing, 0);
            }
            newWounds.push(wound);
        }
        this.parent.update({
            "system.health.value": Math.min(this.health.max.value, this.health.value + accHealing),
            "system.heartRate.value": this.heartRate.min.value,
            "system.wounds": newWounds
        });
        ChatServer.transmitEvent(type, { healing: accHealing, coagulation: accCoagulation });
    }
}
