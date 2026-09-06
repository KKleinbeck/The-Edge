import ChatServer from "../system/chat_server.js";

export default function () {
  Hooks.on("TheEdgeAction", _onTheEdgeAction);

  Hooks.on("onModifierEvent", _onModifierEvent);
}

function _onTheEdgeAction(payload: ITheEdgeActionPayload) {
  if (game.combat && game.combat.combatant.actorId == payload.actor.id) {
    game.combat.combatant.addAction(payload);
  } else {
    handleOutOfCombatAction(payload);
  }
}

async function handleOutOfCombatAction(payload: ITheEdgeActionPayload) {
  switch (payload.actionType) {
    case "reload":
      ChatServer.transmitEvent(
        "RELOAD",
        {
          details: {
            name: payload.actor.name,
            weapon: payload.details.weapon,
            actions: payload.actionCost,
          },
        },
        payload.actor.chatConfig(),
      );
      break;

    case "skill":
      ChatServer.transmitEvent(
        "SKILL USED",
        {
          actor: payload.actor.name,
          skill: payload.action,
          change: payload.strainCost,
        },
        payload.actor.chatConfig(),
      );
  }
}

function _onModifierEvent(
  field: TEventNames,
  details: Record<string, any>,
): boolean {
  switch (field) {
    case "onUse":
      const item = details.actor.items.get(details.itemId);
      item.effectHooks(field, details);
      break;

    default:
      details.actor.effectHooks(field, details);
      break;
  }
  return true;
}
