import Aux from "../../system/auxilliaries.js";
import LocalisationServer from "../../system/localisation_server.js";
import THE_EDGE from "../../system/config-the-edge.js";
import { generateDataModelWithComponents } from "../abstracts.js";

import ActorEffectData from "./components/effects.js";
import AttributeData from "./components/attributes.js";
import CharacterBaseData from "./base_actor.js";
import CombatantData from "./components/combatant.js";
import CreditData from "./components/credits.js";
import HumanoidData from "./components/humanoid.js";
import ProficiencyData from "./components/proficiencies.js";
import StatusEffectData from "./components/status_effects.js";
import WeaponData from "./components/weapons.js";

const { expandObject, flattenObject, mergeObject } = foundry.utils;

const CharacterDataParent = generateDataModelWithComponents(
  ActorEffectData, AttributeData, CharacterBaseData, CombatantData,
  CreditData, HumanoidData, ProficiencyData, StatusEffectData, WeaponData
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

    this.strain.max.value = this.strain.max.baseline + this.strain.max.status +
      2 * this.strain.max.advances + this.attributes.end.value;
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

    const itemAndSkillEffects = [
      ...this.parent.getItemEffects(true).map(x => x.modifiers),
      ...this.parent.getSkillEffects(true).map(x => x.modifiers)
    ];
    for (const effect of itemAndSkillEffects) {
      for (const modifier of effect) {
        addToResult(THE_EDGE.effectMap[modifier.group][modifier.field], modifier.value);
      }
    }
    return activeModifiers;
  }

  // _updateCritDice(effect, critDice) {
  //   if (effect.name == "crit") {
  //     const index = critDice[effect.group].critFail.indexOf(effect.value);
  //     if (index > -1) {
  //       critDice[effect.group].critFail.splice(index, 1);
  //       return true;
  //     }
  //     critDice[effect.group].crit.push(effect.value)
  //     return true;
  //   } else if (effect.name == "critFail") {
  //     const index = critDice[effect.group].crit.indexOf(effect.value);
  //     if (index > -1) {
  //       critDice[effect.group].crit.splice(index, 1);
  //       return true;
  //     }
  //     critDice[effect.group].critFail.push(effect.value)
  //     return true;
  //   }
  //   return false;
  // }

  // Core Methods
  async advanceAttr(attrName, type) {
    const attrValue = this.attributes[attrName].advances;
    const newVal = attrValue + (type == "advance" ? 1 : -1);

    await this.changeCoreValue(`system.attributes.${attrName}.advances`, Math.max(newVal, 0));
  }

  coreValueChangeCost(coreName, newVal) {
    newVal = newVal ? +newVal : 0; // If empty / undefined
    if (!Number.isInteger(+newVal)) {return;}

    const oldVal = Aux.objectAt(this.parent, coreName);

    const isProfValued = coreName.includes("proficiencies") || coreName.includes("strain")
    const costFun = isProfValued ? THE_EDGE.profCost : THE_EDGE.attrCost;
    let cost = 0;
    if (newVal > oldVal) {
      for (let n = oldVal; n < newVal; n++) cost += costFun(n);
    } else {
      for (let n = newVal; n < oldVal; n++) cost -= costFun(n);
    }
    return cost;
  }

  async changeCoreValue(coreName, newVal) {
    newVal = newVal ? +newVal : 0; // If empty / undefined
    if (!Number.isInteger(+newVal)) {return;}

    const cost = this.coreValueChangeCost(coreName, newVal);
    const availablePH = this.PracticeHours.max - this.PracticeHours.used;
    const parts = coreName.split(".");
    if (cost > availablePH) {
      const msg = LocalisationServer.parsedLocalisation(
        "PH missing", "Notifications",
        {name: parts[parts.length - 2], level: newVal, need: cost, available: availablePH}
      )
      ui.notifications.notify(msg)
      return;
    }
    if (coreName.split(".")[1] === "weapons") {
      if (coreName.includes("Hand-to-Hand combat")) {
        if (newVal > this.combaticsGeneralPl) {
          const msg = LocalisationServer.parsedLocalisation(
            "Core Value combatics too small", "Notifications",
            {level: newVal, basic: this.combaticsGeneralPl}
          );
          ui.notifications.notify(msg);
          return;
        } 
      } else if (coreName.includes("General weapon proficiency")) { // Do nothing
      } else if (newVal > this.weapons.general["General weapon proficiency"].advances) {
        const msg = LocalisationServer.parsedLocalisation(
          "Core Value too small", "Notifications",
          {name: parts[parts.length - 2], level: newVal,
            basic: this.weapons.general["General weapon proficiency"].value}
        )
        ui.notifications.notify(msg)
        return;
      }
    }

    await this.parent.update({
      [coreName]: newVal, "system.PracticeHours.used": this.PracticeHours.used + cost
    })
  }

  // Combat related
  get combaticsGeneralPl() {
    return Math.floor((this.attributes.str.value + this.attributes.crd.value) / 2);
  }

  get combaticsPL() {
    const {crd, str} = this.attributes;
    const attr_mod = Math.floor((str.value + crd.value) / 4);
    const general = this.weapons.general;
    const level = Math.floor(
      (general["Hand-to-Hand combat"].value + general["General weapon proficiency"].value) / 2
    );

    return Math.max(level + attr_mod, 0);
  }

  getWeaponPlOfWeapon(weaponID) {
    const weapon = this.parent.items.get(weaponID).system;

    const level = this.getWeaponLevel(weapon.type);
    const attr_mod = Math.floor( (
      this.attributes[weapon.leadAttr1.name].value - weapon.leadAttr1.value +
      this.attributes[weapon.leadAttr2.name].value - weapon.leadAttr2.value
    ) / 4)

    return Math.max(level + attr_mod, 0)
  }
}