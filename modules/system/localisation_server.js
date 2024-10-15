export default class LocalisationServer {
    static genericLocalisation(id) {
        return game.i18n.localize(id.toUpperCase())
    }

    static attributeLocalisation(id) {
        return game.i18n.localize(`CHAR.${id.toUpperCase()}`)
    }

    static proficiencyLocalisation(id) {
        return game.i18n.localize(`PROFICIENCY.${id.toUpperCase()}`)
    }
    
    static attributeAbbrLocalisation(id) {
        return game.i18n.localize(`CHARAbbr.${id.toUpperCase()}`)
    }

    static chatLocalisation(id, type) {
        return game.i18n.localize(`CHAT${type.toUpperCase()}.${id.toUpperCase()}`)
    }
}