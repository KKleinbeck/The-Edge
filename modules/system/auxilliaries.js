import THE_EDGE from "./config-the-edge.js"
import LocalisationServer from "./localisation_server.js"

export default class Aux {
  static objectAt(obj, path) {
    return path.split(".").reduce((a,i) => a[i], obj);
  }

  static hasRaceCondDanger(id) {
    let lastUpdate = game.data[id]
    if (lastUpdate === undefined || Date.now() - lastUpdate > 100) {
      // Prevent too frequent updates to avoid race conditions
      game.data[id] = Date.now();
      return false;
    }
    return true;
  }

  static getActor(actorID, tokenID) {
    let actor = undefined
    if (tokenID) {
      const sceneID = game.canvas.id;
      const scene = game.scenes.get(sceneID);
      actor = scene.tokens.get(tokenID)?.actor;
      if (actor) return actor;
    }
    return game.actors.get(actorID);
  }

  static getProficiencyGroup(profName) {
    let map = THE_EDGE.effect_map["proficiencies"]
    for (const group of Object.keys(map)) {
        if (group === "all") continue;
        if (map[group].includes(profName)) return group;
    }
    return undefined;
  }

  static getWeaponGroup(weaponName) {
    let map = THE_EDGE.effect_map["weapons"]
    for (const group of Object.keys(map)) {
        if (group === "all") continue;
        if (map[group].includes(weaponName)) return group;
    }
    return undefined;
  }

  static _language_cost_table(humanSpoken) {
    return humanSpoken ? [200, 400, 1000, 2000, 3200, 3200] : [600, 3000, 6400]
  }

  static parseCostStr(costStr, maxLevel = undefined) {
    let cost = costStr.replace(/\s+/g, '') // w.o. whitespace
    const regex = /^(\d+\/)*\d+$/; // parse [n_1 / n_2 / ...] n_m
    if (regex.test(cost)) {
      const costs = cost.split('/').map(Number)
      if (!maxLevel || costs.length == maxLevel || costs.length == 1) {
        return cost.length == 1 ? costs[0] : costs;
      }
    }
    let msg = LocalisationServer.parsedLocalisation("Wrong cost string", "Notifications", {str: costStr})
    ui.notifications.notify(msg)
    return undefined;
  }

  static getSkillCost(skill, mode = undefined) {
    let level = skill.system.level;
    if (skill.type == "Languageskill") {
      if (mode == "delete") {
        return this._language_cost_table(skill.system.humanSpoken)
            .slice(0, level).reduce((a,b) => a+b, 0);
      }
      else if (mode == "increase") {
        if ((skill.system.humanSpoken && level == 6) || (!skill.system.humanSpoken && level == 3)) return undefined;
        return this._language_cost_table(skill.system.humanSpoken)[level];
      }
      return this._language_cost_table(skill.system.humanSpoken)[level - 1];
    }

    // combatskills, skills, medicalskills
    let maxLevel = skill.system.maxLevel
    let cost = this.parseCostStr(skill.system.cost, maxLevel)
    if (typeof cost === "undefined") return undefined;

    if (!isNaN(cost)) { // cost is number
      if (mode == "delete") return level * cost;
      else if (mode == "increase" && level == skill.system.maxLevel) return undefined;
      return +cost;
    }
    if (mode == "delete") return cost.slice(0,level).reduce((a,b) => a+b, 0);
    else if (mode == "increase") {
      if (level == skill.system.maxLevel) return undefined;
      return cost[level];
    }
    return cost[level - 1];
  }
}