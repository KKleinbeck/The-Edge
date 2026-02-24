import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField } = foundry.data.fields;

function WEAPON_FIELD() {
  return new SchemaField({
    status: new NumberField({ initial: 0 }),
    advances: new NumberField({ initial: 0 }),
  });
}

export default class WeaponData extends DataModelComponent {
  static SCHEMA = {
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
  }
}
