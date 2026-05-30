import Aux from "../../system/auxilliaries.js";
import DialogProficiency from "../../dialogs/dialog-proficiency.js";
import DiceServer from "../../system/dice_server.js";
import ProficiencyConfig from "../../system/config-proficiencies.js";
import LocalisationServer from "../../system/localisation_server.js";
const { renderTemplate } = foundry.applications.handlebars;
export async function rollProficiencyCheck(event, sys, actor) {
    const target = event.currentTarget;
    if (!target)
        return;
    if (!rollIsReady("proficiency-roll", target))
        return;
    const checkData = {
        proficiency: sys.check, actor, actorId: actor.id, sceneId: canvas.scene.id, transmit: false
    };
    DialogProficiency.start(checkData, (rollDetails) => _onProficiencyCheck(rollDetails, target, sys));
}
async function _onProficiencyCheck(rollDetails, target, sys) {
    // This is not yet functioning and has to be reworked, once we use it again
    const elem = $(target);
    elem.find(".roll").remove();
    switch (rollDetails.outcome) {
        case "Success":
            elem.append(`<div title="${rollDetails.outcome}">${rollDetails.quality} QL</div>`);
            break;
        case "Failure":
            elem.append(`<div title="${rollDetails.outcome}">${-rollDetails.quality} FL</div>`);
    }
    const rollDescription = ProficiencyConfig.rollOutcome(sys.check, rollDetails.quality);
    _addRollDescription(elem, rollDescription);
    // rollFollowUps(elem);
}
function _addRollDescription(elem, msg) {
    let rollDescription = elem.parent().find(".roll-description");
    if (rollDescription) {
        rollDescription.append(`<b>${LocalisationServer.localise("Description")}: </b>`);
        rollDescription.append(msg);
    }
}
function rollIsReady(id, target) {
    if (Aux.hasRaceCondDanger(id))
        return false;
    if (target.className.includes("roll-offline"))
        return false;
    return true;
}
;
export async function applyDamage(_event, sys, html) {
    const details = sys.details; // TODO Type
    if (details.targetId) {
        const scene = game.scenes.get(sys.config.speaker.scene);
        const target = scene.tokens.get(details.targetId)?.actor;
        const protectionLog = await _applyDamage(target, details.damage, details.penetration === undefined ? 0 : details.penetration, details.rolls.map(x => x.crit), details.damageType, details.name);
        if (Object.keys(protectionLog).length != 0) {
            const template = "systems/the_edge/templates/chat/meta-protection-log.html";
            const protectionHtml = await renderTemplate(template, { protection: protectionLog });
            html.querySelector(".apply-damage").outerHTML = protectionHtml;
        }
        else
            await html.querySelector(".apply-damage").remove();
    }
    else
        await html.querySelector(".apply-damage").remove();
}
export async function applyGrenadeDamage(_event, sys, button) {
    const grenadeDetails = sys.details.grenade.system.subtypes.grenade;
    const maxDistance = Math.max(...grenadeDetails.blastDistance);
    const closeDistance = grenadeDetails.blastDistance[0];
    const scene = game.scenes.get(sys.details.sceneId);
    const grenadeTile = scene.tiles.get(sys.details.grenadeTileId);
    const logs = {};
    for (const token of scene.tokens) {
        if (token.actor.type === "Store")
            continue;
        const factor = scene.grid.distance / scene.grid.size;
        const distance = factor * Math.hypot(token.x - grenadeTile.x, token.y - grenadeTile.y);
        if (distance < maxDistance) {
            const damage = await DiceServer.genericRoll(grenadeDetails.damage[distance < closeDistance ? 0 : 1]);
            const partialLog = await _applyDamage(token.actor, [damage], 0, [false], grenadeDetails.type, sys.details.nameGrenade);
            // Add damage and protection to the log
            let protection = 0;
            for (const protectionArray of Object.values(partialLog))
                protection += protectionArray.sum();
            logs[token.actor.name] = {
                damage: damage,
                protection: protection
            };
        }
    }
    // Update the chat message
    if (Object.keys(logs).length != 0) {
        const template = "systems/the_edge/templates/chat/meta-grenade-damage.html";
        const damageHtml = await renderTemplate(template, { logs: logs, grenade: grenadeDetails });
        button.outerHTML = damageHtml;
    }
    else {
        button.outerHTML = LocalisationServer.localise("Harmless explosion", "text");
    }
    // Remove the grenade tile
    grenadeTile.delete();
}
async function _applyDamage(target, damage, penetration, crits, damageType, name) {
    const protectionLog = {};
    const partialLogs = [];
    for (let i = 0; i < damage.length; ++i) {
        const config = {
            crit: crits[i], damage: damage[i], damageType,
            name, penetration,
        };
        const partialLog = await target.system.applyDamage(config);
        partialLogs.push(partialLog);
    }
    // Two loop approach: 1. Setup Log, 2. Populate log
    for (const pL of partialLogs) {
        for (const key of Object.keys(pL))
            protectionLog[key] = [];
    }
    for (const key of Object.keys(protectionLog)) {
        for (const pL of partialLogs) {
            if (pL[key])
                protectionLog[key].push(pL[key]);
            else
                protectionLog[key].push(0);
        }
    }
    return protectionLog;
}
