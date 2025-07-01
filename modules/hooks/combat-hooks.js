import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("renderCombatTracker", (combatTracker, html, details) => {
    game.the_edge.combat_log.render(true);

    html.find(".combat-control").click(async ev => {
      if (Aux.hasRaceCondDanger("combat-control")) return undefined;
      const target = ev.currentTarget;
      if (target.dataset.control != "nextTurn") return undefined;

      const actorID = details.combat.combatant.actorId;
      const tokenID = details.combat.combatant.tokenId;
      const sceneID = details.combat.combatant.scneeId;
      const actor = Aux.getActor(actorID, tokenID, sceneID);
      // TODO: actor.applyStrain();
      actor.applyBloodLoss();
    })
  })
}
