import Aux from "../system/auxilliaries.js";

export default function() {
    // const canApplyDefaultRolls = li => {
    //     return true
    // };
  Hooks.on("renderChatMessage", (chatMsgCls, html, message) => {
    html.find(".proficiency-roll").click(async ev => {
      let lastUpdate = game.data["lastTokenUpdate"]
      if (lastUpdate === undefined || Date.now() - lastUpdate > 100) {
          // Prevent too frequent updates to avoid race conditions
          game.data["lastTokenUpdate"] = Date.now()
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
            elem.append(`<div>${proficiencyRoll.quality} QL</div>`)
            break;
          case "Failure":
            elem.append(`<div>${-proficiencyRoll.quality} FL</div>`)
        }
      }
    })
  })
}