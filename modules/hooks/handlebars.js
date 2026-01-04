import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";
import THE_EDGE from "../system/config-the-edge.js";

export default function() {
  Handlebars.registerHelper({
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
    effectRequirementName: (a, b) => LocalisationServer.effectLocalisation(a, b),
    genRange: (a) => {
      let preface = a.split("_")[0];
      let distance = a.split("_")[1];
      if (preface == "less") return "< " + distance;
      return "> " + distance;
    },
    size: (a) => { return a.size; },
    length: (a) => { return a.length; },
    objectLength: (a) => { return Object.keys(a).length; },
    round: (a, b) => { return a.toFixed(b); },
    strCombine: (a, b) => { return a + " " + b; },

    concat: (a, b) => { return a.toString().concat(b.toString()); },
    checkEqual: (a, b) => { return a === b; },
    checkIn: (a, b) => { return b[a] !== undefined; },
    checkInstance: (a, b) => { return b.includes(a); },
    checkNotEmpty: (a) => { if (!a) return false; return a.length !== 0; },
    checkNotEmptyObject: (a) => {
      if (!a) return false;
      return Object.keys(a).length !== 0;
    },
    checkSubtypedItem: (a) => { return (a == "Weapon" || a == "Consumables");},
    checkST: (a, b) => { return a < b; },
    checkSET: (a, b) => { return a <= b; },
    checkAttachment: (a) => { return a.system?.layer === "Outer"; },
    getSys: (a, b, c, d) => { return a.system[b][c][d]; },
    getSys5: (a, b, c, d, e) => { return a.system[b][c][d][e]; },
    getEntry: (a, b) => { return a[b]; },
    log: (a) => console.log(a),
    add: (a, b) => { return +a + +b; },
    sub: (a, b) => { return a - b; },
    div: (a, b) => { if (b == 0) return undefined; return a / b; },
    mul: (a, b) => { return a * b; },
    range: (n) => { return Array(n).fill(0).map((_, index)=> index); },
    capitalise: (a) => { return a.charAt(0).toUpperCase() + a.slice(1); },
    anyObjectValues: (a) => { return Object.values(a).some(x => x); },
    storePrice: (a, b) => { return Math.round(a * b / 10) * 10; },
    times: (n, block) => {
      let accum = "";
      for (let i = 0; i < n; ++ i) accum += block.fn(i);
      return accum;
    },

    getActiveGrenadeEffects: (a) => {
      const effects = [];
      for (const [key, value] of Object.entries(a)) {
        if (value) effects.push(key);
      }
      return effects;
    },
    getProficiency: (a, b, c, d) => { return a.system.proficiencies[b][c][d]; },
    getProficiencyDice: (a, b, c, d) => { return a.system.proficiencies[b][c].dices[d]; },
    getWeaponProficiency: (a, b, c, d) => { return a.system.weapons[b][c][d]; },
    getWeaponLevel: (actor, weaponType) => { return actor.getWeaponLevel(weaponType); },
    getLoadedAmmunition: (actor, weapon) => {
      if (weapon.system.type == "Hand-to-Hand combat") return "";
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
    checkDisplayEffects: (name, effects) => {
      if (name == "effects") return true;
      return effects.length != 0;
    },
    checkHasMultipleStacked: (systemData) => {
      if ("quantity" in systemData && systemData.quantity > 1) return true;
      return false;
    },
    getRangeModifier: (rangeChart, distance) => {
      if (distance < 2) return `(${rangeChart["less_2m"][0]} / ${rangeChart["less_2m"][1]})`;
      else if (distance < 20) return `(${rangeChart["less_20m"][0]} / ${rangeChart["less_20m"][1]})`;
      else if (distance < 200) return `(${rangeChart["less_200m"][0]} / ${rangeChart["less_200m"][1]})`;
      else if (distance < 1000) return `(${rangeChart["less_1km"][0]} / ${rangeChart["less_1km"][1]})`;
      return `(${rangeChart["more_1km"][0]} / ${rangeChart["more_1km"][1]})`;
    },
    getSizeModifier: (size) => {
      return `(${THE_EDGE.sizeModifiers[size][0]} / ${THE_EDGE.sizeModifiers[size][1]})`
    },
    getAmmunitionCount: (a) => {return `(${a.system.capacity.max - a.system.capacity.used} / ${a.system.capacity.max})`},
    getStructurePoints: (a) => {return `(${a.system.structurePoints})`},
    getAttachmentDetails: (actorId, tokenId, shellId) => {
      const actor = Aux.getActor(actorId, tokenId);

      const shell = actor.items.get(shellId);
      return `${shell.name} (${shell.system.structurePoints})`;
    },
    getDmgModifier: (a) => {return `dmg: ${a.system.damage.bonus} / ${a.system.damage.penetration}`},
    getNextWeightClass: (weightTillNextOverload) => {
      return `${Math.floor(10 * weightTillNextOverload)/10}kg ${LocalisationServer.localise("to next level")}`
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