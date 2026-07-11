export default function () {
    Hooks.on("TheEdgeAction", _onTheEdgeAction);
}
function _onTheEdgeAction(payload) {
    if (payload.actionCost && game.combat) {
        ui.combat.addAction(payload);
    }
}
