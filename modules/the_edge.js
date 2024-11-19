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
  THE_EDGE.attrs = Object.keys(game.model.Actor.character.attributes)
  THE_EDGE.effect_map.attributes.all = THE_EDGE.attrs
  THE_EDGE.weapon_types = [
    ...Object.keys(game.model.Actor.character.weapons["Energy"]),
    ...Object.keys(game.model.Actor.character.weapons["Kinetic"]),
    ...Object.keys(game.model.Actor.character.weapons["Others"])
  ]
  for (const [category, proficiencies] of Object.entries(game.model.Actor.character.proficiencies)) {
    THE_EDGE.effect_map.proficiencies[category.toLowerCase()] = Object.keys(proficiencies)
    THE_EDGE.effect_map.proficiencies.all.push(...Object.keys(proficiencies))
  }

  // Useful helper to get random element from array
  Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
  }

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
  CONFIG.ChatMessage.template = "systems/the_edge/templates/chat/chat_message.html"

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
    default: "1d20+1d12",
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