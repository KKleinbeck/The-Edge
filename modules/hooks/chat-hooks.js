import Aux from "../system/auxilliaries.js";

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
    })

    html.find(".generic-roll").click(async ev => {
      if (Aux.hasRaceCondDanger("generic-roll")) return undefined;

      const target = ev.currentTarget;
      let elem = $(target)
      let rollElems = elem.find(".roll")
      for (const rollElem of rollElems) {
        let roll = await new Roll(rollElem.dataset.roll).evaluate()
        // rollElem.replaceWith(`<div class="output" style="width: 25px;">${roll.total}</div>`)
        rollElem.replaceWith(`<div>${roll.total}</div>`)
      }
      elem.find(".roll").remove()
    })
  })
}