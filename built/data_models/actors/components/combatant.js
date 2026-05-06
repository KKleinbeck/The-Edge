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
            initiative: new SchemaField({
                status: new NumberField({ required: true, integer: true, initial: 0 }),
            }),
            strain: new SchemaField({
                value: new NumberField({ initial: 0, integer: true, min: 0, required: true }),
                max: new SchemaField({
                    advances: new NumberField({ initial: 0, integer: true, min: 0, required: true }),
                    baseline: new NumberField({ initial: 100, integer: true, min: 0 }),
                    status: new NumberField({ initial: 0, integer: true, min: 0 }),
                    value: new NumberField({ initial: 100, integer: true, min: 0 }),
                }),
                statusThreshold: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
                maxUseReduction: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
            }),
            movementSpeed: new SchemaField({ status: new NumberField({ initial: 0, integer: true }) }),
            wounds: new ArrayField(new ObjectField(), { initial: [] })
        };
    }
    get strideSpeed() {
        const { spd, foc } = this.attributes;
        const status = Math.floor(this.movementSpeed.status);
        return status + Math.min(5 + Math.floor(spd.value / 6), Math.floor(foc.value * 0.75));
    }
    get runSpeed() {
        const { spd, foc } = this.attributes;
        const status = Math.floor(1.5 * this.movementSpeed.status);
        return status + Math.min(7 + Math.floor(spd.value / 3), Math.floor(foc.value * 1.25));
    }
    get sprintSpeed() {
        const { spd, foc } = this.attributes;
        const status = Math.floor(2 * this.movementSpeed.status);
        return status + Math.min(8 + Math.floor(spd.value / 1.5), Math.floor(foc.value * 1.75));
    }
    get strainLevels() {
        return [
            { value: Math.floor(0.2 * this.strain.max.value) + this.strain.statusThreshold.status, label: "L1" },
            { value: Math.floor(0.4 * this.strain.max.value) + this.strain.statusThreshold.status, label: "L2" },
            { value: Math.floor(0.6 * this.strain.max.value) + this.strain.statusThreshold.status, label: "L3" },
            { value: Math.floor(0.8 * this.strain.max.value) + this.strain.statusThreshold.status, label: "L4" },
        ];
    }
    deleteWound(index) {
        const update = {
            "system.health.value": Math.min(// Math.min relevant for wound generated while dying
            this.health.value + this.wounds[index].damage, this.health.max.value)
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
            const update = {};
            update["system.health.value"] = Math.max(health - damage, 0);
            if (health <= damage) { // Character starts or is dying
                const healthBuffer = Math.max(health, 0);
                update["system.strain.value"] = this.strain.value + damage - healthBuffer;
            }
            await this.parent.update(update);
            const bt = THE_EDGE.bleedingThreshold[damageType];
            woundDetails.bleeding = CombatantData._determineBleeding(damage, bt);
            woundDetails.source = damageType;
            await this.generateNewWound(woundDetails);
        }
        return protectionLog;
    }
    static _determineBleeding(damage, bleedingThreshold) {
        return Math.floor(damage / bleedingThreshold) +
            +((damage % bleedingThreshold) / bleedingThreshold < Math.random());
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
        const woundCountGuess = THE_EDGE.fallDamageWoundCount(height);
        const damageDetails = {
            damageRoll: THE_EDGE.fallDamageRoll(height),
            nWounds: Aux.randomInt(Math.ceil(woundCountGuess / 3), woundCountGuess),
            description: `${height}m`, location: location, height: height
        };
        await this._applyImpactOrFallDamage("fall", damageDetails);
    }
    async applyImpactDamage(speed, location) {
        const woundCountGuess = THE_EDGE.impactDamageWoundCount(speed);
        const damageDetails = {
            damageRoll: THE_EDGE.impactDamageRoll(speed),
            nWounds: Aux.randomInt(Math.ceil(woundCountGuess / 3), woundCountGuess),
            description: `${speed}m/s`, location: location, speed: speed
        };
        await this._applyImpactOrFallDamage("impact", damageDetails);
    }
    async _applyImpactOrFallDamage(type, details) {
        details.damage = Math.max(await DiceServer.genericRoll(details.damageRoll), 0);
        let damageRemaining = details.damage;
        const approxDamagePerWound = Math.ceil(details.damage / details.nWounds);
        const bt = THE_EDGE.bleedingThreshold[type];
        for (let i = 0; i < 2 * details.nWounds; i++) {
            const nextDamage = Math.min(damageRemaining, Math.floor(approxDamagePerWound / 2) + Aux.randomInt(1, approxDamagePerWound));
            const [bodyPart, coordinates] = Aux.generateWoundLocation(false, this.sex);
            const woundDetails = {
                bleeding: CombatantData._determineBleeding(damageRemaining, bt),
                bodyPart: bodyPart,
                coordinates: coordinates,
                damage: nextDamage,
                damageType: type,
                source: LocalisationServer.localise(`${type} damage title`) + " " + details.description
            };
            await this.generateNewWound(woundDetails);
            damageRemaining -= Math.ceil(nextDamage);
            if (damageRemaining <= 0)
                break;
        }
        // TODO: refactor to use this.applyDamage to handle death correctly
        this.parent.update({ "system.health.value": Math.max(this.health.value - details.damage, 0) });
        details.actor = this.parent.name;
        ChatServer.transmitEvent(type, details);
    }
    async generateNewWound(woundDetails) {
        const wound = {
            status: "treatable",
            type: Aux.pickFromOdds(THE_EDGE.wound_odds(woundDetails)),
            ...woundDetails
        };
        this.wounds.push(wound);
        await this.parent.update({ "system.wounds": this.wounds });
    }
    async applyStrain(strain) {
        const newValue = Math.clamp(this.strain.value + strain, 0, this.strain.max.value);
        const change = newValue - this.strain.value;
        await this.parent.update({ "system.strain.value": newValue });
        return change;
    }
    async applyCombatStrain() {
        if (this.health.value <= 0) {
            await this.parent.update({ "system.strain.value": Math.min(this.strain.value + THE_EDGE.dying.strainPerBR, this.strain.max.value) });
        }
        else {
            this.applyStrain(game.the_edge.combatLog.strainLog.reduce((acc, entry) => acc + entry.strainChange, 0) +
                game.the_edge.combatLog.getMovementStrainLog().reduce((acc, entry) => acc + entry.strainChange, 0));
        }
    }
}
