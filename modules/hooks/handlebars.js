import LocalisationServer from "../system/localisation_server.js";

export default function() {
    Handlebars.registerHelper({
        genName: (a) => LocalisationServer.genericLocalisation(a),
        attrName: (a) => LocalisationServer.attributeLocalisation(a),
        getAttr: (a, b, c) => { return a.system.characteristics[b][c]; },
        getSkill: (a, b, c, d) => { return a.system.skills[b][c][d]; },
        getSkillDice: (a, b, c) => { return a.system.skills.overview[b][c]; },
        attrAbbr: (a) => LocalisationServer.attributeAbbrLocalisation(a),
    })
}