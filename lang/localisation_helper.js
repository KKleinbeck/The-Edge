export default class LocalisationHelper {
    static attributeLocalization(a){
        return game.i18n.localize(`CHAR.${a.toUpperCase()}`)
    }
    
    static attributeAbbrLocalization(a){
        return game.i18n.localize(`CHARAbbr.${a.toUpperCase()}`)
    }
}