export default class LocalisationServer {
    static genericLocalisation(id){
        return game.i18n.localize(id.toUpperCase())
    }

    static attributeLocalisation(id){
        return game.i18n.localize(`CHAR.${id.toUpperCase()}`)
    }
    
    static attributeAbbrLocalisation(id){
        return game.i18n.localize(`CHARAbbr.${id.toUpperCase()}`)
    }

    static chatLocalisation(id, user){
        return game.i18n.localize(`CHAT.${id.toUpperCase()}`).replace("_USER_", user)
    }
}