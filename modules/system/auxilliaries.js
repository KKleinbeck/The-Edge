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

  static getCombatant() {
    if (game.combat && game.combat.combatant) {
      const combatant = game.combat.combatant;
      return Aux.getActor(combatant.actorId, combatant.tokenId, combatant.sceneId);
    }
    return undefined;
  }

  static getToken(actorID, sceneID = undefined) {
    if (!sceneID) {
      if (!game.canvas.id) return undefined; // This can happen during startup of the game
      sceneID = game.canvas.id;
    }
    const scene = game.scenes.get(sceneID);
    for (var token of scene.tokens) {
      if (token.actorId === actorID) return token;
    }
    return null
  }

  static getPlayerTokens() {
    const sceneID = game.canvas.id;
    const scene = game.scenes.get(sceneID);

    const tokens = [];
    const userID = game.user.id;
    for (var token of scene.tokens) {
      if (token.actor.type === "character" && token.actor.ownership[userID] === 3) {
        tokens.push(token);
      }
    }
    return tokens;
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

  static skillHrChange(skill, actor) {
    return this.parseHrCostStr(
      skill.system.hrCost, skill.name,
      actor.system.heartRate.value,
      actor.system.heartRate.max.value,
      actor.getHRZone()
    );
  }

  static combatRoundHrChange() {
    const isRest = Math.max(...game.the_edge.combatLog.strainLog.map(x => x.hrChange)) <= 0;
    const threshold = isRest ? -Infinity : 0;
    return game.the_edge.combatLog.strainLog.reduce((a, b) => Math.max(b.hrChange, threshold) + a, 0);
  }

  static parseHrCostStr(costStr, skillName, hrValue, hrLimit, hrZone) {
    let cost = costStr.replace(/\s+/g, '') // w.o. whitespace
    let levels = cost.split("/");

    if (levels.length != 1 && levels.length != 3) {
      let msg = LocalisationServer.parsedLocalisation("Wrong hr cost string", "Notifications", {skill: skillName});
      ui.notifications.notify(msg);
      return undefined;
    }

    const relevantLevel = levels.length == 1 ? levels[0] : levels[hrZone - 1];
    if (relevantLevel.toUpperCase() == "N.A.") {
      let msg = LocalisationServer.parsedLocalisation("Invalid HR zone", "Notifications", {skill: skillName, zone: hrZone});
      ui.notifications.notify(msg);
      return undefined;
    }

    const regex = /^(\d+)(%?)(?:\((\d+)\))?$/;
    const match = relevantLevel.match(regex);

    if (!match) {
      let msg = LocalisationServer.parsedLocalisation("wrong hr cost format", "Notifications", {skill: skillName, str: relevantLevel});
      ui.notifications.notify(msg);
      return undefined;
    }
    var hrChange = parseInt(match[1]);
    if (match[2] === '%') hrChange = Math.floor((hrLimit - hrValue) * hrChange / 100);
    if (match[3]) hrChange = Math.max(hrChange, parseInt(match[3]));
    return hrChange;
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
        else if (rand < 0.30) locationDescription = "Arms" + ["Left", "Right"].random(); // 15%
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

  static async promptInput(title_dialog_id = "Prompt number") {
    var result = await foundry.applications.api.DialogV2.prompt({
      window: { title: LocalisationServer.localise(title_dialog_id, "dialog") },
      position: { width: 100 },
      content: '<input name="input" type="number" step="1" autofocus style="text-align: right;">',
      ok: {
        label: LocalisationServer.localise("Submit", "dialog"),
        callback: (_event, button, _dialog) => button.form.elements.input.valueAsNumber
      }
    });
    return result;
  }
}