import LocalisationServer from "../system/localisation_server.js";

export default function() {
    Handlebars.registerHelper({
        genName: (a) => LocalisationServer.genericLocalisation(a),
        attrName: (a) => LocalisationServer.attributeLocalisation(a),
        attrAbbr: (a) => LocalisationServer.attributeAbbrLocalisation(a),
        combatName: (a) => LocalisationServer.combatLocalisation(a),
        proficiencyName: (a) => LocalisationServer.proficiencyLocalisation(a),
        genRange: (a) => {
            let preface = a.split("_")[0];
            let distance = a.split("_")[1];
            if (preface == "lesss") return "< " + distance;
            return "> " + distance;
        },

        checkEqual: (a, b) => {return a == b; },
        checkIn: (a, b) => {return b[a] !== undefined; },
        getSys: (a, b, c, d) => { return a.system[b][c][d]; },
        getSys5: (a, b, c, d, e) => { return a.system[b][c][d][e]; },
        getEntry: (a, b) => { return a[b]; },
        getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
        getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
        getWeaponProficiency: (a, b, c) => { return a.system.weapons[b][c].initial + a.system.weapons[b][c].level; },
        log: (a) => console.log(a)
    })
}