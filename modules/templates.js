/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    // Actor templates
    "systems/the_edge/templates/actors/biography.html",
    "systems/the_edge/templates/actors/items.html",
    //Attributes
    "systems/the_edge/templates/actors/attributes/layout.html",
    "systems/the_edge/templates/actors/attributes/main_attributes.html",
    "systems/the_edge/templates/actors/attributes/languages.html",
    "systems/the_edge/templates/actors/attributes/conditioning.html",
    "systems/the_edge/templates/actors/attributes/skills.html",
    "systems/the_edge/templates/actors/attributes/vantages.html",
    "systems/the_edge/templates/actors/attributes/progress.html",
    //Proficiencies
    "systems/the_edge/templates/actors/proficiencies/layout.html",
    //Combat
    "systems/the_edge/templates/actors/combat/layout.html",
    "systems/the_edge/templates/actors/combat/proficiencies.html",
    "systems/the_edge/templates/actors/combat/combat_skills.html",
    "systems/the_edge/templates/actors/combat/weapon_overview.html",

    // Item templates
    "systems/the_edge/templates/items/meta-effects.html",
    "systems/the_edge/templates/items/meta-description.html",
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};