import Aux from "../system/auxilliaries.js";
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

  Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
    // Hero token listeners
    new ContextMenu(html, ".attr-d20-chat", [{
      name: LocalisationServer.localise("Use hero token"),
      classes: "attr-context-menu",
      icon: "",
      condition: () => {
        let roll = html.find(".d20-overlay")[0];
        let actorId = roll.dataset.actorId;
        let actor = game.actors.get(actorId);
        let prevOutcome = parseInt(roll.innerText);
        return actor.system.heroToken.available > 0 && prevOutcome != 1;
      },
      callback: () => {
        let roll = html.find(".d20-overlay")[0];
        let threshold = parseInt(roll.dataset.threshold);
        let prevOutcome = parseInt(roll.innerText);
        if (prevOutcome == 1) {return undefined;}

        let outcome = ""
        let quality = 0
        if (prevOutcome > threshold && threshold > 1) {
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
        html.find("#context-menu").remove();
        chatMsgCls.update({"content": html.find(".message-content").html()})

        let actorId = roll.dataset.actorId;
        let actor = game.actors.get(actorId);
        actor.useHeroToken("attribute");
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