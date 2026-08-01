import ChatServer from "../system/chat_server.js";
export default function () {
    Hooks.on("TheEdgeAction", _onTheEdgeAction);
    Hooks.on("onModifierEvent", _onModifierEvent);
}
function _onTheEdgeAction(payload) {
    if (game.combat && game.combat.combatant.actorId == payload.actor.id) {
        game.combat.combatant.addAction(payload);
    }
    else {
        handleOutOfCombatAction(payload);
    }
}
async function handleOutOfCombatAction(payload) {
    switch (payload.actionType) {
        case "reload":
            ChatServer.transmitEvent("Reload", { details: {
                    name: payload.actor.name, weapon: payload.details.weapon, actions: payload.actionCost
                } });
            break;
        case "skill":
            ChatServer.transmitEvent("Skill Used", { actor: payload.actor.name, skill: payload.action, change: payload.strainCost });
    }
}
function _onModifierEvent(field, details) {
    switch (field) {
        default:
            details.actor.effectHooks(field, details);
            break;
    }
    return true;
}
