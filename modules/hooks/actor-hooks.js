import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderActorSheet", async (sheet, html, actorData) => {
    const actor = actorData.actor;
    if (actorData.token) {
      actor = Aux.getActor(actorData.token.actorId, actorData.token.id)
    }
    if (Aux.hasRaceCondDanger(`renderActor${actor.id}`)) return undefined;

    await actor.updateStatus();
    await actor.determineOverload();
    await actor.updateStrain();
    await actor.updatePain();
    await actor.updateBloodloss();
    await actor.updateStatus();
    // Two updateStatus calls: first to update to current values,
    //   second if the first update changed the either status effects.
  })
}