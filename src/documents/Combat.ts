import { TheEdgeCombatant } from "./Combatant";

export class TheEdgeCombat extends Combat {
  async nextTurn(): Promise<TheEdgeCombat> {
    await (this.combatant as TheEdgeCombatant).endOfTurnReset();
    await this.combatant.token.clearMovementHistory();
    return await super.nextTurn();
  }
}
