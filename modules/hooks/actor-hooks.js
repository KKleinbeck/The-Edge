import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderActorSheet", async (sheet, html, actorData) => {
    if (Aux.hasRaceCondDanger("refreshToken")) return undefined;

    let actor = actorData.actor;
    if (actorData.token) {
      actor = Aux.getActor(actorData.token.actorId, actorData.token.id)
    }
    await actor.determineEncumbrance();
    await actor.updateStrain();
    await actor.updatePain();
    await actor.updateBloodloss();
    await actor.updateStatus();
  })
}