import Aux from "../system/auxilliaries.js";
import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";
import ProficiencyConfig from "../system/config-proficiencies.js";
import LocalisationServer from "../system/localisation_server.js";
import NotificationServer from "../system/notifications.js";

const { renderTemplate } = foundry.applications.handlebars;

export default function() {
  Hooks.on("chatMessage", async (_chatLog, message, chatData) => {
    // costum chat commands
    const regexPH = CONFIG.ui.chat.MESSAGE_PATTERNS.givePH;
    const matchPH = regexPH.exec(message);
    if (matchPH) { return processGivePH(message, matchPH, chatData) }
    
    const regexHR = CONFIG.ui.chat.MESSAGE_PATTERNS.changeHR;
    const matchHR = regexHR.exec(message);
    if (matchHR) { return processChangeHR(message, matchHR, chatData) }

    return true;
  })

  Hooks.on("createChatMessage", async (data, _options, _userId) => {
    data.content = await replacePlaceholderInContent(
      data.content, data.system.item?.system ?? {}
    );
  })

  Hooks.on("renderChatMessageHTML", async (chatMsgCls, html, message) => {
    const newContent = await replacePlaceholderInContent(
      chatMsgCls.content, chatMsgCls.system.item?.system ?? {}
    );
    html.querySelector(".message-content").innerHTML = newContent;
    const sys = message.message.system;
    const actor = Aux.getActor(sys.actorId);

    // Adding context menus
    new foundry.applications.ux.ContextMenu(html, ".rerollable", [
      {
        name: LocalisationServer.localise("Use hero token"),
        classes: "roll-context-menu",
        icon: "",
        condition: (contextHtml) => {
          const prevRoll = parseInt(contextHtml.querySelector(".d20-overlay").innerText);
          const type = contextHtml.dataset.type;
          return actor.system.heroToken.available > 0 && (prevRoll != 1 || type == "proficiency");
        },
        callback: async (contextHtml) => {
          switch (contextHtml.dataset.type) {
            case "attribute":
              await heroTokenAttributeCheck(chatMsgCls, actor, sys)
              actor.useHeroToken("attribute");
              break;
            case "proficiency":
              await heroTokenProficiencyCheck(chatMsgCls, actor, sys)
              actor.useHeroToken("proficiency");
              break;
            case "weapon":
              const index = +contextHtml.dataset.index;
              await heroTokenWeaponCheck(chatMsgCls, actor, sys, index)
              actor.useHeroToken("weapon");
              break;
          }
        }
      },
      {
        name: LocalisationServer.localise("Reroll"),
        classes: "roll-context-menu",
        icon: "",
        condition: () => {return true;},
        callback: async (contextHtml) => {
          const newRoll = await DiceServer.genericRoll("1d20");
          const chatDetails = {name: game.user.name, new: newRoll};
          const index = +contextHtml.dataset.index;
          switch (contextHtml.dataset.type) {
            case "attribute":
              chatDetails.old = sys.diceResult;
              updateAttributeCheck(chatMsgCls, actor, sys, newRoll);
              chatDetails.check = LocalisationServer.localise(sys.attribute, "attr");
              break;
            case "proficiency":
              chatDetails.old = sys.diceResults[index];
              sys.diceResults[index] = newRoll;
              updateProficiencyCheck(chatMsgCls, actor, sys, sys.diceResults);
              chatDetails.check = LocalisationServer.localise(sys.proficiency, "proficiency");
              break;
            case "weapon":
              chatDetails.old = sys.rolls[index].res;
              const newResults = structuredClone(sys.rolls);
              newResults[index].res = newRoll;
              updateWeaponCheck(chatMsgCls, actor, sys, newResults, index);
              chatDetails.check = LocalisationServer.localise("combat", "combat");
              break;
          }
          ChatServer.transmitEvent("Reroll", {details: chatDetails});
        }
      },
      {
        name: LocalisationServer.localise("Change"),
        classes: "roll-context-menu",
        icon: "",
        condition: () => {return game.user.isGM;},
        callback: async (contextHtml) => {
          const chatDetails = {name: game.user.name};
          const index = +contextHtml.dataset.index;
          const newRoll = await Aux.promptInput("Change dice");
          if (!(newRoll && newRoll >= 1 && newRoll <= 20)) return;

          switch (contextHtml.dataset.type) {
            case "attribute":
              chatDetails.old = sys.diceResult;
              chatDetails.check = LocalisationServer.localise(sys.attribute, "attr");
              updateAttributeCheck(chatMsgCls, actor, sys, newRoll),
              chatDetails.new = newRoll;
              ChatServer.transmitEvent("Reroll", {details: chatDetails});
              break;
            case "proficiency":
              chatDetails.old = sys.diceResults[index];
              chatDetails.check = LocalisationServer.localise(sys.proficiency, "proficiency");
              sys.diceResults[index] = newRoll;
              updateProficiencyCheck(chatMsgCls, actor, sys, sys.diceResults);
              chatDetails.new = newRoll;
              ChatServer.transmitEvent("Reroll", {details: chatDetails});
              break;
            case "weapon":
              chatDetails.old = sys.rolls[index].res;
              chatDetails.check = LocalisationServer.localise("combat", "combat");
              const newResults = structuredClone(sys.rolls);
              newResults[index].res = newRoll;
              updateWeaponCheck(chatMsgCls, actor, sys, newResults, index);
              chatDetails.new = newRoll;
              ChatServer.transmitEvent("Reroll", {details: chatDetails});
              break;
          }
        }
      }
    ], {jQuery: false, fixed: true}) // jQuery Option can be removed with Foundry v14

    // Dynamic rolls listeners
    const proficiencyRoll = html.querySelector(".proficiency-roll");
    if (proficiencyRoll) {
      proficiencyRoll.addEventListener("click", async ev => {
        const target = ev.currentTarget;
        if (!rollIsReady("proficiency-roll", target)) return undefined;

        const actor = Aux.getActor(sys.actorId, sys.tokenId);
        const proficiencyRoll = await actor.rollProficiencyCheck({proficiency: sys.check}, "roll", false);
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
      applyDamageButton.addEventListener("click", async ev => {
        if (!game.user.isGM) {
          NotificationServer.notify("Requires GM")
          return ;
        }

        if (sys.targetId) {
          const scene = game.scenes.get(sys.sceneId);
          const target = scene.tokens.get(sys.targetId)?.actor;
          const protectionLog = await applyDamage(
            target, sys.damage, sys.penetration === undefined ? 0 : sys.penetration,
            sys.crits, sys.damageType, sys.name
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
      applyGrenadeDamage.addEventListener("click", async ev => {
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
            for (const protectionArray of Object.values(partialLog)) protection += protectionArray.sum();
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

async function heroTokenAttributeCheck (chatMsgCls, actor, sys) {
  if (sys.outcome == "Success") updateAttributeCheck(chatMsgCls, actor, sys, 1);
  else updateAttributeCheck(chatMsgCls, actor, sys, sys.threshold);
}

async function updateAttributeCheck(chatMsgCls, actor, sys, newResult) {
  sys.diceResult = newResult;
  sys.netOutcome = sys.threshold - newResult;
  const newSys = await actor.interpretCheck("attributes", sys)
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/attribute_check.html", newSys);
  updateChatMessage(chatMsgCls, newContent, newSys);
}

function heroTokenProficiencyCheck(chatMsgCls, actor, sys) {
  const modificator = sys.permanentMod + sys.temporaryMod;
  if (sys.netOutcome < 0) {
    for (let i = 0; i < 3; ++i) {
      sys.diceResults[i] = Math.min(
        sys.thresholds[i] + Math.floor(modificator / 3), 19
      );
    }
  } else {
    const indexMin = sys.diceResults.indexOf(Math.min(...sys.diceResults));
    for (let i = 0; i < 3; ++i) {
      if (i == indexMin) continue;
      sys.diceResults[i] = 1;
    }
  }
  updateProficiencyCheck(chatMsgCls, actor, sys, sys.diceResults);
}

async function updateProficiencyCheck(chatMsgCls, actor, sys, newResults) {
  const modificator = sys.permanentMod + sys.temporaryMod;
  sys.diceResults = newResults;
  sys.netOutcome = DiceServer.proficiencyNetOutcome(sys.diceResults, sys.thresholds, modificator);
  const newSys = await actor.interpretCheck("proficiencies", sys)
  if ("rollOutcome" in newSys) {
    sys.rollOutcome = ProficiencyConfig.rollOutcome(sys.proficiency, sys.quality).description;
  }
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/proficiency_check.html", sys);
  updateChatMessage(chatMsgCls, newContent, newSys);
}

function heroTokenWeaponCheck(chatMsgCls, actor, sys, index) {
  const newResults = structuredClone(sys.rolls);
  if (newResults[index].hit) newResults[index].res = 1;
  else newResults[index].res = sys.threshold;
  updateWeaponCheck(chatMsgCls, actor, sys, newResults, index);
}

async function updateWeaponCheck(chatMsgCls, actor, sys, newResults, index) {
  if ((newResults[index].res <= sys.threshold || newResults[index].res == 1) &&
    !actor.diceServer.interpretationParams.weapons.critFail.includes(newResults[index].res)) {
    newResults[index].hit = true;
  } else newResults[index].hit = false;

  // Which hit was modified?
  let hitIndex = 0;
  for (let i = 0; i < index; ++i) {
    if (sys.rolls[i].hit) hitIndex += 1;
  }

  if (sys.rolls[index].hit) { // Previous roll was a hit
    if (!newResults[index].hit) sys.damage.splice(hitIndex, 1);
    else if (actor.diceServer.interpretationParams.weapons.crit.includes(newResults[index].res) &&
      !actor.diceServer.interpretationParams.weapons.crit.includes(sys.rolls[index].res)) {
      sys.damage[hitIndex] += DiceServer.max(sys.damageRoll);
    } else if (newResults[index].res != 1 && sys.rolls[index].res == 1) {
      sys.damage[hitIndex] -= DiceServer.max(sys.damageRoll);
    }
  } else { // Precious roll wasn't a hit
    if (newResults[index].hit) {
      sys.damage = [
        ...sys.damage.slice(0, hitIndex),
        await DiceServer.genericRoll(sys.damageRoll),
        ...sys.damage.slice(hitIndex)
      ]
    }
    if (newResults[index].res == 1) {
      sys.damage[hitIndex] += DiceServer.max(sys.damageRoll);
    }
  }

  sys.rolls = newResults;
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/weapon_check.html", sys);
  updateChatMessage(chatMsgCls, newContent, sys);
}

function processGivePH(message, matches, chatData) {
  const user = game.users.get(chatData.user);
  if (!user.isGM) {
    const msg = LocalisationServer.localise("givePH permission", "chat");
    ui.notifications.notify(msg);
    chatData.content = msg;
    return false;
  }

  if (matches[1] === undefined) {
    chatData.content = message + "<br />" + LocalisationServer.localise("givePH help", "chat");
    return true;
  }
  const ph = +matches[1];
  const name = matches[2] ? matches[2].toLowerCase() : "all";
  const actors = _getActors(name);
  if (!actors.length) {
    chatData.content = message + _missingActorError(name);
    return true;
  }

  const names = [];
  for (const actor of actors) {
    actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
    names.push(actor.name);
  }

  chatData.content = `<h3>${LocalisationServer.localise("practice time", "chat")}</h3>` +
    LocalisationServer.parsedLocalisation("Practice message", "chat", {actors: names, phGain: ph})
  return true;
}

function processChangeHR(message, matches, chatData) {
  const user = game.users.get(chatData.user);
  if (!user.isGM) {
    const msg = LocalisationServer.parsedLocalisation(
      "command permission", "chat", {command: matches[1]}
    );
    ui.notifications.notify(msg);
    chatData.content = msg;
    return false;
  }
  
  if (matches[1] === undefined) {
    chatData.content = message + "<br />" + LocalisationServer.localise("changeHR help", "chat");
    return true;
  }
  const hr = matches[1];
  const name = matches[2] ? matches[2].toLowerCase() : "all";
  const actors = _getActors(name);
  if (!actors.length) {
    chatData.content = message + _missingActorError(name);
    return true;
  }

  const names = [];
  let newHRTitle = "";
  for (const actor of actors) {
    let newHR = 0;
    switch (hr) {
      case "Z1":
        newHR = actor.system.heartRate.min.value;
        newHRTitle = LocalisationServer.localise("Zone") + " 1";
        break;

      case "Z2":
        newHR = actor.hrZone1();
        newHRTitle = LocalisationServer.localise("Zone") + " 2";
        break;

      case "Z3":
        newHR = actor.hrZone2();
        newHRTitle = LocalisationServer.localise("Zone") + " 3";
        break;

      default:
        newHR = +hr;
        newHRTitle = hr;
    }
    actor.update({"system.heartRate.value": newHR});
    names.push(actor.name);
  }

  chatData.content = `<h3>${LocalisationServer.localise("change hr title", "chat")}</h3>` +
    LocalisationServer.parsedLocalisation("change hr message", "chat", {actors: names, newHR: newHRTitle});
  return true;
}

function _getActors(name) {
  const actors = [];
  if (name == "all") {
    for (const actor of game.actors) {
      if (actor.hasPlayerOwner && actor.type == "character") {
        actors.push(actor);
      }
    }
  } else {
    const actor = game.actors.find(x => x.name.toLowerCase() == name);
    if (!actor) return [];
    actors.push(actor);
  }
  return actors;
}

function _missingActorError(name) {
  if (name == "all") {
    return "<br />" + LocalisationServer.localise("No player actors", "Notifications");
  } else {
    return "<br />" + LocalisationServer.parsedLocalisation("missing actor", "chat", {actor: name});
  }
}

async function applyDamage(target, damage, penetration, crits, damageType, name) {
  const protectionLog = {};
  const partialLogs = [];
  for (let i = 0; i < damage.length; ++i){
    const partialLog = await target.applyDamage(damage[i], crits[i], penetration, damageType, name);
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

async function replacePlaceholderInContent(content, system) {
  const replacementPattern = /<div\s*class="replace-hook"\s*data-replace-by="([\w-]+)"\s*><\/div>/g;
  const matches = content.matchAll(replacementPattern);
  for (const match of matches) { // match = [fullMatch, replace-by]
    let result = ""
    switch (match[1]) {
      case "range-chart":
        const template = "systems/the_edge/templates/generic/range-chart.hbs";
        const details = {rangeChart: system.rangeChart};
        result = await renderTemplate(template, details);
        break;
    }
    content = content.replace(match[0], result);
  }
  return content;
}
