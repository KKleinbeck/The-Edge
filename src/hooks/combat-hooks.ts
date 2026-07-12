interface CombatHistoryData {
  combatantId: string | null;
  round: number;
  tokenId: string | null;
  turn: number | null;
}

export default function() {
  Hooks.on("combatTurnChange", _onCombatTurnChange)
}

async function _onCombatTurnChange(_combat: foundryAny, _prior: CombatHistoryData, _current: CombatHistoryData) {
  for (const delay of [50, 100, 150]) {
    // As token's movement History might still update for users
    // delay here and then try to redraw at different intervals
    await new Promise(resolve => setTimeout(resolve, delay));
    ui.combat.render();
  }
}