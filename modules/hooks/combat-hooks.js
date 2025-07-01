import Aux from "../system/auxilliaries.js";
import DialogCombatActions from "../dialogs/dialog-combat-actions.js";

export default function() {
  Hooks.on("renderCombatTracker", (combatTracker, html, details) => {
    game.the_edge.combat_log.render(true);

    html.find(".combat-control").click(async ev => {
      if (Aux.hasRaceCondDanger("combat-control")) return undefined;
      const target = ev.currentTarget;
      if (target.dataset.control != "nextTurn") return undefined;

      let actorID = details.combat.combatant.actorId;
      let tokenID = details.combat.combatant.tokenId;
      let actor = Aux.getActor(actorID, tokenID);
      actor.applyBloodLoss();
      DialogCombatActions.start({actor: actor})
    })
  })
}
