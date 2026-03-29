import Aux from "../../../system/auxilliaries.js";
import THE_EDGE from "../../../system/config-the-edge.js";
import ChatServer from "../../../system/chat_server.js";
import DiceServer from "../../../system/dice_server.js";
import LocalisationServer from "../../../system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";
const { ArrayField, NumberField, ObjectField, SchemaField } = foundry.data.fields;
export default class CombatantData extends DataModelComponent {
    static defineSchema() {
        return {
            health: new SchemaField({
                value: new NumberField({ required: true, integer: true, min: 0, initial: 100 }),
                max: new SchemaField({
                    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                    baseline: new NumberField({ required: true, integer: true, min: 0, initial: 100 }),
                    status: new NumberField({ required: true, integer: true, initial: 0 }),
                })
            }),
            strain: new SchemaField({
                value: new NumberField({ initial: 0, integer: true, min: 0, required: true }),
                max: new SchemaField({
                    value: new NumberField({ initial: 100, integer: true, min: 0 }),
                    status: new NumberField({ initial: 0, integer: true, min: 0 }),
                    baseline: new NumberField({ initial: 100, integer: true, min: 0 }),
                }),
                strainThreshold: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
                maxUseReduction: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
            }),
            wounds: new ArrayField(new ObjectField(), { initial: [] })
        };
    }
    deleteWound(index) {
        const update = {
            "system.health.value": this.health.value + this.wounds[index].damage
        };
        this.wounds.splice(index, 1);
        update["system.wounds"] = this.wounds;
        this.parent.update(update);
    }
    async applyDamage(damage, crit, penetration, damageType, name, givenLocation = undefined) {
        const woundDetails = { source: name, damageType: damageType };
        [woundDetails.bodyPart, woundDetails.coordinates] = Aux.generateWoundLocation(crit, this.sex, givenLocation);
        let protectionLog = {};
        [protectionLog, damage] = await this._determineArmourProtection(damage, penetration, damageType, woundDetails.bodyPart);
        woundDetails.damage = damage;
        if (damage > 0) {
            const health = this.health.value;
            const heartRate = this.heartRate;
            const update = {};
            update["system.health.value"] = Math.max(health - damage, 0);
            const hrChange = Math.max(damage - this.heartRate.damageThreshold.status, 0);
            if (health > damage) { // increase heartrate upon damage
                update["system.heartRate.value"] = Math.min(heartRate.value + hrChange, heartRate.max.value);
            }
            else if (health > 0) { // Dying damage
                update["system.heartRate.value"] = Math.max(heartRate.max.value - (hrChange - health), 0);
            }
            else { // bleeding out
                update["system.heartRate.value"] = Math.max(heartRate.value - hrChange, 0);
            }
            await this.parent.update(update);
            const bt = THE_EDGE.bleeding_threshold[damageType];
            woundDetails.bleeding = Math.floor(damage / bt) + ((damage % bt) / bt < Math.random());
            await this.generateNewWound(damageType, woundDetails);
        }
        return protectionLog;
    }
    async _determineArmourProtection(damage, penetration, damageType, location) {
        const protectionLog = {};
        let runningPenetration = penetration;
        for (const armour of this.parent.itemTypes["Armour"]) {
            if (!armour.system.equipped || armour.system.layer == "Outer")
                continue;
            [damage, runningPenetration] = await armour.system.protect(damage, runningPenetration, damageType, location, protectionLog);
        }
        if (runningPenetration != penetration) {
            protectionLog[LocalisationServer.localise("Armour penetration", "Combat")] =
                penetration - runningPenetration;
        }
        return [protectionLog, damage];
    }
    async applyFallDamage(height, location) {
        const woundCountGuess = THE_EDGE.fallDamageWoundCount(speed);
        const damageDetails = {
            damageRoll: THE_EDGE.fallDamageRoll(height),
            nWounds: Aux.randomInt(Math.ceil(woundCountGuess / 3), woundCountGuess),
            description: `${height}m`, location, location, height: height
        };
        await this._applyImpactOrFallDamage("fall", damageDetails);
    }
    async applyImpactDamage(speed, location) {
        const woundCountGuess = THE_EDGE.impactDamageWoundCount(speed);
        const damageDetails = {
            damageRoll: THE_EDGE.impactDamageRoll(speed),
            nWounds: Aux.randomInt(Math.ceil(woundCountGuess / 3), woundCountGuess),
            description: `${speed}m/s`, location, location, speed: speed
        };
        await this._applyImpactOrFallDamage("impact", damageDetails);
    }
    async _applyImpactOrFallDamage(type, details) {
        details.damage = Math.max(await DiceServer.genericRoll(details.damageRoll), 0);
        let damageRemaining = details.damage;
        const approxDamagePerWound = Math.ceil(details.damage / details.nWounds);
        for (let i = 0; i < 2 * details.nWounds; i++) {
            const nextDamage = Math.min(damageRemaining, Math.floor(approxDamagePerWound / 2) + Aux.randomInt(1, approxDamagePerWound));
            await this.applyDamage(nextDamage, false, 0, type, LocalisationServer.localise(`${type} damage title`) + " " + details.description, details.location);
            damageRemaining -= Math.ceil(nextDamage);
            if (damageRemaining <= 0)
                break;
            break;
        }
        details.actor = this.namel;
        ChatServer.transmitEvent(type, details);
    }
    async generateNewWound(source, woundDetails) {
        const wound = { source: source, status: "treatable", ...woundDetails };
        wound.type = Aux.pickFromOdds(THE_EDGE.wound_odds(woundDetails));
        this.wounds.push(wound);
        await this.parent.update({ "system.wounds": this.wounds });
    }
}
