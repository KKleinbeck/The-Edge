import { generateDataModelWithComponents } from "../abstracts.js";
import { ArmourItemTheEdge } from "../../modules/items/item.js";
import Aux from "../../modules/system/auxilliaries.js";
import ChatServer from "../../modules/system/chat_server.js";
import DiceServer from "../../modules/system/dice_server.js";
import LocalisationServer from "../../modules/system/localisation_server.js";
import THE_EDGE from "../../modules/system/config-the-edge.js";

import ActorEffectData from "./components/effects.js";
import AttributeData from "./components/attributes.js";
import CharacterBaseData from "../base_actor.js";
import HumanoidData from "./components/humanoid.js";
import ProficiencyData from "./components/proficiencies.js";
import StatusEffectData from "./components/status_effects.js";
import WeaponData from "./components/weapons.js";

const { expandObject, flattenObject, mergeObject } = foundry.utils;

const CharacterDataParent = generateDataModelWithComponents(
  ActorEffectData, AttributeData, CharacterBaseData, HumanoidData,
  ProficiencyData, StatusEffectData, WeaponData
)
export default class CharacterData extends CharacterDataParent {
  static defineSchema() {
    const schema = super.defineSchema()
    return schema;
  }

  // Fixing relations
  _initialize(options={}) {
    super._initialize(options);

    this.health.max.value = this.health.max.baseline + this.health.max.status +
      this.attributes.str.advances +
      Math.floor((this.attributes.end.advances + this.attributes.res.advances) / 2);

    this.heartRate.max.value = this.heartRate.max.baseline + this.heartRate.max.status +
      this.attributes.end.value - 2 * Math.floor((this.age - 21) / 3) - this.bloodLoss.value;
    this.heartRate.min.value = Math.max(
      20, this.heartRate.min.baseline + this.heartRate.min.status - this.attributes.end.value);
  }

  // General Hooks
  onUpdate(data) {
    // Get a the current set of modifiers, so that status effects have up to date attributes
    const preliminaryModifiers = this._modifiers;

    // Operate on a copy of this datamodel to simulate data model after the update
    foundry.utils.mergeObject(preliminaryModifiers, data);
    const systemModification = expandObject(preliminaryModifiers)?.system ?? {};
    const tempDataModel = new this.constructor(this, {parent: this.parent});
    tempDataModel.updateSource(systemModification);

    // Based on the simulated update, get the proper update
    const activeModifiers = tempDataModel._modifiers;
    mergeObject(data, activeModifiers);
  }
  
  get _modifiers() {
    const activeModifiers = {};
    for (const modifierList of Object.values(flattenObject(THE_EDGE.effectMap))) {
      for (const modifier of modifierList) {
        activeModifiers[modifier] = 0; // Resets all modifiers
      }
    }

    function addToResult(keys, value) { // Helper Function
      for (const key of keys) {
        if (!(key in activeModifiers)) activeModifiers[key] = 0;
        activeModifiers[key] += value;
      }
    }

    for (const [_, details] of Object.entries(this.effects)) {
      if (!details.active) continue;
      for (const modifier of details.modifiers) {
        addToResult(THE_EDGE.effectMap[modifier.group][modifier.field], modifier.value);
      }
    }
    for (const [_, details] of Object.entries(this.statusEffects)) {
      for (const modifier of details.modifiers) {
        addToResult(THE_EDGE.effectMap[modifier.group][modifier.field], modifier.value);
      }
    }
    return activeModifiers;
  }

  _updateCritDice(effect, critDice) {
    if (effect.name == "crit") {
      const index = critDice[effect.group].critFail.indexOf(effect.value);
      if (index > -1) {
        critDice[effect.group].critFail.splice(index, 1);
        return true;
      }
      critDice[effect.group].crit.push(effect.value)
      return true;
    } else if (effect.name == "critFail") {
      const index = critDice[effect.group].crit.indexOf(effect.value);
      if (index > -1) {
        critDice[effect.group].crit.splice(index, 1);
        return true;
      }
      critDice[effect.group].critFail.push(effect.value)
      return true;
    }
    return false;
  }

  // Damage Related
  async applyDamage(damage, crit, penetration, damageType, name, givenLocation = undefined) {
    const [location, locationCoord] = Aux.generateWoundLocation(crit, this.sex, givenLocation)

    const protectionLog = {};
    let runningPenetration = penetration;
    for (const armour of this.parent.itemTypes["Armour"]) {
      if(!armour.system.equipped || armour.system.layer == "Outer") continue;
      [damage, runningPenetration] = await ArmourItemTheEdge.protect.call(
        armour, damage, runningPenetration, damageType, location, protectionLog
      );
    }
      
    if (runningPenetration != penetration) {
      protectionLog[LocalisationServer.localise("Armour penetration", "Combat")] =
        penetration - runningPenetration;
    }

    if (damage > 0) {
      const health = this.health.value;
      const heartRate = this.heartRate;
      const update = {};
      update["system.health.value"] = Math.max(health - damage, 0)
      const hrChange = Math.max(damage - this.heartRate.damageThreshold.status, 0);
      if (health > damage) { // increase heartrate upon damage
        update["system.heartRate.value"] = Math.min(heartRate.value + hrChange, heartRate.max.value)
      } else if (health > 0) { // Dying damage
        update["system.heartRate.value"] = Math.max(heartRate.max.value - (hrChange - health), 0)
      } else { // bleeding out
        update["system.heartRate.value"] = Math.max(heartRate.value - hrChange, 0)
      }
      await this.parent.update(update)

      const bt = THE_EDGE.bleeding_threshold[damageType];
      const bleeding = Math.floor(damage / bt) + ((damage % bt) / bt < Math.random());

      await this.parent.generateNewWound(name, location, locationCoord, damage, bleeding, damageType);
    }

    return protectionLog;
  }

  async applyFallDamage(height, location) {
    const damageRoll = `${height}d12 + ${4*height-22}`;
    const damage = Math.max((await DiceServer.genericRoll(damageRoll)), 0);
    const nWounds = Math.floor(height / 2);
    await this._applyImpactOrFallDamage(nWounds, damage, "fall", `${height}m`, location)
    ChatServer.transmitEvent("fall", {actor: this.name, height: height, damage: damage, damageRoll: damageRoll});
  }

  async applyImpactDamage(speed, location) {
    const damageRoll = `${speed}d${speed}+${speed-30}`;
    const damage = Math.max((await DiceServer.genericRoll(damageRoll)), 0);
    const nWounds = Math.floor(speed / 3);
    await this._applyImpactOrFallDamage(nWounds, damage, "impact", `${speed}m/s`, location)
    ChatServer.transmitEvent("impact", {actor: this.name, speed: speed, damage: damage, damageRoll: damageRoll});
  }

  async _applyImpactOrFallDamage(nWounds, damage, damageType, description, location = undefined) {
    const nApproxWounds = Aux.randomInt(Math.ceil(nWounds/3), nWounds);
    const approxIncr = Math.ceil(damage / nApproxWounds)
    for (let i = 0; i < 2*nApproxWounds; i++) {
      const nextDamage = Math.min(damage, Math.floor(approxIncr / 2) + Aux.randomInt(1, approxIncr));
      await this.applyDamage(
        nextDamage, false, 0, damageType,
        LocalisationServer.localise(`${damageType} damage title`) + " " + description,
        location
      );
      damage -= Math.ceil(nextDamage);
      if (damage <= 0) break;
    }
  }

  // Combat related
  get combaticsPL() {
    const {crd, str} = this.attributes;
    const attr_mod = Math.floor((str.value + crd.value) / 4);
    const general = this.weapons.general;
    const level = Math.floor(
      (general["Hand-to-Hand combat"].value + general["General weapon proficiency"].value) / 2
    );

    return Math.max(level + attr_mod, 0);
  }

  getWeaponPL(weaponID) {
    const weapon = this.parent.items.get(weaponID).system;

    const level = this.getWeaponLevel(weapon.type);
    const attr_mod = Math.floor( (
      this.attributes[weapon.leadAttr1.name].value - weapon.leadAttr1.value +
      this.attributes[weapon.leadAttr2.name].value - weapon.leadAttr2.value
    ) / 4)

    return Math.max(level + attr_mod, 0)
  }
}