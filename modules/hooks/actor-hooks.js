import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderActorSheet", async (sheet, html, actorData) => {
    const actor = actorData.actor;
    if (actorData.token) {
      actor = Aux.getActor(actorData.token.actorId, actorData.token.id)
    }
    if (Aux.hasRaceCondDanger(`renderActor${actor.id}`)) return undefined;

    await new Promise(r => setTimeout(r, 20));
    // Timeout is a hack to give game enough time to update potential
    // attribute advances before we do the effect calculations.
    await actor.updateStatus();
    await actor.determineOverload();
    await actor.updateStrain();
    await actor.updateBloodloss();
    await actor.updatePain();
    await actor.updateStatus();
    // Two updateStatus calls: first to update to current values,
    //   second if the first update changed the either status effects.
  })
}