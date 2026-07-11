export default function() {
  Hooks.on("TheEdgeAction", _onTheEdgeAction)
}

function _onTheEdgeAction(payload: ITheEdgeActionPayload) {
  if (payload.actionCost && game.combat) {
    ui.combat.addAction(payload)
  }
}
