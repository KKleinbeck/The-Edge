import Aux from "../system/auxilliaries.js";
import DiceServer from "../system/dice_server.js";
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

  const heroTokenAttributeCheck = async (sys) => {
    if (sys.outcome == "Success") {
      sys.diceResult = 1,
      sys.netOutcome = sys.threshold - 1;
    } else {
      sys.diceResult = sys.threshold;
      sys.netOutcome = 0;
    }
    const actor = Aux.getActor(sys.actorId, sys.tokenId, sys.sceneId);
    sys = await actor.interpretCheck("attributes", sys)
  }

  const heroTokenProficiencyCheck = async (sys) => {
    const modificator = sys.permanentMod + sys.temporaryMod;
    if (sys.netOutcome < 0) {
      for (let i = 0; i < 3; ++i) {
        sys.diceResults[i] = Math.min(
          sys.thresholds[i] + Math.floor(modificator / 3), 19
        );
      }
      sys.netOutcome = modificator - 3 * Math.floor(modificator / 3);
    } else {
      const indexMin = sys.diceResults.indexOf(Math.min(...sys.diceResults));
      let newNetOutcome = 0;
      for (let i = 0; i < 3; ++i) {
        if (i == indexMin) {
          newNetOutcome += sys.thresholds[i] - sys.diceResults[i];
          continue;
        }
        sys.diceResults[i] = 1;
        newNetOutcome += sys.thresholds[i] - 1;
      }
      sys.netOutcome = newNetOutcome + modificator;
    }
    const actor = Aux.getActor(sys.actorId, sys.tokenId, sys.sceneId);
    sys = await actor.interpretCheck("proficiencies", sys)
  }

  const heroTokenWeaponCheck = async (contextHtml, sys) => {
    // Which hit was modified?
    const index = contextHtml[0].dataset.index;
    let hitIndex = 0;
    for (let i = 0; i < index; ++i) {
      if (sys.rolls[i].hit) hitIndex += 1;
    }

    // Modify the html
    if (sys.rolls[index].hit) { // convert to crit
      sys.rolls[index].res = 1;
      sys.damage[hitIndex] += DiceServer.max(sys.damageRoll);
    } else {
      sys.rolls[index].res = sys.threshold;
      sys.rolls[index].hit = true;
      sys.damage = [
        ...sys.damage.slice(0, hitIndex),
        await DiceServer.genericRoll(sys.damageRoll),
        ...sys.damage.slice(hitIndex)
      ]
      if (sys.threshold == 1) sys.damage[hitIndex] += DiceServer.max(sys.damageRoll);
    }
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
    const actor = Aux.getActor(sys.actorId, sys.tokenId, sys.sceneId);
    new ContextMenu(html, ".rerollable", [{
      name: LocalisationServer.localise("Use hero token"),
      classes: "roll-context-menu",
      icon: "",
      condition: (contextHtml) => {
        const prevRoll = parseInt(contextHtml.find(".d20-overlay").html());
        const type = contextHtml[0].dataset.type;
        return actor.system.heroToken.available > 0 && (prevRoll != 1 || type == "proficiency");
      },
      callback: async (contextHtml) => {
        let newContent = "";
        switch (contextHtml[0].dataset.type) {
          case "attribute":
            await heroTokenAttributeCheck(sys)
            newContent = await renderTemplate(
              "systems/the_edge/templates/chat/attribute_check.html", sys);
            actor.useHeroToken("attribute");
            break;
          case "proficiency":
            html = heroTokenProficiencyCheck(sys)
            newContent = await renderTemplate(
              "systems/the_edge/templates/chat/proficiency_check.html", sys);
            actor.useHeroToken("proficiency");
            break;
          case "weapon":
            await heroTokenWeaponCheck(contextHtml, sys)
            newContent = await renderTemplate(
              "systems/the_edge/templates/chat/weapon_check.html", sys);
            actor.useHeroToken("weapon");
            break;
        }
        chatMsgCls.update({"content": newContent, "system": sys})
      }
    }])

    // Dynamic rolls listeners
    html.find(".proficiency-roll").click(async ev => {
      const target = ev.currentTarget;
      if (!rollIsReady("proficiency-roll", target)) return undefined;

      const actorID = target.dataset.actorId;
      const tokenID = target.dataset.tokenId;

      const actor = Aux.getActor(actorID, tokenID);

      const proficiency = target.dataset.proficiency;
      const proficiencyRoll = await actor.rollProficiencyCheck(proficiency, 0, false, false)
      let elem = $(target)
      elem.find(".roll").remove()
      switch (proficiencyRoll.outcome) {
        case "Success":
          elem.append(`<div title="${proficiencyRoll.diceResults}">${proficiencyRoll.quality} QL</div>`)
          break;
        case "Failure":
          elem.append(`<div title="${proficiencyRoll.diceResults}">${-proficiencyRoll.quality} FL</div>`)
      }

      const rollDescription = ProficiencyConfig.rollOutcome(proficiency, proficiencyRoll.quality);
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

      chatMsgCls.update({"content": html.find(".message-content").html()});
    })
  })
}