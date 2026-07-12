import { TheEdgeCombatant } from "./Combatant";

export class TheEdgeCombat extends Combat {
  async nextTurn(): Promise<TheEdgeCombat> {
    (this.combatant as TheEdgeCombatant).endOfTurnReset();
    return await super.nextTurn();
  }
}
