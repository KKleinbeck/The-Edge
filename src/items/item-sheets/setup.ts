import { TheEdgeItemSheet } from "../item-sheet.js";
import {
  ItemSheetAmmunition,
  ItemSheetArmour,
  ItemSheetConsumables,
  ItemSheetGear,
  ItemSheetLanguage,
  ItemSheetSkill,
  ItemSheetVantage,
} from "./others.js";
import ItemSheetWeapon from "./weapons.js";

export default function setupItemSheets() {
  foundry.documents.collections.Items.unregisterSheet(
    "core",
    foundry.appv1.sheets.ItemSheet,
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    TheEdgeItemSheet,
    { makeDefault: true },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetAmmunition,
    { makeDefault: true, types: ["Ammunition"] },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetArmour,
    { makeDefault: true, types: ["Armour"] },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetConsumables,
    { makeDefault: true, types: ["Consumables"] },
  );
  foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetGear, {
    makeDefault: true,
    types: ["Gear"],
  });
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetLanguage,
    { makeDefault: true, types: ["Languageskill"] },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetSkill,
    { makeDefault: true, types: ["Skill", "Combatskill", "Medicalskill"] },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetVantage,
    { makeDefault: true, types: ["Advantage", "Disadvantage"] },
  );
  foundry.documents.collections.Items.registerSheet(
    "the_edge",
    ItemSheetWeapon,
    { makeDefault: true, types: ["Weapon"] },
  );

  foundry.documents.collections.Items.unregisterSheet(
    "the_edge",
    TheEdgeItemSheet,
    {
      types: [
        "Advantage",
        "Ammunition",
        "Armour",
        "Combatskill",
        "Consumables",
        "Disadvantage",
        "Gear",
        "Languageskill",
        "Medicalskill",
        "Skill",
        "Weapon",
      ],
    },
  );
}
