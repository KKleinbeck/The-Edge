/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    // Actor templates
    // Generics
    "systems/the_edge/templates/actors/skills.hbs",
    // Attributes
    "systems/the_edge/templates/actors/character/attributes/layout.hbs",
    "systems/the_edge/templates/actors/character/attributes/main_attributes.hbs",
    "systems/the_edge/templates/actors/character/attributes/languages.hbs",
    "systems/the_edge/templates/actors/character/attributes/conditioning.hbs",
    "systems/the_edge/templates/actors/character/attributes/progress.hbs",
    // Proficiencies
    "systems/the_edge/templates/actors/character/proficiencies/layout.hbs",
    // Combat
    "systems/the_edge/templates/actors/character/combat/layout.hbs",
    "systems/the_edge/templates/actors/character/combat/proficiencies.hbs",
    "systems/the_edge/templates/actors/character/combat/weapon_overview.hbs",
    // Others
    "systems/the_edge/templates/actors/character/items.hbs",
    "systems/the_edge/templates/actors/character/health.hbs",
    "systems/the_edge/templates/actors/character/biography.hbs",

    // Store templates
    "systems/the_edge/templates/actors/store/buy-from-player.hbs",
    "systems/the_edge/templates/actors/store/meta-ammunition.hbs",
    "systems/the_edge/templates/actors/store/meta-armour.hbs",
    "systems/the_edge/templates/actors/store/meta-buy-or-retrieve.hbs",
    "systems/the_edge/templates/actors/store/meta-consumables.hbs",
    "systems/the_edge/templates/actors/store/meta-item-header.hbs",
    "systems/the_edge/templates/actors/store/meta-item.hbs",
    "systems/the_edge/templates/actors/store/meta-sell-or-store.hbs",
    "systems/the_edge/templates/actors/store/meta-weapon.hbs",

    // Item templates
    "systems/the_edge/templates/items/Ammunition-details-content.hbs",
    "systems/the_edge/templates/items/Grenade-effects-content.hbs",

    // Chat templates
    "systems/the_edge/templates/chat/items/meta-effects.hbs",
    "systems/the_edge/templates/chat/meta-damage.html",
    "systems/the_edge/templates/chat/meta-apply-damage.html",
    "systems/the_edge/templates/chat/meta-protection-log.html",
    "systems/the_edge/templates/dialogs/meta-chat-options.html",

    // Hotbar
    "systems/the_edge/modules/applications/templates/hotbar/dynamic-field.hbs",
    "systems/the_edge/modules/applications/templates/hotbar/counter.hbs",
    "systems/the_edge/modules/applications/templates/hotbar/health.hbs",
    "systems/the_edge/modules/applications/templates/hotbar/item.hbs",
    "systems/the_edge/modules/applications/templates/hotbar/proficiency.hbs",
    "systems/the_edge/modules/applications/templates/hotbar/weapon.hbs",

    // Generic templates
    "systems/the_edge/templates/generic/counter-token.hbs",
    "systems/the_edge/templates/generic/icon-selector.hbs",
    "systems/the_edge/templates/generic/progress-bar-modern.hbs",
    "systems/the_edge/templates/generic/range-chart.hbs",
  ];

  // Load the template parts
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};