export class TheEdgeCombat extends Combat {
  async nextRound(): Promise<TheEdgeCombat> {
    for (const combatant of this.combatants) combatant.roundReset();
    return await super.nextRound();
  }
}
