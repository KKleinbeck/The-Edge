import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";

export default function() {
  Handlebars.registerHelper({
    add: (a, b) => {return +a+b; },
    genName: (a) => LocalisationServer.localise(a),
    actorName: (a) => LocalisationServer.localise(a, "Actor"),
    attrName: (a) => LocalisationServer.localise(a, "attr"),
    chatName: (a) => LocalisationServer.localise(a, "chat"),
    attrAbbr: (a) => LocalisationServer.localise(a, "attr_abbr"),
    itemName: (a) => LocalisationServer.localise(a, "Item"),
    skillName: (a) => LocalisationServer.localise(a, "Skill"),
    combatName: (a) => LocalisationServer.localise(a, "combat"),
    tooltipText: (a) => LocalisationServer.localise(a, "tooltip"),
    proficiencyName: (a) => LocalisationServer.localise(a, "proficiency"),
    textLocalisation: (a) => LocalisationServer.localise(a, "text"),
    detailedLocalisation: (a, b, c) => LocalisationServer.parsedLocalisation(b, a, c),
    effectRequirementName: (a, b) => {
      if (a == "all") return LocalisationServer.localise(a);
      if (b == "skills") return a;
      switch (b) {
        case "attributes": return LocalisationServer.localise(a, "attr");
        case "proficiencies": return LocalisationServer.localise(a, "proficiency");
        case "weapons": return LocalisationServer.localise(a, "combat");
      }
      return LocalisationServer.localise(a);
    },
    genRange: (a) => {
      let preface = a.split("_")[0];
      let distance = a.split("_")[1];
      if (preface == "less") return "< " + distance;
      return "> " + distance;
    },
    round: (a, b) => { return a.toFixed(b); },
    strCombine: (a, b) => { return a + " " + b; },

    checkEqual: (a, b) => { return a === b; },
    checkIn: (a, b) => { return b[a] !== undefined; },
    checkInstance: (a, b) => { return b.includes(a); },
    checkNotEmpty: (a) => { if (!a) return false; return a.length !== 0; },
    checkNotEmptyObject: (a) => {
      if (!a) return false;
      return Object.keys(a).length !== 0;
    },
    checkAttachment: (a) => { return a.system?.layer === "Outer"; },
    getSys: (a, b, c, d) => { return a.system[b][c][d]; },
    getSys5: (a, b, c, d, e) => { return a.system[b][c][d][e]; },
    getEntry: (a, b) => { return a[b]; },
    log: (a) => console.log(a),
    sub: (a, b) => { return a - b; },
    capitalise: (a) => { return a.charAt(0).toUpperCase() + a.slice(1); },

    getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
    getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
    getWeaponProficiency: (a, b, c, d) => { return a.system.weapons[b][c][d]; },
    getLoadedAmmunition: (actor, weapon) => {
      for (const ammu of actor.itemTypes["Ammunition"]) {
        if (ammu.id == weapon.system.ammunitionID) {
          let asc = ammu.system.capacity;
          return `(${asc.max - asc.used} / ${asc.max})`;
        }
      }
      return "(empty)";
    },
    calcWeaponPL: (actor, weaponID) => { return actor._getWeaponPL(weaponID) },
    calcCombaticsPL: (actor) => { return actor._getCombaticsPL(); },
    checkRenderItem: (item, type) => {
      if (type !== "any" && item.type !== type) {
        return false;
      } else if (item.type == "Ammunition" && item.system.loaded) {
        return false;
      } else if (item.type == "Armour" && item.system.layer == "Outer" && item.system.equipped == true) {
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
    getStructurePoints: (a) => {return `(${a.system.structurePoints})`},
    getDmgModifier: (a) => {return `dmg: ${a.system.damage.bonus} / ${a.system.damage.penetration}`},
    getWeightClass: (weight, str) => {
      if (str == 0) return "";
      const overload = Math.max(Math.ceil((weight - str) / (str/2)), 0);
      return `(${LocalisationServer.localise("Overload")}: ${overload})`
    },
    getNextWeightClass: (weight, str) => {
      if (str == 0) return "";
      if (weight < str) return `${Math.floor(10 * (str-weight))/10}kg ${LocalisationServer.localise("to next level")}`
      const overload = Math.ceil((weight - str) / (str/2));
      let remaining = overload * (str/2) - (weight - str)
      return `${Math.floor(10 * remaining)/10}kg ${LocalisationServer.localise("to next level")}`
    },
    getWoundCoords: (details) => {
      let colour = details.bleeding > 0 ? "red" : "orange";
      let coords = details.coordinates;
      let icon = undefined;
      switch (details.status) {
        case "treatable":
          icon = "fa-regular fa-droplet";
          break;
        // case "coagulated":
        //   icon = "fa-regular fa-droplet-slash";
        //   break;
        case "treated":
          icon = "fa-light fa-bandage";
          break;
      }
      return `<div class="${colour}-dot" style="left: ${coords[0]}%; top: ${coords[1]}%;"></div>` +
      `<div class="dot-label" title="${LocalisationServer.localise(details.status, "item")}" style="left: ${coords[0]}%; top: ${coords[1]}%;">` +
      `<i class="${icon}"></i>` +
      `</div>`
    },
    getWoundIcon: (status) => {
      switch (status) {
        case "treatable":
          return "fa-droplet";
        // case "coagulated":
        //   return "fa-droplet-slash";
        case "treated":
          return "fa-bandage";
      }
    },
    restDescription: (restType) => {
      switch (restType) {
        case "short rest":
          return LocalisationServer.localise("short rest chat");
        case "long rest":
          return LocalisationServer.localise("long rest chat");
      }
    }
  })
}