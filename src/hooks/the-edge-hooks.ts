import { TheEdgeActor } from "../actors/actor.js";

export default function() {
  Hooks.on("TheEdgeAction", _onTheEdgeAction)
}

function _onTheEdgeAction(payload: ITheEdgeActionPayload) {
  if (game.combat) {
    const newPayload = {...payload}; // Copy to prevent race conditions
    game.combat.combatant.addAction(newPayload);
  } else {
    (payload.actor as TheEdgeActor).handleOutOfCombatAction(payload);
  }
}
