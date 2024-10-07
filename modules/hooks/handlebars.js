import LocalisationServer from "../system/localisation_server.js";

export default function() {
    Handlebars.registerHelper({
        genName: (a) => LocalisationServer.genericLocalisation(a),
        attrName: (a) => LocalisationServer.attributeLocalisation(a),
        getAttr: (a, b, c) => { return a.system.characteristics[b][c]; },
        getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
        getProficiencyDice: (a, b, c) => { return a.system.proficiencies.overview[b][c]; },
        attrAbbr: (a) => LocalisationServer.attributeAbbrLocalisation(a),
    })
}