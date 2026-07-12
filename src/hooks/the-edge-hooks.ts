import LocalisationServer from "../system/localisation_server.js";

export default function() {
  Hooks.on("SkillAction", _onSkillAction)
  Hooks.on("TheEdgeAction", _onTheEdgeAction)
}

function _onSkillAction(payload: ITheEdgeActionPayload) {
  if (game.combat) game.combat.combatant.addAction(payload);
}

function _onTheEdgeAction(payload: ITheEdgeActionPayload) {
  if (game.combat) {
    const newPayload = {...payload}; // Copy to prevent race conditions
    newPayload.action = LocalisationServer.localise(payload.action, "Game Actions")
    game.combat.combatant.addAction(newPayload);
  }
}
