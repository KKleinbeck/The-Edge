import THE_EDGE from "./config-the-edge.js"
import LocalisationServer from "./localisation_server.js"

export default class Aux {
  static objectAt(obj, path) {
    return path.split(".").reduce((a,i) => a[i], obj);
  }

  static parseRollType(html) { return html.find('[name="rolltype"]').val() || "roll"; }

  static hasRaceCondDanger(id) {
    const lastUpdate = game.data[id]
    if (lastUpdate === undefined || Date.now() - lastUpdate > 350) {
      // Prevent too frequent updates to avoid race conditions
      game.data[id] = Date.now();
      return false;
    }
    return true;
  }

  static getActor(actorID, tokenID, sceneID = undefined) {
    let actor = undefined;
    if (tokenID) {
      if (!sceneID) {
        if (!game.canvas.id) return undefined; // This can happen during startup of the game
        sceneID = game.canvas.id;
      }
      const scene = game.scenes.get(sceneID);
      actor = scene.tokens.get(tokenID)?.actor;
      if (actor) return actor;
    }
    return game.actors.get(actorID);
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

  static randomInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  static pickFromOdds(objectWithOdds) {
    let sum = 0;
    const cumSum = Object.values(objectWithOdds).map((sum = 0, n => sum += n));
    const threshold = this.randomInt(1, cumSum.last());
    const index = cumSum.findIndex(x => x >= threshold);
    return Object.keys(objectWithOdds)[index];
  }

  static generateWoundLocation(crit, sex, givenLocation = undefined) {
    let locationDescription = "";
    if (givenLocation === undefined) {
      if (crit) locationDescription = "Head";
      else {
        let rand = Math.random();
        if (rand < 0.15) locationDescription = "Legs" + ["Left", "Right"].random(); // 15%
        else if (rand < 0.30) locationDescription = "Arms" + ["Left", "Right"].random(); // 30%
        else locationDescription = "Torso"; // 65%, as p(crit) == 5%
      }
    } else {
      if (givenLocation == "Legs" || givenLocation == "Arms") {
        locationDescription = givenLocation + ["Left", "Right"].random();
      } else locationDescription = givenLocation;
    }
    let cordDescription = THE_EDGE.wounds_pixel_coords[sex][locationDescription]
    let [x0, y0] = cordDescription.coords[0];
    let [x1, y1] = cordDescription.coords[1];
    let r = cordDescription.radius * Math.random();
    let [t, phi] = [Math.random(), 2 * Math.PI * Math.random()];
    let x = (1-t)*x0 + t*x1 + r * Math.cos(phi);
    let y = (1-t)*y0 + t*y1 + r * Math.sin(phi);
    return [locationDescription, [x,y]];
  }

  static async detachFromParent(parent, childId, regainedAttachmentPoints) {
    const newAttachments = parent.system.attachments.filter(x => x.shellId != childId);
    await parent.update({
      "system.attachments": newAttachments,
      "system.attachmentPoints.used": parent.system.attachmentPoints.used - regainedAttachmentPoints
    });
  }
}