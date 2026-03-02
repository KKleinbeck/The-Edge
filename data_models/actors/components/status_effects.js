import THE_EDGE from "../../../modules/system/config-the-edge.js";
import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { NumberField, ObjectField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class StatusEffectData extends DataModelComponent {
  static SCHEMA = {
    statusEffects: new TypedObjectField(
      new ObjectField(), { initial: {} }
    ),
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
    const damageTotal = this.health.max.value - this.health.value -
      this.generalModifiers.painThreshold;
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
  
  addStatusEffectsToData(data) {
    const systemModification = foundry.utils.expandObject(data)?.system ?? {};
    // Operate on a copy of this datamodel to simulate data model after the update
    const tempDataModel = new this.constructor(this, {parent: this.parent});
    tempDataModel.updateSource(systemModification);

    const statusEffects = {};
    statusEffects.overload = {
      name: LocalisationServer.localise("Overload", "Effect_Group"),
      level: tempDataModel.overloadLevel,
      modifiers: THE_EDGE.overloadModifiers(tempDataModel.overloadLevel)
    };
    statusEffects.strain = {
      name: LocalisationServer.localise("Strain", "Effect_Group"),
      level: tempDataModel.strainLevel,
      modifiers: THE_EDGE.strainModifiers(tempDataModel.strainLevel)
    };
    statusEffects.pain = {
      name: LocalisationServer.localise("Pain", "Effect_Group"),
      level: tempDataModel.painLevel,
      modifiers: THE_EDGE.painModifiers(tempDataModel.painLevel)
    };
    for (const [bodyPart, level] of Object.entries(tempDataModel.damageBodyPartLevels)) {
      statusEffects[`injuries ${bodyPart}`] = {
        name: LocalisationServer.localise(`Injuries ${bodyPart}`, "Effect_Group"),
        level: level,
        modifiers: THE_EDGE.damageBodyPartModifiers(bodyPart, level)
      };
    }

    for (const [k, v] of Object.entries(foundry.utils.flattenObject(statusEffects))) {
      data[`system.statusEffects.${k}`] = v;
    }
  }
}
