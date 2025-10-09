import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderCombatTracker", (_combatTracker, html, details) => {
    if (game.combat && game.combat.combatant) game.the_edge.combatLog.render(true);

    html.querySelectorAll(".combat-control").forEach(combatControl =>
      combatControl.addEventListener("click", async ev => {
        if (Aux.hasRaceCondDanger("combat-control")) return undefined;
        const target = ev.currentTarget;
        if (target.dataset.action != "nextTurn") return undefined;

        const actorID = details.combat.combatant.actorId;
        const tokenID = details.combat.combatant.tokenId;
        const sceneID = details.combat.combatant.scneeId;
        const actor = Aux.getActor(actorID, tokenID, sceneID);
        actor.applyCombatStrain();
        actor.applyBloodLoss();

        game.the_edge.combatLog.endTurn();
      })
    );
  });
}
