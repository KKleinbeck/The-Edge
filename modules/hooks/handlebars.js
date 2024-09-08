import LocalisationHelper from "../../lang/localisation_helper.js";

export default function() {
    Handlebars.registerHelper({
        attrName: (a) => LocalisationHelper.attributeLocalization(a),
        getAttr: (a, b, c) => { return a.system.characteristics[b][c] },
        attrAbbr: (a) => LocalisationHelper.attributeAbbrLocalization(a),
    })
}