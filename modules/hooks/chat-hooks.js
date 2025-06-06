import Aux from "../system/auxilliaries.js";
import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";
import DialogChangeDice from "../dialogs/dialog-change-dice.js";
import ProficiencyConfig from "../system/config-proficiencies.js";
import LocalisationServer from "../system/localisation_server.js";

export default function() {
  const rollIsReady = (id, target) => {
      if (Aux.hasRaceCondDanger(id)) return false;
      if (target.className.includes("roll-offline")) return false;
      return true;
  };

  const rollFollowUps = elem => {
    let followUps = elem.parent().find(".roll-offline");
    followUps.removeClass("roll-offline")
  }

  const addRollDescription = (elem, msg) => {
    let rollDescription = elem.parent().find(".roll-description")
    if (rollDescription) {
      rollDescription.append(`<b>${LocalisationServer.localise("Description")}: </b>`)
      rollDescription.append(msg)
    }
  }

  const updateChatMessage = async (chatMsgCls, newContent, newSys) => {
    chatMsgCls.update({"content": newContent, "system": newSys});
  }

  const heroTokenAttributeCheck = async (chatMsgCls, actor, sys) => {
    if (sys.outcome == "Success") updateAttributeCheck(chatMsgCls, actor, sys, 1);
    else updateAttributeCheck(chatMsgCls, actor, sys, sys.threshold);
  }

  const updateAttributeCheck = async (chatMsgCls, actor, sys, newResult) => {
    sys.diceResult = newResult;
    sys.netOutcome = sys.threshold - newResult;
    const newSys = await actor.interpretCheck("attributes", sys)
    const newContent = await renderTemplate(
      "systems/the_edge/templates/chat/attribute_check.html", newSys);
    updateChatMessage(chatMsgCls, newContent, newSys);
  }

  const heroTokenProficiencyCheck = async (chatMsgCls, actor, sys) => {
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

  const updateProficiencyCheck = async (chatMsgCls, actor, sys, newResults) => {
    const modificator = sys.permanentMod + sys.temporaryMod;
    sys.diceResults = newResults;
    sys.netOutcome = DiceServer.proficiencyNetOutcome(sys.diceResults, sys.thresholds, modificator);
    const newSys = await actor.interpretCheck("proficiencies", sys)
    const newContent = await renderTemplate(
      "systems/the_edge/templates/chat/proficiency_check.html", sys);
    updateChatMessage(chatMsgCls, newContent, newSys);
  }

  const heroTokenWeaponCheck = async (chatMsgCls, actor, sys, index) => {
    const newResults = structuredClone(sys.rolls);
    if (newResults[index].hit) newResults[index].res = 1;
    else newResults[index].res = sys.threshold;
    updateWeaponCheck(chatMsgCls, actor, sys, newResults, index);
  }
  
  const updateWeaponCheck = async (chatMsgCls, actor, sys, newResults, index) => {
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

  const parseGivePH = (message, matches, chatData) => {
    const user = game.users.get(chatData.user);
    if (!user.isGM) {
      const msg = LocalisationServer.localise("givePH permission", "chat")
      ui.notifications.notify(msg)
      return false;
    }

    if (matches[2] === undefined) {
      chatData.content = message + "<br />" + LocalisationServer.localise("givePH help", "chat");
      return true;
    }
    const ph = +matches[2];
    const name = matches[3] ? matches[3].toLowerCase() : "all";
    const actors = [];
    if (name == "all") {
      for (const actor of game.actors) {
        if (actor.hasPlayerOwner) {
          actors.push(actor.name);
          actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
        }
      }
    } else {
      const actor = game.actors.find(x => x.name.toLowerCase() == name);
      if (!actor) {
        chatData.content = message + "<br />" +
          LocalisationServer.parsedLocalisation("missing actor", "chat", {actor: name});
        return true;
      }

      actors.push(actor.name);
      actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
    }

    if (actors.length > 0) {
      chatData.content = `<h3>${LocalisationServer.localise("practice time", "chat")}</h3>` +
        LocalisationServer.parsedLocalisation("Practice message", "chat", {actors: actors, phGain: ph})
    } else {
      const msg = LocalisationServer.localise("No actors to level up", "Notifications");
      ui.notifications.notify(msg);
      return false;
    }
    return true;
  }

  const applyDamage = async (target, damage, crits, damageType, name) => {
    const protectionLog = {};
    const partialLogs = [];
    for (let i = 0; i < damage.length; ++i){
      const partialLog = await target.applyDamage(damage[i], crits[i], damageType, name);
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

  // Hooks
  Hooks.on("chatMessage", async (chatLog, message, chatData) => {
    // costum chat commands
    const regexPH = CONFIG.ui.chat.MESSAGE_PATTERNS.givePH;
    const matchPH = regexPH.exec(message);
    if (matchPH) { return parseGivePH(message, matchPH, chatData) }

    return true;
  })

  Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
    // Hero token listeners
    const sys = message.message.system;
    const actor = Aux.getActor(sys.actorId);
    new ContextMenu(html, ".rerollable", [
      {
        name: LocalisationServer.localise("Use hero token"),
        classes: "roll-context-menu",
        icon: "",
        condition: (contextHtml) => {
          const prevRoll = parseInt(contextHtml.find(".d20-overlay").html());
          const type = contextHtml[0].dataset.type;
          return actor.system.heroToken.available > 0 && (prevRoll != 1 || type == "proficiency");
        },
        callback: async (contextHtml) => {
          switch (contextHtml[0].dataset.type) {
            case "attribute":
              await heroTokenAttributeCheck(chatMsgCls, actor, sys)
              actor.useHeroToken("attribute");
              break;
            case "proficiency":
              await heroTokenProficiencyCheck(chatMsgCls, actor, sys)
              actor.useHeroToken("proficiency");
              break;
            case "weapon":
              const index = +contextHtml[0].dataset.index;
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
          const index = +contextHtml[0].dataset.index;
          switch (contextHtml[0].dataset.type) {
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
          const index = +contextHtml[0].dataset.index;
          switch (contextHtml[0].dataset.type) {
            case "attribute":
              chatDetails.old = sys.diceResult;
              chatDetails.check = LocalisationServer.localise(sys.attribute, "attr");
              DialogChangeDice.start({
                update: (newRoll) => {
                  newRoll = Math.max(newRoll, 1);
                  updateAttributeCheck(chatMsgCls, actor, sys, newRoll),
                  chatDetails.new = newRoll;
                  ChatServer.transmitEvent("Reroll", {details: chatDetails});
                }, old: chatDetails.old
              })
              break;
            case "proficiency":
              chatDetails.old = sys.diceResults[index];
              chatDetails.check = LocalisationServer.localise(sys.proficiency, "proficiency");
              DialogChangeDice.start({
                update: (newRoll) => {
                  newRoll = Math.max(newRoll, 1);
                  sys.diceResults[index] = newRoll;
                  updateProficiencyCheck(chatMsgCls, actor, sys, sys.diceResults);
                  chatDetails.new = newRoll;
                  ChatServer.transmitEvent("Reroll", {details: chatDetails});
                }, old: chatDetails.old
              })
              break;
            case "weapon":
              chatDetails.old = sys.rolls[index].res;
              chatDetails.check = LocalisationServer.localise("combat", "combat");
              DialogChangeDice.start({
                update: (newRoll) => {
                  newRoll = Math.max(newRoll, 1);
                  const newResults = structuredClone(sys.rolls);
                  newResults[index].res = newRoll;
                  updateWeaponCheck(chatMsgCls, actor, sys, newResults, index);
                  chatDetails.new = newRoll;
                  ChatServer.transmitEvent("Reroll", {details: chatDetails});
                }, old: chatDetails.old
              })
              break;
          }
        }
      }
    ])

    // Dynamic rolls listeners
    html.find(".proficiency-roll").click(async ev => {
      const target = ev.currentTarget;
      if (!rollIsReady("proficiency-roll", target)) return undefined;

      const sys = message.message.system;
      const actor = Aux.getActor(sys.actorId, sys.tokenId);
      const proficiencyRoll = await actor.rollProficiencyCheck({proficiency: sys.check}, "roll", false);
      let elem = $(target)
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
      chatMsgCls.update({"content": html.find(".message-content").html()})
    })

    html.find(".generic-roll").click(async ev => {
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
      chatMsgCls.update({"content": html.find(".message-content").html()})
    })

    html.find(".apply-damage").on("click", async ev => {
      if (!game.user.isGM) {
        const msg = LocalisationServer.parsedLocalisation(
          "Requires GM", "Notifications", {weapon: "hand to hand", max: 1}
        )
        ui.notifications.notify(msg)
        return ;
      }

      console.log(html.html())
      const sys = message.message.system;
      if (sys.targetId) {
        const scene = game.scenes.get(sys.sceneId);
        const target = scene.tokens.get(sys.targetId)?.actor;
        const protectionLog = await applyDamage(target, sys.damage, sys.crits, sys.damageType, sys.name);
        if (Object.keys(protectionLog).length != 0) {
          const template = "systems/the_edge/templates/chat/meta-protection-Log.html";
          const protectionHtml = await renderTemplate(template, {protection: protectionLog});
          $(ev.currentTarget).replaceWith(protectionHtml);
        } else $(ev.currentTarget).remove();
      } else $(ev.currentTarget).remove();

      $(html.find(".rerollable")).removeClass("rerollable"); // No more edits after damage application
      $(html.find(".message-header")).remove(); // Remove old header bar
      chatMsgCls.update({"content": html.find(".message-content").html()});
    })
  })
}