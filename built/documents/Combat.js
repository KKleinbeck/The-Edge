export class TheEdgeCombat extends Combat {
    async nextTurn() {
        await this.combatant.endOfTurnReset();
        await this.nextCombatant.token.clearMovementHistory();
        return await super.nextTurn();
    }
}
