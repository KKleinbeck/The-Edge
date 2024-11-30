import Aux from "../system/auxilliaries.js";
import ProficiencyConfig from "../system/config-proficiencies.js";
import LocalisationServer from "../system/localisation_server.js";

export default function() {
    // const canApplyDefaultRolls = li => {
    //     return true
    // };
  Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
    html.find(".proficiency-roll").click(async ev => {
      if (Aux.hasRaceCondDanger("proficiency-roll")) return undefined;

      const target = ev.currentTarget;
      let actorID = target.dataset.actorId;
      let tokenID = target.dataset.tokenId;

      let actor = Aux.getActor(actorID, tokenID);

      let proficiency = target.dataset.proficiency;
      let proficiencyRoll = await actor.rollProficiencyCheck(proficiency, 0, false, false)
      let elem = $(target)
      elem.find(".roll").remove()
      switch (proficiencyRoll.outcome) {
        case "Success":
          elem.append(`<div style="${proficiencyRoll.diceResults}">${proficiencyRoll.quality} QL</div>`)
          break;
        case "Failure":
          elem.append(`<div style="${proficiencyRoll.diceResults}">${-proficiencyRoll.quality} FL</div>`)
      }
      let rollDescription = elem.parent().find(".roll-description")
      if (rollDescription) {
        console.log(rollDescription)
        rollDescription.append(`<b>${LocalisationServer.localise("Description")}: </b>`)
        rollDescription.append(ProficiencyConfig.rollOutcome(proficiency, proficiencyRoll.quality))
      }

      let followUps = await elem.parent().find(".roll-offline");
      followUps.removeClass("roll-offline")
    })

    html.find(".generic-roll").click(async ev => {
      if (Aux.hasRaceCondDanger("generic-roll")) return undefined;

      const target = ev.currentTarget;
      if (target.className.includes("roll-offline")) return undefined;

      let elem = $(target)
      let rollElems = elem.find(".roll")
      for (const rollElem of rollElems) {
        let roll = await new Roll(rollElem.dataset.roll).evaluate()
        rollElem.remove()
        elem.append(`<div class="output" style="width: 25px;">${roll.total}</div>`)
      }
      elem.find(".roll").remove()
    })
  })
}