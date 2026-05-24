export class TheEdgeCombat extends Combat {
    async nextRound() {
        for (const combatant of this.combatants)
            combatant.roundReset();
        return await super.nextRound();
    }
}
