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

  const rerollAttributeCheck = (html, contextHtml) => {
    let roll = contextHtml.find(".d20-overlay");
    let threshold = parseInt(roll[0].dataset.threshold);
    let prevRoll = parseInt(roll[0].innerText);

    let outcome = ""
    let quality = 0
    if (prevRoll > threshold && threshold > 1) {
      $(roll).html(threshold);
      outcome = LocalisationServer.localise("Success");
    } else {
      $(roll).html(1)
      outcome = LocalisationServer.localise("CritSuccess");
      quality = Math.floor((threshold - 1) / 2) + 2;
    }
    let outcomeText = html.find(".attr-outcome");
    $(outcomeText).html(outcome)
    let qualityText = html.find(".attr-quality")
    $(qualityText).html(`${quality}&thinsp;QL`)
    return html;
  }

  const rerollProficiencyCheck = (html, contextHtml) => {
    let qualityText = html.find(".prof-quality");
    const prevQuality = qualityText[0].dataset.quality;

    let reserves = 0;
    let rolls = html.find(".d20-overlay");
    for (const roll of rolls) {
      let threshold = parseInt(roll.dataset.threshold);
      let newRes = prevQuality < 0 ? Math.max(threshold, 1) : 1
      $(roll).html(newRes)
      reserves += threshold - newRes;
      if (newRes == 1) reserves += 3;
    }

    let outcome = ""
    if (prevQuality < 0) {
      outcome = LocalisationServer.localise("Success");
    } else {
      outcome = LocalisationServer.localise("CritSuccess");
    }
    let outcomeText = html.find(".prof-outcome");
    $(outcomeText).html(outcome)
    let quality = Math.floor(reserves / 3)
    $(qualityText).html(`${quality}&thinsp;QL`)
    qualityText[0].dataset.quality = quality;
    return html;
  }

  const rerollWeaponCheck = async (html, contextHtml) => {
    let roll = contextHtml.find(".d20-overlay");
    let threshold = parseInt(roll[0].dataset.threshold);
    let hitIndex = 0;
    let index = contextHtml[0].dataset.index;
    for (const _roll of html.find(".d20-overlay")) {
      if ($(_roll).parent()[0].dataset.index >= index) break;
      if (parseInt(_roll.innerText) <= threshold) hitIndex += 1;
    }

    let prevRoll = parseInt(roll[0].innerText);
    let crit = !(prevRoll > threshold && threshold > 1)
    if (crit) {
      $(roll).html(1)
    } else {
      $(roll).html(threshold);
      contextHtml.removeClass("d20-end").addClass("d20-cha");
    }

    let damageList = html.find(".damage-list");
    let damageRoll = contextHtml[0].dataset.damageRoll;
    let newDamage = (await DiceServer.genericRoll(damageRoll));
    if (prevRoll > threshold) { // Add new damage box
      if (threshold <= 1) newDamage +=  DiceServer.max(damageRoll);

      let noDamageBox = damageList.find(".no-damage-box");
      if (noDamageBox.length > 0) {
        noDamageBox.removeClass("no-damage-box").addClass(["damage-box", "hit-index-0"]);
        $(noDamageBox.find(".d20-overlay-weapon")).html(`${newDamage}`);
        $(noDamageBox.find(".d20-overlay-weapon"))[0].dataset["tooltip"] = damageRoll;
      } else { // Add a new element to the end, then shuffle it to the correct location
        damageList.append(damageList.children()[1].outerHTML);
        let newEntry = $(damageList.children().last());
        $(newEntry.children()[0]).html(`${newDamage}`)
        damageList.children().eq(hitIndex + 1).before(damageList.children().last())
      }
    } else { // convert to crit
      newDamage = DiceServer.max(damageRoll);
      let target = $(damageList.children()[hitIndex + 1]).children()[0];
      let oldDamage = parseInt(target.innerText);
      $(target).html(`${oldDamage + newDamage}`);
    }

    let targetId = contextHtml[0].dataset.targetId;
    let target = Aux.getActor(undefined, targetId);
    let damageType = contextHtml[0].dataset.damageType;
    target.applyDamage(newDamage, crit, damageType, LocalisationServer.localise("HeroToken"));
    return [html, newDamage]
  }

  // Hooks
  Hooks.on("chatMessage", (chatLog, message, speaker) => {
    const command = message.split(" ")[0];
    const user = game.users.get(speaker.user);
    
    if (user.isGM) {
      switch (command) {
        case ">help":
          let content = "Available commands:<br />";
          content += "givePH amount PlayerName|[all]";
          const d = new Dialog({
            title: game.i18n.localize("Help"),
            content: content,
            buttons: {cancel: {label: game.i18n.localize("DIALOG.CANCEL")}},
            default: "cancel"
          })
          d.options.width = 300;
          d.render(true);
          break;
        
        case ">givePH":
          const pattern = /^>givePH\s*(\d+)\s*([a-zA-Z0-9 ]*)?$/;
          const matchPH = pattern.exec(message);
          if (matchPH === null) break;
          const ph = +matchPH[1];
          const name = matchPH[2] ? matchPH[2].toLowerCase() : "all";
          if (name == "all") {
            for (const actor of game.actors) {
              if (actor.hasPlayerOwner) {
                actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
              }
            }
          } else {
            const actor = game.actors.find(x => x.name.toLowerCase() == name);
            if (!actor) break;

            actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
          }
          break;
      }
    }
  })

  Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
    // Hero token listeners
    new ContextMenu(html, ".rerollable", [{
      name: LocalisationServer.localise("Use hero token"),
      classes: "attr-context-menu",
      icon: "",
      condition: (contextHtml) => {
        let actorId = contextHtml[0].dataset.actorId;
        let actor = game.actors.get(actorId);
        let prevRoll = parseInt(contextHtml.find(".d20-overlay").innerText);
        let type = contextHtml[0].dataset.type;
        return actor.system.heroToken.available > 0 && (prevRoll != 1 || type == "proficiency");
      },
      callback: async (contextHtml) => {
        let actorId = contextHtml[0].dataset.actorId;
        let actor = game.actors.get(actorId);
        switch (contextHtml[0].dataset.type) {
          case "attribute":
            html = rerollAttributeCheck(html, contextHtml)
            actor.useHeroToken("attribute");
            break;
          case "proficiency":
            html = rerollProficiencyCheck(html, contextHtml)
            actor.useHeroToken("proficiency");
            break;
          case "weapon":
            let damage = undefined;
            [html, damage] = await rerollWeaponCheck(html, contextHtml)
            actor.useHeroToken("weapon", {damage: damage});
            break;
        }
        html.find("#context-menu").remove();
        chatMsgCls.update({"content": html.find(".message-content").html()})
      }
    }])

    // Dynamic rolls listeners
    html.find(".proficiency-roll").click(async ev => {
      const target = ev.currentTarget;
      if (!rollIsReady("proficiency-roll", target)) return undefined;

      let actorID = target.dataset.actorId;
      let tokenID = target.dataset.tokenId;

      let actor = Aux.getActor(actorID, tokenID);

      let proficiency = target.dataset.proficiency;
      let proficiencyRoll = await actor.rollProficiencyCheck(proficiency, 0, false, false)
      let elem = $(target)
      elem.find(".roll").remove()
      switch (proficiencyRoll.outcome) {
        case "Success":
          elem.append(`<div title="${proficiencyRoll.diceResults}">${proficiencyRoll.quality} QL</div>`)
          break;
        case "Failure":
          elem.append(`<div title="${proficiencyRoll.diceResults}">${-proficiencyRoll.quality} FL</div>`)
      }

      let rollDescription = ProficiencyConfig.rollOutcome(proficiency, proficiencyRoll.quality);
      addRollDescription(elem, rollDescription)

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
  })
}