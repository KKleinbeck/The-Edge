export class TheEdgeCombat extends Combat {
    async nextTurn() {
        await this.combatant.endOfTurnReset();
        await this.combatant.token.clearMovementHistory();
        return await super.nextTurn();
    }
}
