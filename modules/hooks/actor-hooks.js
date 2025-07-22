import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderActorSheet", async (sheet, html, actorData) => {
    const actor = actorData.actor;
    if (actorData.token) {
      actor = Aux.getActor(actorData.token.actorId, actorData.token.id);
    }
    if (actor.type !== "character") return;
    if (Aux.hasRaceCondDanger(`renderActor${actor.id}`)) return undefined;

    await new Promise(r => setTimeout(r, 100));
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

  Hooks.on("preUpdateToken", (tokenDocument, update, _details) => {
    const actor = game.actors.get(tokenDocument.actorId);
    if (game.combat && game.combat.combatant.actorId == tokenDocument.actorId) {
      const scene = game.canvas.scene;
      const factor = scene.grid.distance / scene.grid.size;
      const distanceTravelled = factor * Math.hypot(
        tokenDocument.x - update.x, tokenDocument.y - update.y);
      game.the_edge.distance += distanceTravelled;
      game.the_edge.combat_log.render();
    }
  })
}