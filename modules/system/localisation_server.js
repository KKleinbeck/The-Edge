export default class LocalisationServer {
  static localise(id, category = undefined) {
    category = category === undefined ? '' : category.toUpperCase() + '.'
    return game.i18n.localize(category + id.toUpperCase())
  }

  static parsedLocalisation(id, category, dict = undefined) {
    return game.i18n.format(category.toUpperCase() + "." + id.toUpperCase(), dict)
  }

  static effectLocalisation(id, type) {
    if (id == "all") return LocalisationServer.localise(id);
    if (type == "skills") return id;
    switch (type) {
      case "attributes": return LocalisationServer.localise(id, "attr");
      case "proficiencies": return LocalisationServer.localise(id, "proficiency");
      case "weapons": return LocalisationServer.localise(id, "combat");
    }
    return LocalisationServer.localise(id);
  }
}