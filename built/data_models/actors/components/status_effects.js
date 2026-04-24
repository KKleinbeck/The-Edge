import THE_EDGE from "../../../system/config-the-edge.js";
import LocalisationServer from "../../../system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";
const { NumberField, SchemaField } = foundry.data.fields;
export default class StatusEffectData extends DataModelComponent {
    static defineSchema() {
        return {
            generalModifiers: new SchemaField({
                "painThreshold": new NumberField({ initial: 0, integer: true, required: true }),
                "overloadThreshold": new NumberField({ initial: 0, integer: true, required: true }),
            })
        };
    }
    get overloadLevel() {
        const weight = this.parent.itemWeight - this.generalModifiers.overloadThreshold;
        const str = this.attributes.str.advances;
        if (str <= 0)
            return 0;
        return Math.max(Math.ceil((weight - 1.5 * str) / (0.5 * str)), 0);
    }
    get weightTillNextOverload() {
        const weight = this.parent.itemWeight - this.generalModifiers.overloadThreshold;
        const str = this.attributes.str.advances;
        if (str <= 0)
            return Infinity;
        return str * (1.5 + 0.5 * this.overloadLevel) - weight;
    }
    get strainLevel() {
        const levelIndex = this.strainLevels.map(x => x.value).findIndex(x => x > this.strain.value);
        return levelIndex == -1 ? 4 : levelIndex;
    }
    get painLevel() {
        const res = 2 * this.attributes.res.value;
        if (res <= 0)
            return 0; // We can't possibly do something sensible at the moment
        const damageTotal = Math.max(this.health.max.value - this.health.value - this.generalModifiers.painThreshold, 0);
        return Math.floor(damageTotal / res);
    }
    get damageBodyPartLevels() {
        const damageBodyParts = { arms: 0, legs: 0, torso: 0, head: 0 };
        for (const wound of this.wounds) {
            switch (wound.bodyPart) {
                case "Torso":
                    damageBodyParts.torso += wound.damage;
                    break;
                case "Head":
                    damageBodyParts.head += wound.damage;
                    break;
                case "LegsLeft":
                case "LegsRight":
                    damageBodyParts.legs += wound.damage;
                    break;
                case "ArmsLeft":
                case "ArmsRight":
                    damageBodyParts.arms += wound.damage;
            }
        }
        const res = 2 * this.attributes.res.value;
        for (const [bodyPart, damage] of Object.entries(damageBodyParts)) {
            damageBodyParts[bodyPart] = res <= 0 ? 0 : Math.floor(damage / res);
        }
        return damageBodyParts;
    }
    get isDying() { return this.health.value <= 0; }
    static dyingModifiers() {
        return [{
                group: "generalModifiers", field: "strain - max",
                value: THE_EDGE.dying.maxStrainBuffer + this.strain.max.advances
            }];
    }
    get statusEffects() {
        const statusEffectTemplate = [
            {
                nameID: "Overload", isActive: this.overloadLevel,
                modFunction: THE_EDGE.overloadModifiers
            },
            {
                nameID: "Strain", isActive: this.strainLevel,
                modFunction: THE_EDGE.strainModifiers
            },
            {
                nameID: "Pain", isActive: this.painLevel,
                modFunction: THE_EDGE.painModifiers
            },
            {
                nameID: "Dying", isActive: this.isDying,
                modFunction: StatusEffectData.dyingModifiers
            }
        ];
        for (const [bodyPart, level] of Object.entries(this.damageBodyPartLevels)) {
            statusEffectTemplate.push({
                nameID: `Injuries ${bodyPart}`, isActive: level,
                modFunction: (x) => THE_EDGE.damageBodyPartModifiers(bodyPart, x)
            });
        }
        const statusEffects = [];
        for (const { nameID, isActive, modFunction } of statusEffectTemplate) {
            if (isActive) {
                const level = typeof isActive === "number" ? isActive : undefined;
                statusEffects.push({
                    name: LocalisationServer.localise(nameID, "Effect_Group"),
                    level: level, modifiers: modFunction.call(this, level)
                });
            }
        }
        return statusEffects;
    }
}
