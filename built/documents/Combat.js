export class TheEdgeCombat extends Combat {
    async nextTurn() {
        this.combatant.endOfTurnReset();
        return await super.nextTurn();
    }
}
