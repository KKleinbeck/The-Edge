import { generateDataModelWithComponents } from "../abstracts.js";
import { ArmourItemTheEdge } from "../../modules/items/item.js";
import Aux from "../../modules/system/auxilliaries.js";
import ChatServer from "../../modules/system/chat_server.js";
import DiceServer from "../../modules/system/dice_server.js";
import LocalisationServer from "../../modules/system/localisation_server.js";
import THE_EDGE from "../../modules/system/config-the-edge.js";

import AttributeData from "./components/attributes.js";
import CharacterBaseData from "../base_actor.js";
import HumanoidData from "./components/humanoid.js";
import ProficiencyData from "./components/proficiencies.js";
import StatusEffectData from "./components/status_effects.js";
import WeaponData from "./components/weapons.js";

const CharacterDataParent = generateDataModelWithComponents(
  AttributeData, CharacterBaseData, HumanoidData, ProficiencyData, StatusEffectData, WeaponData
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