import ApiHandler from "../api-handler.js";
import { assert, TestRegistry } from "../test-registry.js"


/** @param {ApiHandler} apiHandler */
export default function registerUnitTestsForItems(apiHandler) {
  // items.armour: protect
  // items.components.skill: get modifiers
  // items.components.equipable: toggleEquip
  // items.components.equipable: get modifiers
  // item: useOne
  // item-sheet: Ammunition onIconSelected
  // item-sheet: Armour onIconSelected
  // item-sheet: Skill _onMaxLevelChange with mock event
  // item-sheet: Consumables, Skill, Weapon getModifiers with mock target
  // item-sheet: Consumables, Skill, Weapon updateModifiers
  // item-sheet: Weapon onIconSelected
  // item-sheet: Weapon _addFiringMode
  // item-sheet: Weapon _deleteFiringMode
  // item-sheet: Weapon _onModeModify with mock event
}