import initHooks from "./hooks/init.js";
import THE_EDGE from "./system/config-the-edge.js"
import CharacterData from "../data_models/actors/character.js";
import CombatLog from "./applications/combat-log.js";
import DiceServer from "./system/dice_server.js";
import GrenadePicker from "./applications/grenades-picker.js";
import TheEdgeHotbar from "./applications/hotbar.js";
import { TheEdgeActor } from "./actors/actor.js";
import { TheEdgeItem } from "./items/item.js";
import { SocketHandler } from "./system/socket_handler.js";
import { TheEdgeItemSheet } from "./items/item-sheet.js";
import { TheEdgePlayableSheet } from "./actors/playable-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { TheEdgeToken, TheEdgeTokenDocument } from "./token.js";
import { TheEdgeStoreSheet } from "./actors/store-sheet.js";

Hooks.once("init", async function() {
  console.log(`Initializing the Galaxy`);
  // Useful helpers
  Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
  }
  Array.prototype.sum = function () {
    return this.reduce((a,b) => a+b,0);
  }
  Array.prototype.last = function () {
    return this[this.length - 1];
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

  // Generating maps for the fundamental data model
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
  THE_EDGE.definedEffects = structuredClone(THE_EDGE.effectMap);
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

  game.the_edge = {
    config: THE_EDGE,
    combatLog: new CombatLog(),
    diceServer: new DiceServer(),
    socketHandler: new SocketHandler()
  };

  // Register actor sheets
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);

  const actorSheets = [
    { sheetClass: TheEdgePlayableSheet, types: ['character'], makeDefault: true },
    { sheetClass: TheEdgeStoreSheet, types: ['Store'], makeDefault: true },
  ];
  actorSheets.forEach(({ sheetClass, types, makeDefault }) => {
    foundry.documents.collections.Actors.registerSheet('the_edge', sheetClass, { types, makeDefault });
  });

  // Define custom Document classes
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.documentClass = TheEdgeActor;
  CONFIG.Item.documentClass = TheEdgeItem;
  CONFIG.Token.documentClass = TheEdgeTokenDocument;
  CONFIG.Token.objectClass = TheEdgeToken;

  // Alter the default chat system
  CONFIG.ChatMessage.template = "systems/the_edge/templates/chat/chat_message.hbs";
  CONFIG.ui.chat.MESSAGE_PATTERNS = {
    givePH: /^\/givePH\s*(\d+)?\s*([a-zA-Z0-9 ]*)?$/,
    changeHR: /^\/changeHR\s*(\d+|[zZ][123])?\s*([a-zA-Z0-9 ]*)?$/,
    ...CONFIG.ui.chat.MESSAGE_PATTERNS,
  }

  // Register item sheets
  TheEdgeItemSheet.setupSheets()

  // UI setup
  CONFIG.ui.hotbar = TheEdgeHotbar;

  // Register system settings
  game.settings.register("the_edge", "macroShorthand", {
    name: "SETTINGS.SimpleMacroShorthandN",
    hint: "SETTINGS.SimpleMacroShorthandL",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  // Register initiative setting.
  game.settings.register("the_edge", "initFormula", {
    name: "SETTINGS.SimpleInitFormulaN",
    hint: "SETTINGS.SimpleInitFormulaL",
    scope: "world",
    type: String,
    default: "1d20 + 1d@attributes.spd.value + 1d@attributes.foc.value - 2",
    config: true,
    onChange: formula => _simpleUpdateInit(formula, true)
  });

  // Retrieve and assign the initiative formula setting.
  const initFormula = game.settings.get("the_edge", "initFormula");
  _simpleUpdateInit(initFormula);

  /**
   * Update the initiative formula.
   * @param {string} formula - Dice formula to evaluate.
   * @param {boolean} notify - Whether or not to post nofications.
   */
  function _simpleUpdateInit(formula, notify = false) {
    const isValid = Roll.validate(formula);
    if ( !isValid ) {
      if ( notify ) ui.notifications.error(`${game.i18n.localize("SIMPLE.NotifyInitFormulaInvalid")}: ${formula}`);
      return;
    }
    CONFIG.Combat.initiative.formula = formula;
  }

  /**
   * Slugify a string.
   */
  Handlebars.registerHelper('slugify', function(value) {
    return value.slugify({strict: true});
  });

  // Preload template partials
  await preloadHandlebarsTemplates();
});

Hooks.on("ready", function() {
  let rightClickStart = null;
  let startPos = null;
  let gp = null;
  // TODO: make user controllable options
  const maxClickDuration = 300; // ms
  const maxMoveDistance = 5;    // px

  canvas.app.view.addEventListener("mousedown", e => {
    if (e.button === 2) {
      rightClickStart = Date.now();
      startPos = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.app.view.addEventListener("mouseup", e => {
    if (e.button === 2 && rightClickStart) {
      if(Date.now() - game.the_edge.tokenClickTime < maxClickDuration) {
        rightClickStart = null;
        return;
      }

      const duration = Date.now() - rightClickStart;
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (duration < maxClickDuration && distance < maxMoveDistance) {
        if (gp) gp.close();
        gp = new GrenadePicker({
          position: {left: e.clientX, top: e.clientY},
          mousePosition: canvas.mousePosition
        });
        if (gp.hasContent()) {
          gp.render(true);
          e.preventDefault();
        }
      }
      rightClickStart = null;
    }
  });

  // Redraw the hotbar to a sensible actor
  ui.hotbar._onResize(); // Initialize size
  ui.hotbar.render(true);
});

Hooks.on("renderTokenHUD", function(_tokenHUG) {
  preventGrenadePick()
})

Hooks.on("closeBasePlaceableHUD", function(_tokenHUD) {
  preventGrenadePick()
})

function preventGrenadePick() {
  game.the_edge.tokenClickTime = Date.now();
}

/**
 * Macrobar hook.
 */
// Hooks.on("hotbarDrop", (bar, data, slot) => createWorldbuildingMacro(data, slot));

/**
 * Adds the actor template context menu.
 */
// Hooks.on("getActorDirectoryEntryContext", (html, options) => {

//   // Define an actor as a template.
//   options.push({
//     name: game.i18n.localize("SIMPLE.DefineTemplate"),
//     icon: '<i class="fas fa-stamp"></i>',
//     condition: li => {
//       const actor = game.actors.get(li.data("documentId"));
//       return !actor.isTemplate;
//     },
//     callback: li => {
//       const actor = game.actors.get(li.data("documentId"));
//       actor.setFlag("the_edge", "isTemplate", true);
//     }
//   });

//   // Undefine an actor as a template.
//   options.push({
//     name: game.i18n.localize("SIMPLE.UnsetTemplate"),
//     icon: '<i class="fas fa-times"></i>',
//     condition: li => {
//       const actor = game.actors.get(li.data("documentId"));
//       return actor.isTemplate;
//     },
//     callback: li => {
//       const actor = game.actors.get(li.data("documentId"));
//       actor.setFlag("the_edge", "isTemplate", false);
//     }
//   });
// });

/**
 * Adds the item template context menu.
 */
// Hooks.on("getItemDirectoryEntryContext", (html, options) => {
//   // template.item.type
//   // data.template
//   // Define an item as a template.
//   options.push({
//     name: game.i18n.localize("SIMPLE.DefineTemplate"),
//     icon: '<i class="fas fa-stamp"></i>',
//     condition: li => {
//       const item = game.items.get(li.data("documentId"));
//       return !item.isTemplate;
//     },
//     callback: li => {
//       const item = game.items.get(li.data("documentId"));
//       item.setFlag("the_edge", "isTemplate", true);
//     }
//   });

//   // Undefine an item as a template.
//   options.push({
//     name: game.i18n.localize("SIMPLE.UnsetTemplate"),
//     icon: '<i class="fas fa-times"></i>',
//     condition: li => {
//       const item = game.items.get(li.data("documentId"));
//       return item.isTemplate;
//     },
//     callback: li => {
//       const item = game.items.get(li.data("documentId"));
//       item.setFlag("the_edge", "isTemplate", false);
//     }
//   });
// });

initHooks();