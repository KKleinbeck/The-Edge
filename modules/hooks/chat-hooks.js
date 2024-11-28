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
            elem.append(`<div>${proficiencyRoll.quality} FL</div>`)
        }
      }
    })
      // html.find(".damage-apply-box").click(ev => {
      //     // because for some stupid reasons we cannot use data tags here, in chat messages
      //     const parts = ev.currentTarget.className.split(" ")
      //     const targetIDs = parts[2].split("targetID-")
      //     const dmgRes = parts[3].split("dmg-")
      //     const sceneID = parts[4].split("sceneID-")[1]
      //     targetIDs.shift()
      //     dmgRes.shift()
      //     console.log(ev.currentTarget)
      //     let scene = getScene(sceneID)
      //     let targets = getTargets(scene, targetIDs)
      //     for (const target of targets) {
      //         for (const dmg of dmgRes) applyDamage(target, dmg);
      //     }
      // })
  })
}