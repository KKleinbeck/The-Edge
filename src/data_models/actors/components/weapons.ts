import THE_EDGE from "../../../system/config-the-edge.js";
import DiceServer from "../../../system/dice_server.js";
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
  declare weapons: IWeapons

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

  getWeaponLevel(weaponType: TWeapon): number {
    const type: TWeaponType = THE_EDGE.weapon_damage_types[weaponType];
    let level: number = Math.floor((
      this.weapons[type][weaponType].value +
      this.weapons.general["General weapon proficiency"].value
    ) / 2);
    if (weaponType == "Hand-to-Hand combat") return level;

    const partner: TWeapon = THE_EDGE.weapon_partners[weaponType];
    if (partner) {
      const partnerType: TWeaponType = THE_EDGE.weapon_damage_types[partner];
      level += Math.floor(this.weapons[partnerType][partner].value / 4);
    }
    return level;
  }

  // async rollAttackCheck(dices: number, threshold: number, vantage: VantageType, damageDice: string, _damageType): Promise<IAttackRollResult> {
  async rollAttackCheck(prompt: IAttackRollPrompt): Promise<IAttackRollResult> {
    const config: IDiceServerAttackConfig = {
      critDice: [1],
      critFailDice: [20],
      critFailCheckThreshold: Math.floor((this.weapons.general["General weapon proficiency"].value) / 2),
      ...prompt
    }
    return await DiceServer.attackCheck(config);
  }
}
