import LocalisationServer from "../system/localisation_server.js";

export default function() {
    Handlebars.registerHelper({
        genName: (a) => LocalisationServer.genericLocalisation(a),
        attrName: (a) => LocalisationServer.attributeLocalisation(a),
        attrAbbr: (a) => LocalisationServer.attributeAbbrLocalisation(a),
        proficiencyName: (a) => LocalisationServer.proficiencyLocalisation(a),

        checkEqual: (a, b) => {return a == b; },
        getSys: (a, b, c, d) => { return a.system[b][c][d]; },
        getEntry: (a, b) => { return a[b]; },
        getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
        getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
        log: (a) => console.log(a)
    })
}