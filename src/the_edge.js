import initHooks from "./hooks/init.js";
import THE_EDGE from "./system/config-the-edge.js"
import CombatLog from "./applications/combat-log.js";
import DiceServer from "./system/dice_server.js";
import setupGameSettings from "./system/settings.js";
import TheEdgeHotbar from "./applications/hotbar.js";

import CharacterData from "./data_models/actors/character.js";
import StoreData from "./data_models/actors/store.js";

import AmmunitionData from "./data_models/items/ammunition.js";
import ArmourData from "./data_models/items/armour.js";
import ConsumablesData from "./data_models/items/consumables.js";
import GearData from "./data_models/items/gear.js";
import { CombatSkillData, LanguageSkillData, MedicalSkillData, SkillData } from "./data_models/items/skills.js";
import VantageData from "./data_models/items/vantage.js";
import WeaponData from "./data_models/items/weapon.js";

import { TheEdgeActor } from "./actors/actor.js";
import { TheEdgeCombat } from "./documents/Combat.js";
import { TheEdgeCombatant } from "./documents/Combatant.js";
import { TheEdgeCombatTracker } from "./system/sidebar/combat_tracker.js";
import { TheEdgeItem } from "./items/item.js";
import { SocketHandler } from "./system/socket_handler.js";
import { TheEdgeItemSheet } from "./items/item-sheet.js";
import { TheEdgePlayableSheet } from "./actors/playable-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { TheEdgeToken, TheEdgeTokenDocument } from "./documents/token.js";
import { TheEdgeStoreSheet } from "./actors/store-sheet.js";

import registerCustomHooks from "./system/hooks.js";

Hooks.once("init", async function() {
  console.log(`Initializing the Galaxy`);
  // Useful helpers
  _extendNativePrototypes();

  // Generating maps for the fundamental data model
  _finaliseConfigSetup()

  game.the_edge = {
    combatLog: new CombatLog(),
    diceServer: new DiceServer(),
    socketHandler: new SocketHandler()
  };

  // Define custom Document classes
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.Store = StoreData;
  CONFIG.Actor.documentClass = TheEdgeActor;

  CONFIG.Combat.documentClass = TheEdgeCombat;
  CONFIG.Combatant.documentClass = TheEdgeCombatant;

  CONFIG.Item.dataModels.Advantage = VantageData;
  CONFIG.Item.dataModels.Ammunition = AmmunitionData;
  CONFIG.Item.dataModels.Armour = ArmourData;
  CONFIG.Item.dataModels.Consumables = ConsumablesData;
  CONFIG.Item.dataModels.Combatskill = CombatSkillData;
  CONFIG.Item.dataModels.Disadvantage = VantageData;
  CONFIG.Item.dataModels.Gear = GearData;
  CONFIG.Item.dataModels.Languageskill = LanguageSkillData;
  CONFIG.Item.dataModels.Medicalskill = MedicalSkillData;
  CONFIG.Item.dataModels.Skill = SkillData;
  CONFIG.Item.dataModels.Weapon = WeaponData;
  CONFIG.Item.documentClass = TheEdgeItem;

  CONFIG.Token.documentClass = TheEdgeTokenDocument;
  CONFIG.Token.objectClass = TheEdgeToken;

  // Register actor, item and other sheets
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  const actorSheets = [
    { sheetClass: TheEdgePlayableSheet, types: ['character'], makeDefault: true },
    { sheetClass: TheEdgeStoreSheet, types: ['Store'], makeDefault: true },
  ];
  actorSheets.forEach(({ sheetClass, types, makeDefault }) => {
    foundry.documents.collections.Actors.registerSheet('the_edge', sheetClass, { types, makeDefault });
  });

  TheEdgeItemSheet.setupSheets()

  // Alter the combat tracker
  CONFIG.ui.combat = TheEdgeCombatTracker;

  // Alter the default chat system
  CONFIG.ChatMessage.template = "systems/the_edge/templates/chat/chat_message.hbs";
  CONFIG.ui.chat.MESSAGE_PATTERNS = {
    givePH: /^\/givePH\s*(\d+)?\s*([a-zA-Z0-9 ]*)?$/,
    language: /^\/language\s+([a-zA-Z]+)\s+(.*)$/,
    ...CONFIG.ui.chat.MESSAGE_PATTERNS,
  }

  // UI setup
  CONFIG.ui.hotbar = TheEdgeHotbar;

  setupGameSettings();

  /**
   * Slugify a string.
   */
  Handlebars.registerHelper('slugify', function(value) {
    return value.slugify({strict: true});
  });

  // Preload template partials
  await preloadHandlebarsTemplates();
});

registerCustomHooks();

initHooks();

function _extendNativePrototypes() {
  Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
  }
  Array.prototype.last = function () {
    return this[this.length - 1];
  }
  Array.prototype.sum = function () {
    return this.reduce((a,b) => a+b,0);
  }
  Array.prototype.variance = function () {
    const sum = this.sum();
    return this.reduce((a,b) => a + b*b, -sum) / this.length;
  }
  Number.prototype.mod = function (n) {
    // Javascripts % returns remainder, not module (-1 % n == -1 != n - 1)
    return ((this % n) + n) % n;
  }
  String.prototype.rsplit = function(sep, maxsplit = 1) {
      var split = this.split(sep || /\s+/);
      return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
  }
}

function _finaliseConfigSetup() {
  const characterDataInstance = new CharacterData();
  THE_EDGE.characterSchema = characterDataInstance.toObject();
  const coreValues = Object.keys(foundry.utils.flattenObject(THE_EDGE.characterSchema))
    .filter(x => x.split(".").last() == "advances");
  for (const coreValue of coreValues) {
    const parts = coreValue.split(".");
    THE_EDGE.coreValueMap[parts[0]][parts[parts.length-2]] = coreValue.replace(".advances", "");
  }

  const basicEffects = Object.keys(foundry.utils.flattenObject(THE_EDGE.characterSchema))
    .filter(x => x.split(".").last() == "status" || x.split(".")[0] == "generalModifiers");
  for (let effect of basicEffects) {
    const parts = effect.split(".");
    effect = "system." + effect;
    if (THE_EDGE.effectMap[parts[0]]) {
      if (parts.length == 2 || parts.length == 3) {
        THE_EDGE.effectMap[parts[0]][parts[1]] = [effect];
      } else {
        THE_EDGE.effectMap[parts[0]][parts[2]] = [effect];
        if (THE_EDGE.effectMap[parts[0]][parts[1]]) {
          THE_EDGE.effectMap[parts[0]][parts[1]].push(effect);
        } else THE_EDGE.effectMap[parts[0]][parts[1]] = [effect];
      }
      THE_EDGE.effectMap[parts[0]].all?.push(effect);
    } else {
      THE_EDGE.effectMap["generalModifiers"][parts[0] + " - " + parts[1]] = [effect];
    }
  }
  THE_EDGE.effectMap["attributes"]["physical"] = [
    THE_EDGE.effectMap["attributes"]["end"], THE_EDGE.effectMap["attributes"]["str"], 
    THE_EDGE.effectMap["attributes"]["spd"], THE_EDGE.effectMap["attributes"]["crd"], 
  ]
  THE_EDGE.effectMap["attributes"]["social"] = [
    THE_EDGE.effectMap["attributes"]["cha"], THE_EDGE.effectMap["attributes"]["emp"], 
  ]
  THE_EDGE.effectMap["attributes"]["mental"] = [
    THE_EDGE.effectMap["attributes"]["foc"], THE_EDGE.effectMap["attributes"]["res"], 
    THE_EDGE.effectMap["attributes"]["int"]
  ]

  // definedEffects only holds the string names, not the targets
  THE_EDGE.definedEffects = {};
  for (const [group, fields] of Object.entries(THE_EDGE.effectMap)) {
    THE_EDGE.definedEffects[group] = Object.keys(fields);
  }
  for (const group of ["attributes", "proficiencies", "weapons"]) {
    THE_EDGE.definedEffects[group].crit = undefined;
    THE_EDGE.definedEffects[group].critFail = undefined;
  }

  const generalWeapons = Object.keys(THE_EDGE.characterSchema.weapons.general);
  const energyWeapons = Object.keys(THE_EDGE.characterSchema.weapons.energy);
  const kineticWeapons = Object.keys(THE_EDGE.characterSchema.weapons.kinetic);
  for (let i = 0; i < energyWeapons.length; ++i) {
    THE_EDGE.weapon_damage_types[generalWeapons[i]] = "general";
    THE_EDGE.weapon_damage_types[energyWeapons[i]] = "energy";
    THE_EDGE.weapon_damage_types[kineticWeapons[i]] = "kinetic";
    THE_EDGE.weapon_partners[energyWeapons[i]] = kineticWeapons[i];
    THE_EDGE.weapon_partners[kineticWeapons[i]] = energyWeapons[i];
  }
}