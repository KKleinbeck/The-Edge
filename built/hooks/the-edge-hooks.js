export default function () {
    Hooks.on("TheEdgeAction", _onTheEdgeAction);
}
function _onTheEdgeAction(payload) {
    if (game.combat) {
        const newPayload = { ...payload }; // Copy to prevent race conditions
        game.combat.combatant.addAction(newPayload);
    }
    else {
        payload.actor.handleOutOfCombatAction(payload);
    }
}
