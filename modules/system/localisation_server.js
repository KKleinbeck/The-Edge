export default class LocalisationServer {
    static genericLocalisation(id) {
        return game.i18n.localize(id.toUpperCase())
    }

    static attributeLocalisation(id) {
        return game.i18n.localize(`CHAR.${id.toUpperCase()}`)
    }
    
    static attributeAbbrLocalisation(id) {
        return game.i18n.localize(`CHARAbbr.${id.toUpperCase()}`)
    }

    static chatLocalisation(id) {
        return game.i18n.localize(`CHAT.${id.toUpperCase()}`)
    }

    static chatErrorLocalisation(id) {
        return game.i18n.localize(`CHATERROR.${id.toUpperCase()}`)
    }
}