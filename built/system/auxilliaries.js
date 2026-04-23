import THE_EDGE from "./config-the-edge.js";
import LocalisationServer from "./localisation_server.js";
import NotificationServer from "./notifications.js";
const { renderTemplate } = foundry.applications.handlebars;
export default class Aux {
    static asChance(value, asHtmlString = false) {
        value *= 100;
        if (!asHtmlString)
            return value;
        return `${value.toFixed(1)}&nbsp;%`;
    }
    static objectAt(obj, path) {
        return path.split(".").reduce((a, i) => a[i], obj);
    }
    static sleep(duration) { return new Promise(r => setTimeout(r, duration)); }
    static hasRaceCondDanger(id) {
        const lastUpdate = game.data[id];
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
                if (!game.canvas.id)
                    return undefined; // This can happen during startup of the game
                sceneID = game.canvas.id;
            }
            const scene = game.scenes.get(sceneID);
            actor = scene.tokens.get(tokenID)?.actor;
            if (actor)
                return actor;
        }
        return game.actors.get(actorID);
    }
    static getActorNew(speakerData) {
        if (speakerData.token) {
            const sceneID = speakerData.scene;
            if (!sceneID) {
                if (!game.canvas.id)
                    return undefined; // This can happen during startup of the game
                speakerData.scene = game.canvas.id;
            }
            const scene = game.scenes.get(sceneID);
            const actor = scene.tokens.get(speakerData.token)?.actor;
            if (actor)
                return actor;
        }
        return game.actors.get(speakerData.actor);
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
            if (!game.canvas.id)
                return undefined; // This can happen during startup of the game
            sceneID = game.canvas.id;
        }
        const scene = game.scenes.get(sceneID);
        for (var token of scene.tokens) {
            if (token.actorId === actorID)
                return token;
        }
        return null;
    }
    static getPlayerTokens() {
        const scene = game.canvas.scene;
        const tokens = [];
        for (var token of scene.tokens) {
            if (token.actor.type === "character" && token.isOwner) {
                tokens.push(token);
            }
        }
        return tokens;
    }
    static _language_cost_table(humanSpoken) {
        return humanSpoken ? [200, 400, 1000, 2000, 3200, 3200] : [600, 3000, 6400];
    }
    static parseCostStr(costStr, maxLevel = undefined) {
        let cost = costStr.replace(/\s+/g, ''); // w.o. whitespace
        const regex = /^(\d+\/)*\d+$/; // parse [n_1 / n_2 / ...] n_m
        if (regex.test(cost)) {
            const costs = cost.split('/').map(Number);
            if (!maxLevel || costs.length == maxLevel || costs.length == 1) {
                return cost.length == 1 ? costs[0] : costs;
            }
        }
        NotificationServer.notify("Wrong cost string", { str: costStr });
        return undefined;
    }
    static async parseStrainCostStr(skill, currentStrainLevel) {
        const costs = skill.system.strainCost.replace(/\s+/g, '').split("/");
        if (costs.length != 1 && costs.length != 5) {
            NotificationServer.notify("Wrong strain cost string", { skillName: skill.name });
            return undefined;
        }
        const costRoll = costs.length == 1 ? costs[0] : costs[currentStrainLevel];
        if (costRoll.toUpperCase() == "N.A.") {
            NotificationServer.notify("Invalid Strain Level", { skillName: skill.name, level: currentStrainLevel });
            return undefined;
        }
        else if (!Roll.validate(costRoll)) {
            NotificationServer.notify("Wrong Strain cost Format", { skillName: skill.name, costRoll: costRoll });
            return undefined;
        }
        const roll = await new Roll(costRoll).evaluate();
        return roll.total;
    }
    static getSkillCost(skill, mode = undefined) {
        let level = skill.system.level;
        if (skill.type == "Languageskill") {
            if (mode == "delete") {
                return this._language_cost_table(skill.system.humanSpoken)
                    .slice(0, level).reduce((a, b) => a + b, 0);
            }
            else if (mode == "increase") {
                if ((skill.system.humanSpoken && level == 6) || (!skill.system.humanSpoken && level == 3))
                    return undefined;
                return this._language_cost_table(skill.system.humanSpoken)[level];
            }
            return this._language_cost_table(skill.system.humanSpoken)[level - 1];
        }
        // combatskills, skills, medicalskills
        let maxLevel = skill.system.maxLevel;
        let cost = this.parseCostStr(skill.system.cost, maxLevel);
        if (typeof cost === "undefined")
            return undefined;
        if (!isNaN(cost)) { // cost is number
            if (mode == "delete")
                return level * cost;
            else if (mode == "increase" && level == skill.system.maxLevel)
                return undefined;
            return +cost;
        }
        if (mode == "delete")
            return cost.slice(0, level).reduce((a, b) => a + b, 0);
        else if (mode == "increase") {
            if (level == skill.system.maxLevel)
                return undefined;
            return cost[level];
        }
        return cost[level - 1];
    }
    static randomInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
    static pickFromOdds(objectWithOdds) {
        let sum = 0;
        const cumSum = Object.values(objectWithOdds).map((n, _index, _array) => { sum += n; return sum; });
        const threshold = this.randomInt(1, cumSum.last());
        const index = cumSum.findIndex(x => x >= threshold);
        return Object.keys(objectWithOdds)[index];
    }
    static generateWoundLocation(crit, sex, givenLocation = undefined) {
        let locationDescription = "";
        if (givenLocation === undefined) {
            if (crit)
                locationDescription = "Head";
            else {
                let rand = Math.random();
                if (rand < 0.15)
                    locationDescription = "Legs" + ["Left", "Right"].random(); // 15%
                else if (rand < 0.30)
                    locationDescription = "Arms" + ["Left", "Right"].random(); // 15%
                else
                    locationDescription = "Torso"; // 65%, as p(crit) == 5%
            }
        }
        else {
            if (givenLocation == "Legs" || givenLocation == "Arms") {
                locationDescription = givenLocation + ["Left", "Right"].random();
            }
            else
                locationDescription = givenLocation;
        }
        let cordDescription = THE_EDGE.wounds_pixel_coords[sex][locationDescription];
        let [x0, y0] = cordDescription.coords[0];
        let [x1, y1] = cordDescription.coords[1];
        let r = cordDescription.radius * Math.random();
        let [t, phi] = [Math.random(), 2 * Math.PI * Math.random()];
        let x = (1 - t) * x0 + t * x1 + r * Math.cos(phi);
        let y = (1 - t) * y0 + t * y1 + r * Math.sin(phi);
        return [locationDescription, [x, y]];
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
    static tokenDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    static async replacePlaceholderInContent(content, context) {
        // TODO: phase out by directly acting on DOM, see hooks/applications.ts
        const replacementPattern = /<div\s*class="replace-hook"\s*data-replace-by="([\w-]+)"\s*><\/div>/g;
        const matches = content.matchAll(replacementPattern);
        for (const match of matches) { // match = [fullMatch, replace-by]
            let result = "";
            let template = "";
            let details = {};
            switch (match[1]) {
                case "range-chart":
                    template = "systems/the_edge/templates/generic/range-chart.hbs";
                    details = { rangeChart: context.rangeChart };
                    result = await renderTemplate(template, details);
                    break;
                case "slider":
                    template = "systems/the_edge/template/generic/slider.hbs";
                    details = {};
                    result = await renderTemplate(template, details);
                    break;
            }
            content = content.replace(match[0], result);
        }
        return content;
    }
    static proficiencySuccessChance(baseThreshold, diceParameters) {
        const { critDice = [], critBonus = 0, critDieBonus = 0, critFailDice = [], critFailMalus = 0, critFailDieMalus = 0, } = diceParameters;
        const FACES = 20;
        const total = FACES ** 4;
        let successes = 0;
        for (let d1 = 1; d1 <= FACES; d1++) {
            for (let d2 = 1; d2 <= FACES; d2++) {
                for (let d3 = 1; d3 <= FACES; d3++) {
                    for (let d4 = 1; d4 <= FACES; d4++) {
                        const tuple = [d1, d2, d3, d4];
                        const critCount = tuple.filter(v => critDice.includes(v)).length;
                        const critFailCount = tuple.filter(v => critFailDice.includes(v)).length;
                        let threshold = baseThreshold;
                        threshold += critDieBonus * critCount;
                        threshold += critFailDieMalus * critFailCount;
                        if (critCount >= critFailCount + 2) {
                            threshold += critBonus;
                        }
                        else if (critFailCount >= critCount + 2) {
                            threshold += critFailMalus;
                        }
                        const sum = d1 + d2 + d3 + d4;
                        if (sum <= threshold) {
                            successes++;
                        }
                    }
                }
            }
        }
        return successes / total;
    }
}
