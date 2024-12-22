export default class LocalisationServer {
    static localise(id, category = undefined) {
        category = category === undefined ? '' : category.toUpperCase() + '.'
        return game.i18n.localize(category + id.toUpperCase())
    }

    static parsedLocalisation(id, category, dict = undefined) {
        return game.i18n.format(category.toUpperCase() + "." + id.toUpperCase(), dict)
    }
}