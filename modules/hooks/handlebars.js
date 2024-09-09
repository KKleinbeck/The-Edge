import LocalisationHelper from "../../lang/localisation_helper.js";

export default function() {
    Handlebars.registerHelper({
        attrName: (a) => LocalisationHelper.attributeLocalization(a),
        getAttr: (a, b, c) => { return a.system.characteristics[b][c]; },
        attrAbbr: (a) => LocalisationHelper.attributeAbbrLocalization(a),
        getZone: (a, b) => {return 1; a.heartRate;return a.system.heartRate.max * 100 / (45 + 15*b);}
        // getZone: (a, b) => {return a.system.heartRate.max * 100 / (45 + 15*b);}
    })
}