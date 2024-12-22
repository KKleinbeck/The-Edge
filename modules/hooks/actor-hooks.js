import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderActorSheet", async (sheet, html, actorData) => {
    if (Aux.hasRaceCondDanger("refreshToken")) return undefined;

    let actor = actorData.actor;
    if (actorData.token) {
      actor = Aux.getActor(actorData.token.actorId, actorData.token.id)
    }
    await actor._determineEncumbrance();
    await actor._updateStatus();
    await actor._updateStrain();
  })
}