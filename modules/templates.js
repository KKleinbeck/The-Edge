/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    // Actor templates
    "systems/the_edge/templates/actors/character/biography.html",
    "systems/the_edge/templates/actors/character/items.html",
    //Attributes
    "systems/the_edge/templates/actors/character/attributes/layout.html",
    "systems/the_edge/templates/actors/character/attributes/main_attributes.html",
    "systems/the_edge/templates/actors/character/attributes/languages.html",
    "systems/the_edge/templates/actors/character/attributes/conditioning.html",
    "systems/the_edge/templates/actors/character/attributes/skills.html",
    "systems/the_edge/templates/actors/character/attributes/vantages.html",
    "systems/the_edge/templates/actors/character/attributes/progress.html",
    //Proficiencies
    "systems/the_edge/templates/actors/character/proficiencies/layout.html",
    //Combat
    "systems/the_edge/templates/actors/character/combat/layout.html",
    "systems/the_edge/templates/actors/character/combat/proficiencies.html",
    "systems/the_edge/templates/actors/character/combat/combat_skills.html",
    "systems/the_edge/templates/actors/character/combat/medical_skills.html",
    "systems/the_edge/templates/actors/character/combat/weapon_overview.html",
    //Health
    "systems/the_edge/templates/actors/character/health/layout.html",

    // Store templates
    "systems/the_edge/templates/actors/store/meta-buy.html",
    "systems/the_edge/templates/actors/store/meta-header.html",
    "systems/the_edge/templates/actors/store/meta-weapon.html",

    // Item templates
    "systems/the_edge/templates/items/meta-attachments.html",
    "systems/the_edge/templates/items/meta-description.html",
    "systems/the_edge/templates/items/meta-effects.html",
    "systems/the_edge/templates/items/meta-leading-attr.html",

    // Chat templates
    "systems/the_edge/templates/chat/meta-damage.html",
    "systems/the_edge/templates/chat/meta-apply-damage.html",
    "systems/the_edge/templates/chat/meta-protection-log.html",
    "systems/the_edge/templates/dialogs/meta-chat-options.html",
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};