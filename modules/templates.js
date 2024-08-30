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
    "systems/the_edge/templates/actors/attributes.html",
    "systems/the_edge/templates/actors/skills.html",
    // Attribute list partial.
    "systems/the_edge/templates/parts/sheet-attributes.html",
    "systems/the_edge/templates/parts/sheet-groups.html"
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};