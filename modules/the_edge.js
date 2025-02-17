import initHooks from "./hooks/init.js";
import THE_EDGE from "./system/config-the-edge.js"
import { TheEdgeActor } from "./actors/actor.js";
import { TheEdgeItem } from "./items/item.js";
import { TheEdgeItemSheet } from "./items/item-sheet.js";
import { TheEdgeActorSheet } from "./actors/actor-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createWorldbuildingMacro } from "./macro.js";
import { TheEdgeToken, TheEdgeTokenDocument } from "./token.js";

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

  // Generating maps for the fundamental data model
  THE_EDGE.attrs = Object.keys(game.model.Actor.character.attributes)
  const coreValues = Object.keys(foundry.utils.flattenObject(game.model.Actor.character))
    .filter(x => x.split(".").last() == "advances");
  for (const coreValue of coreValues) {
    const parts = coreValue.split(".");
    THE_EDGE.core_value_map[parts[0]][parts[parts.length-2]] = coreValue.replace(".advances", "");
  }

  const basicEffects = Object.keys(foundry.utils.flattenObject(game.model.Actor.character))
    .filter(x => x.split(".").last() == "status");
  for (let effect of basicEffects) {
    const parts = effect.split(".");
    effect = "system." + effect;
    if (THE_EDGE.effect_map[parts[0]]) {
      if (parts.length == 3) {
        THE_EDGE.effect_map[parts[0]][parts[1]] = [effect];
      } else {
        THE_EDGE.effect_map[parts[0]][parts[2]] = [effect];
        if (THE_EDGE.effect_map[parts[0]][parts[1]]) {
          THE_EDGE.effect_map[parts[0]][parts[1]].push(effect);
        } else THE_EDGE.effect_map[parts[0]][parts[1]] = [effect];
      }
      THE_EDGE.effect_map[parts[0]].all?.push(effect);
    } else {
      THE_EDGE.effect_map["others"][parts[0] + " - " + parts[1]] = [effect];
    }
  }
  THE_EDGE.effect_map["attributes"]["physical"] = [
    THE_EDGE.effect_map["attributes"]["end"], THE_EDGE.effect_map["attributes"]["str"], 
    THE_EDGE.effect_map["attributes"]["spd"], THE_EDGE.effect_map["attributes"]["crd"], 
  ]
  THE_EDGE.effect_map["attributes"]["social"] = [
    THE_EDGE.effect_map["attributes"]["cha"], THE_EDGE.effect_map["attributes"]["emp"], 
  ]
  THE_EDGE.effect_map["attributes"]["mental"] = [
    THE_EDGE.effect_map["attributes"]["foc"], THE_EDGE.effect_map["attributes"]["res"], 
    THE_EDGE.effect_map["attributes"]["int"]
  ]

  game.the_edge = {
    TheEdgeActor,
    createWorldbuildingMacro,
    config: THE_EDGE,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = TheEdgeActor;
  CONFIG.Item.documentClass = TheEdgeItem;
  CONFIG.Token.documentClass = TheEdgeTokenDocument;
  CONFIG.Token.objectClass = TheEdgeToken;

  // Alter the default chat system
  CONFIG.ChatMessage.template = "systems/the_edge/templates/chat/chat_message.html";
  CONFIG.ui.chat.MESSAGE_PATTERNS = {
    givePH: /^(\/givePH)\s*(\d+)?\s*([a-zA-Z0-9 ]*)?$/, ...CONFIG.ui.chat.MESSAGE_PATTERNS
  }

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("the_edge", TheEdgeActorSheet, { makeDefault: true });
  TheEdgeItemSheet.setupSheets()

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

Hooks.on("ready", async() => {
  TheEdgeItem.setupSubClasses()
})

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