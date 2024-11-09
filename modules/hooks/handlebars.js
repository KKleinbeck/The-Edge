import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";

export default function() {
    Handlebars.registerHelper({
        add: (a, b) => {return +a+b; },
        genName: (a) => LocalisationServer.localise(a),
        actorName: (a) => LocalisationServer.localise(a, "Actor"),
        attrName: (a) => LocalisationServer.localise(a, "attr"),
        attrAbbr: (a) => LocalisationServer.localise(a, "attr_abbr"),
        itemName: (a) => LocalisationServer.localise(a, "Item"),
        combatName: (a) => LocalisationServer.localise(a, "combat"),
        tooltip: (a) => LocalisationServer.localise(a, "tooltip"),
        proficiencyName: (a) => LocalisationServer.localise(a, "proficiency"),
        genRange: (a) => {
            let preface = a.split("_")[0];
            let distance = a.split("_")[1];
            if (preface == "less") return "< " + distance;
            return "> " + distance;
        },
        round: (a, b) => { return a.toFixed(b); },

        checkEqual: (a, b) => { return a === b; },
        checkIn: (a, b) => { return b[a] !== undefined; },
        checkInstance: (a, b) => { return b.includes(a); },
        getSys: (a, b, c, d) => { return a.system[b][c][d]; },
        getSys5: (a, b, c, d, e) => { return a.system[b][c][d][e]; },
        getEntry: (a, b) => { return a[b]; },
        log: (a) => console.log(a),
        sub: (a, b) => {return a - b;},

        getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
        getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
        getWeaponProficiency: (a, b, c) => { return a.system.weapons[b][c]; },
        getLoadedAmmunition: (actor, weapon) => {
            for (const ammu of actor.itemTypes["ammunition"]) {
                if (ammu.id == weapon.system.ammunitionID) {
                    let asc = ammu.system.capacity;
                    return `(${asc.max - asc.used} / ${asc.max})`;
                }
            }
            return "(empty)";
        },
        calcWeaponPL: (actor, weaponID) => { return actor._getWeaponPL(weaponID) },
        checkRenderItem: (item, type) => {
            if (type !== "any" && item.type !== type) {
                return false;
            } else if (item.type == "ammunition" && item.system.loaded) {
                return false;
            }
            return true;
        },
        getRangeModifier: (rangeChart, distance) => {
            if (distance < 2) return `(${rangeChart["less_2m"][0]} / ${rangeChart["less_2m"][1]})`;
            else if (distance < 20) return `(${rangeChart["less_20m"][0]} / ${rangeChart["less_20m"][1]})`;
            else if (distance < 200) return `(${rangeChart["less_200m"][0]} / ${rangeChart["less_200m"][1]})`;
            else if (distance < 1000) return `(${rangeChart["less_1km"][0]} / ${rangeChart["less_1km"][1]})`;
            return `(${rangeChart["more_1km"][0]} / ${rangeChart["more_1km"][1]})`;
        },
        getSizeModifier: (size) => {
            return `(${THE_EDGE.sizes[size][0]} / ${THE_EDGE.sizes[size][1]})`
        },
        getAmmunitionCount: (a) => {return `(${a.system.capacity.max - a.system.capacity.used} / ${a.system.capacity.max})`},
        getDmgModifier: (a) => {return `dmg: ${a.system.damage.bonus} / ${a.system.damage.penetration}`}
    })
}