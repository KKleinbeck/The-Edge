import THE_EDGE from "../../../modules/system/config-the-edge.js";
import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, NumberField, ObjectField, SchemaField } = foundry.data.fields;

export default class StatusEffectData extends DataModelComponent {
  static defineSchema() {
    return {
      generalModifiers: new SchemaField({
        "painThreshold": new NumberField({ initial: 0, integer: true, required: true }),
        "overloadThreshold": new NumberField({ initial: 0, integer: true, required: true }),
        "bloodlossThreshold": new NumberField({ initial: 0, integer: true, required: true }),
        "bloodlossStepSize": new NumberField({ initial: 0, integer: true, required: true })
      })
    };
  }

  get overloadLevel() {
    const weight = this.parent.itemWeight - this.generalModifiers.overloadThreshold;
    const str = this.attributes.str.advances;
    if (str <= 0) return 0;

    return Math.max(
      Math.ceil((weight - 1.5 * str) / (0.5 * str)),
      0
    );
  }

  get weightTillNextOverload() {
    const weight = this.parent.itemWeight - this.generalModifiers.overloadThreshold;
    const str = this.attributes.str.advances;
    if (str <= 0) return Infinity;

    return str * (1.5 + 0.5 * this.overloadLevel) - weight;
  }

  get strainLevel() { return this.getHRZone() - 1; }

  get painLevel() {
    const res = 2 * this.attributes.res.value;
    if (res <= 0) return 0; // We can't possibly do something sensible at the moment
    const damageTotal = Math.max(
      this.health.max.value - this.health.value - this.generalModifiers.painThreshold,
      0
    );
    return Math.floor(damageTotal / res);
  }

  get damageBodyPartLevels() {
    const damageBodyParts = {arms: 0, legs: 0, torso: 0, head: 0};
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

  // async updateBloodloss() {
  //   let res = this.system.attributes.res.advances + this.system.attributes.res.status;
  //   let currentBloodLoss = this._getEffect("Vertigo");
  //   if (currentBloodLoss) res -= currentBloodLoss?.system?.effects[0].value || 0;
  //   if (res <= 1) return; // Cannot possibly do sensible things right now

  //   const bloodloss = this.system.bloodLoss.value;
  //   const statusThreshold = this.system.statusEffects.bloodlossThreshold.status;
  //   const bloodlossEff = Math.max(bloodloss - statusThreshold - res + 1, 0);
  //   const stepSize = this.system.statusEffects.bloodlossStepSize.status + Math.floor(res / 2);
  //   const level = Math.ceil(bloodlossEff / stepSize) + this.system.statusEffects.vertigo.status;
  //   if (level == 0) {
  //     await this._deleteEffect("Vertigo");
  //     return;
  //   }

  //   if (!currentBloodLoss) currentBloodLoss = await this._getEffectOrCreate("Vertigo");
  //   if (currentBloodLoss.system.effects[0].value != -level) {
  //     await currentBloodLoss.update({"system.effects": [
  //       {group: "attributes", name: "mental", value: -level},
  //     ], "system.statusEffect": true, "system.gm_description": `${level}`})
  //   }
  // }
  
  get statusEffects() {
    const statusEffectTemplate = [
      {
        nameID: "Overload", level: this.overloadLevel,
        modFunction: THE_EDGE.overloadModifiers
      },
      {
        nameID: "Strain", level: this.strainLevel,
        modFunction: THE_EDGE.strainModifiers
      },
      {
        nameID: "Pain", level: this.painLevel,
        modFunction: THE_EDGE.painModifiers
      },
    ]
    for (const [bodyPart, level] of Object.entries(this.damageBodyPartLevels)) {
      statusEffectTemplate.push({
        nameID: `Injuries ${bodyPart}`, level: level,
        modFunction: (x) => THE_EDGE.damageBodyPartModifiers(bodyPart, x)
      })
    }

    const statusEffects = [];
    for (const {nameID, level, modFunction} of statusEffectTemplate) {
      if (level) {
        statusEffects.push({
          name: LocalisationServer.localise(nameID, "Effect_Group"),
          level: level, modifiers: modFunction(level)
        });
      }
    }

    return statusEffects;
  }
}
