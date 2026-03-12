import THE_EDGE from "../../../modules/system/config-the-edge.js";
import ValueSchemaField from "../../Fields/value_schema.js";
import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField } = foundry.data.fields;

function WEAPON_FIELD() {
  return new ValueSchemaField({
    status: new NumberField({ initial: 0 }),
    advances: new NumberField({ initial: 0 }),
  });
}

export default class WeaponData extends DataModelComponent {
  static defineSchema() {
    return {
      weapons: new SchemaField({
        "general": new SchemaField({
          "General weapon proficiency": WEAPON_FIELD(),
          "Hand-to-Hand combat": WEAPON_FIELD(),
          "Recoilless Rifles": WEAPON_FIELD(),
        }),
        "energy": new SchemaField({
          "Blaster Pistols": WEAPON_FIELD(),
          "Pulse Rifle": WEAPON_FIELD(),
          "SABs": WEAPON_FIELD(),
          "Blaster Shockguns": WEAPON_FIELD(),
          "Blaster Snipers": WEAPON_FIELD(),
        }),
        "kinetic": new SchemaField({
          "Kinetic Pistols": WEAPON_FIELD(),
          "Slug Throwers": WEAPON_FIELD(),
          "LMGs": WEAPON_FIELD(),
          "Shotguns": WEAPON_FIELD(),
          "Projectile Snipers": WEAPON_FIELD(),
        })
      })
    };
  }

  getWeaponLevel(weaponType) {
    const type = THE_EDGE.weapon_damage_types[weaponType];
    let level = Math.floor((
      this.weapons[type][weaponType].value +
      this.weapons.general["General weapon proficiency"].value
    ) / 2);
    if (weaponType == "Hand-to-Hand combat") return level;

    const partner = THE_EDGE.weapon_partners[weaponType];
    if (partner) {
      const partnerType = THE_EDGE.weapon_damage_types[partner];
      level += Math.floor(this.weapons[partnerType][partner].value / 4);
    }
    return level;
  }

  async rollAttackCheck(dices, threshold, vantage, damageDice, _damageType) {
    const results = await this.parent.diceServer.attackCheck(
      dices, threshold, vantage, damageDice,
      Math.floor((this.weapons.general["General weapon proficiency"].value || 0) / 2)
    );
    return results;
  }
}
