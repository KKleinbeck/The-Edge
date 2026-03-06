import THE_EDGE from "../../../modules/system/config-the-edge.js";
import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, NumberField, ObjectField, SchemaField } = foundry.data.fields;

export default class StatusEffectData extends DataModelComponent {
  static SCHEMA = {
    // statusEffects: new ArrayField(
      // new ObjectField(), { initial: [] }
    // ),
    generalModifiers: new SchemaField({
      // "injuries arms": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "injuries head": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "injuries legs": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "injuries torso": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "pain": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "overload": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      // "vertigo": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "painThreshold": new NumberField({ initial: 0, integer: true, required: true }),
      "overloadThreshold": new NumberField({ initial: 0, integer: true, required: true }),
      "bloodlossThreshold": new NumberField({ initial: 0, integer: true, required: true }),
      "bloodlossStepSize": new NumberField({ initial: 0, integer: true, required: true })
    })
  }

  get overloadLevel() {
    const weight = this.parent.itemWeight - this.generalModifiers.overloadThreshold.status;
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
    for (const wound of this.parent.itemTypes["Wounds"]) {
      if (!wound.system.active) continue;
      switch (wound.system.bodyPart) {
        case "Torso":
          damageBodyParts.torso += wound.system.damage;
          break;
        case "Head":
          damageBodyParts.head += wound.system.damage;
          break;
        case "LegsLeft":
        case "LegsRight":
          damageBodyParts.legs += wound.system.damage;
          break;
        case "ArmsLeft":
        case "ArmsRight":
          damageBodyParts.arms += wound.system.damage;
      }
    }

    const res = 2 * this.attributes.res.value;
    for (const [bodyPart, damage] of Object.entries(damageBodyParts)) {
      damageBodyParts[bodyPart] = res <= 0 ? 0 : Math.floor(damage / res);
    }
    return damageBodyParts;
  }
  
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
