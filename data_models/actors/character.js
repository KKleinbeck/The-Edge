import { generateDataModelWithComponents } from "../abstracts.js";
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
}