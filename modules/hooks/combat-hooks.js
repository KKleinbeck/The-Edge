import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderCombatTracker", (combatTracker, html, details) => {
    console.log(combatTracker, html, details);
    if (game.combat) game.the_edge.combatLog.render(true);

    const combatControl = html.querySelector(".combat-control");
    if (combatControl) {
      combatControl.addEventListener("click", async ev => {
        if (Aux.hasRaceCondDanger("combat-control")) return undefined;
        const target = ev.currentTarget;
        if (target.dataset.control != "nextTurn") return undefined;

        const actorID = details.combat.combatant.actorId;
        const tokenID = details.combat.combatant.tokenId;
        const sceneID = details.combat.combatant.scneeId;
        const actor = Aux.getActor(actorID, tokenID, sceneID);
        actor.applyCombatStrain();
        actor.applyBloodLoss();

        game.the_edge.combatLog.endTurn();
      })
    }
  });
}
