export default class LocalisationServer {
    static genericLocalisation(id) {
        return game.i18n.localize(id.toUpperCase())
    }

    static attributeLocalisation(id) {
        return game.i18n.localize(`ATTR.${id.toUpperCase()}`)
    }

    static combatLocalisation(id) {
        return game.i18n.localize(`COMBAT.${id.toUpperCase()}`)
    }

    static itemLocalisation(id) {
        return game.i18n.localize(`ITEM.${id.toUpperCase()}`)
    }

    static proficiencyLocalisation(id) {
        return game.i18n.localize(`PROFICIENCY.${id.toUpperCase().replace(/\s/g, "")}`)
    }
    
    static attributeAbbrLocalisation(id) {
        return game.i18n.localize(`ATTR_ABBR.${id.toUpperCase()}`)
    }

    static chatLocalisation(id, type) {
        return game.i18n.localize(`CHAT${type.toUpperCase()}.${id.toUpperCase()}`)
    }
}