import LocalisationHelper from "../../lang/localisation_helper.js";

export default function() {
    Handlebars.registerHelper({
        attrName: (a) => LocalisationHelper.attributeLocalization(a),
        getAttr: (a, b, c) => {return a;},
        // getAttr: (a, b, c) => { console.log(a.system.characteristics); return a.system.characteristics[b][c] },
        attrAbbr: (a) => LocalisationHelper.attributeAbbrLocalization(a),
    })
}