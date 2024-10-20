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
            if (preface == "less") return "< " + distance;
            return "> " + distance;
        },

        checkEqual: (a, b) => { return a == b; },
        checkIn: (a, b) => { return b[a] !== undefined; },
        getSys: (a, b, c, d) => { return a.system[b][c][d]; },
        getSys5: (a, b, c, d, e) => { return a.system[b][c][d][e]; },
        getEntry: (a, b) => { return a[b]; },
        log: (a) => console.log(a),

        getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
        getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
        getWeaponProficiency: (a, b, c) => { return a.system.weapons[b][c]; },
        calcWeaponPL: (systemData, weapon) => {
            let level = 0;
            for (const type of ["Energy", "Kinetic", "Others"]) {
                if (systemData.weapons[type][weapon.type] === undefined) continue;
                console.log(systemData.weapons[type])
                level += systemData.weapons[type][weapon.type];
            }
            let attr_mod = Math.floor( (
                systemData.attributes[weapon.lead_attr_1.name].value - weapon.lead_attr_1.value +
                systemData.attributes[weapon.lead_attr_2.name].value - weapon.lead_attr_2.value
            ) / 4)

            console.log(level, attr_mod)
            return level + attr_mod
        }
    })
}