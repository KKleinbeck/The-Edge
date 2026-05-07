import Aux from "../system/auxilliaries.js";
import DiceServer from "../system/dice_server.js";
import attachContextMenus from "./chat-hooks/context-menus.js";
import executeChatCommands from "./chat-hooks/chat-commands.js";
import ProficiencyConfig from "../system/config-proficiencies.js";
import LocalisationServer from "../system/localisation_server.js";
import NotificationServer from "../system/notifications.js";

const { renderTemplate } = foundry.applications.handlebars;

export default function() {
  Hooks.on("chatMessage", async (_chatLog, message, chatData) => {
    return executeChatCommands(message, chatData);
  })

  Hooks.on("createChatMessage", async (data, _options, _userId) => {
    data.content = await Aux.replacePlaceholderInContent(
      data.content, data.system.item?.system ?? {}
    );
  })

  Hooks.on("renderChatMessageHTML", async (chatMsgCls, html, message) => {
    const newContent = await Aux.replacePlaceholderInContent(
      chatMsgCls.content, chatMsgCls.system.item?.system ?? {}
    );
    html.querySelector(".message-content").innerHTML = newContent;
    const sys = message.message.system;
    const actor = Aux.getActorNew(message.message.speaker);

    // Adding context menus
    const contextMenuConfig: IContextMenuHookConfig = {
      actor: actor,
      chatMsgCls: chatMsgCls,
      html: html,
      system: message.message.system
    };
    attachContextMenus(contextMenuConfig);

    // Dynamic rolls listeners
    const proficiencyRoll = html.querySelector(".proficiency-roll");
    if (proficiencyRoll) {
      proficiencyRoll.addEventListener("click", async ev => {
        const target = ev.currentTarget;
        if (!rollIsReady("proficiency-roll", target)) return undefined;

        const proficiencyRoll = await actor.rollProficiencyCheck({proficiency: sys.check}, false);
        const elem = $(target)
        elem.find(".roll").remove()
        switch (proficiencyRoll.outcome) {
          case "Success":
            elem.append(`<div title="${proficiencyRoll.diceResults}">${proficiencyRoll.quality} QL</div>`)
            break;
          case "Failure":
            elem.append(`<div title="${proficiencyRoll.diceResults}">${-proficiencyRoll.quality} FL</div>`)
        }

        const rollDescription = ProficiencyConfig.rollOutcome(sys.check, proficiencyRoll.quality);
        addRollDescription(elem, rollDescription);

        rollFollowUps(elem);
        updateChatMessageFromHTML(chatMsgCls, html, sys);
      })
    }

    const genericRoll = html.querySelector(".generic-roll");
    if (genericRoll) {
      genericRoll.addEventListener("click", async ev => {
        const target = ev.currentTarget;
        if (!rollIsReady("generic-roll", target)) return undefined;

        let elem = $(target)
        let rollElems = elem.find(".roll")
        for (const rollElem of rollElems) {
          let roll = await new Roll(rollElem.dataset.roll).evaluate()
          rollElem.remove()
          elem.append(`<div class="output" style="width: 25px;">${roll.total}</div>`)
        }
        elem.find(".roll").remove()

        rollFollowUps(elem);
        updateChatMessageFromHTML(chatMsgCls, html, sys);
      })
    }

    const applyDamageButton = html.querySelector(".apply-damage");
    if (applyDamageButton) {
      applyDamageButton.addEventListener("click", async _ev => {
        if (!game.user.isGM) {
          NotificationServer.notify("Requires GM")
          return ;
        }

        const details: any = sys.details; // TODO Type
        if (details.targetId) {
          const scene = game.scenes.get(sys.config.speaker.scene);
          const target = scene.tokens.get(details.targetId)?.actor;
          const protectionLog = await applyDamage(
            target, details.damage, details.penetration === undefined ? 0 : details.penetration,
            details.rolls.map(x => x.crit), details.damageType, details.name
          );
          if (Object.keys(protectionLog).length != 0) {
            const template = "systems/the_edge/templates/chat/meta-protection-log.html";
            const protectionHtml = await renderTemplate(template, {protection: protectionLog});
            html.querySelector(".apply-damage").outerHTML = protectionHtml;
          } else await html.querySelector(".apply-damage").remove();
        } else await html.querySelector(".apply-damage").remove();

        updateChatMessageFromHTML(chatMsgCls, html, sys);
      })
    }
    
    const applyGrenadeDamage = html.querySelector(".apply-grenade-damage");
    if (applyGrenadeDamage) {
      applyGrenadeDamage.addEventListener("click", async _ev => {
        if (!game.user.isGM) {
          NotificationServer.notify("Requires GM")
          return ;
        }
        
        const grenadeDetails = sys.grenade.system.subtypes.grenade;
        const maxDistance = Math.max(...grenadeDetails.blastDistance);
        const closeDistance = grenadeDetails.blastDistance[0];

        const scene = game.scenes.get(sys.sceneId);
        const grenadeTile = scene.tiles.get(sys.grenadeTileId);
        const logs = {};
        for (const token of scene.tokens) {
          const factor = scene.grid.distance / scene.grid.size;
          const distance = factor * Math.hypot(token.x - grenadeTile.x, token.y - grenadeTile.y);
          if (distance < maxDistance) {
            const damage = await DiceServer.genericRoll(
              grenadeDetails.damage[distance < closeDistance ? 0 : 1]
            );
            const partialLog = await applyDamage(
              token.actor, [damage], 0, [false], grenadeDetails.type, sys.nameGrenade
            )

            // Add damage and protection to the log
            let protection = 0;
            for (const protectionArray of Object.values(partialLog)) protection += (protectionArray as Array<number>).sum();
            logs[token.actor.name] = {
              damage: damage,
              protection: protection
            };
          }
        }

        // Update the chat message
        if (Object.keys(logs).length != 0) {
          const template = "systems/the_edge/templates/chat/meta-grenade-damage.html";
          const damageHtml = await renderTemplate(
            template, {logs: logs, grenade: grenadeDetails}
          );
          applyGrenadeDamage.outerHTML = damageHtml;
        } else {
          applyGrenadeDamage.outerHTML = 
            LocalisationServer.localise("Harmless explosion", "text");
        }
        updateChatMessageFromHTML(chatMsgCls, html, sys);

        // Remove the grenade tile
        grenadeTile.delete();
      })
    }
  })
}

function rollIsReady(id, target) {
  if (Aux.hasRaceCondDanger(id)) return false;
  if (target.className.includes("roll-offline")) return false;
  return true;
};

function rollFollowUps(elem) {
  const followUps = elem.parent().find(".roll-offline");
  followUps.removeClass("roll-offline")
}

function addRollDescription(elem, msg) {
  let rollDescription = elem.parent().find(".roll-description")
  if (rollDescription) {
    rollDescription.append(`<b>${LocalisationServer.localise("Description")}: </b>`)
    rollDescription.append(msg)
  }
}

async function updateChatMessage (chatMsgCls, newContent, newSys) {
  chatMsgCls.update({"content": newContent, "system": newSys});
}

function updateChatMessageFromHTML(chatMsgCls, html, sys) {
  html.querySelector(".message-header")?.remove();
  updateChatMessage(
    chatMsgCls, html.querySelector(".message-content").innerHTML, sys
  )
}

async function applyDamage(target: foundryAny, damage: number[], penetration, crits: boolean[], damageType, name) {
  const protectionLog: any = {};
  const partialLogs: any[] = [];
  for (let i = 0; i < damage.length; ++i){
    const partialLog = await target.system.applyDamage(damage[i], crits[i], penetration, damageType, name);
    partialLogs.push(partialLog);
  }

  // Two loop approach: 1. Setup Log, 2. Populate log
  for (const pL of partialLogs) {
    for (const key of Object.keys(pL)) protectionLog[key] = [];
  }
  for (const key of Object.keys(protectionLog)) {
    for (const pL of partialLogs) {
      if (pL[key]) protectionLog[key].push(pL[key]);
      else protectionLog[key].push(0);
    }
  }
  return protectionLog;
}
