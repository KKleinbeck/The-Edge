import ChatServer from "../system/chat_server.js";

export default function() {
  Hooks.on("TheEdgeAction", _onTheEdgeAction)
}

function _onTheEdgeAction(payload: ITheEdgeActionPayload) {
  if (game.combat) {
    game.combat.combatant.addAction(payload);
  } else {
    handleOutOfCombatAction(payload);
  }
}


async function handleOutOfCombatAction(payload: ITheEdgeActionPayload) {
  switch (payload.actionType) {
    case "reload":
      ChatServer.transmitEvent("Reload", {details: {
        name: payload.actor.name, weapon: payload.details.weapon, actions: payload.actionCost
      }});
      break;
    
    case "skill":
      ChatServer.transmitEvent("Skill Used",
        {actor: payload.actor.name, skill: payload.action, change: payload.strainCost}
      );
  }
}
