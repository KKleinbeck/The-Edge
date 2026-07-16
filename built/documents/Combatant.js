import LocalisationServer from "../system/localisation_server.js";
import MovementCalculator from "../system/sidebar/combat-tracker-movement-options.js";
import THE_EDGE from "../system/config-the-edge.js";
export class TheEdgeCombatant extends Combatant {
    async update(dataCandidate, operation) {
        const data = { ...dataCandidate }; // Create a copy to prevent mutation
        if ("initiative" in data) { // reset strain initiative when we set the initiative manually
            if (this.system.strainInitiative)
                this.actor.system.applyStrain(-this.system.strainInitiative);
            data["system.strainInitiative"] = 0;
        }
        if ("system.strainInitiative" in dataCandidate) { // update initiative when we update strainInitiative
            const strainDelta = dataCandidate["system.strainInitiative"] - this.system.strainInitiative;
            data.initiative = this.initiative + strainDelta;
            if (!operation?.isTurnReset)
                this.actor.system.applyStrain(strainDelta);
        }
        return super.update(data, operation);
    }
    get context() {
        const context = {};
        context.actionLog = this.system.actionLog;
        context.distance = this.distanceTravelled;
        context.movementOptions = this.getMovementOptions(context.distance);
        context.movementIndex = this.system.movementIndex;
        context.movements = this.getMovementActionLog(context.movementOptions);
        return context;
    }
    get distanceTravelled() {
        const movementHistory = this.token.movementHistory;
        return movementHistory.reduce((acc, current) => acc + current.cost, 0);
    }
    addAction(payload) {
        let name = payload.action ?? LocalisationServer.localise(payload.actionType, "Game Actions");
        if (["equip", "unequip"].includes(payload.actionType))
            name += " " + payload.details.itemName;
        this.system.actionLog.push({
            name: name, actionCost: payload.actionCost ? payload.actionCost : 0
        });
        this.update({ "system.actionLog": this.system.actionLog });
    }
    undoAction(undoIndex) {
        this.system.actionLog.splice(undoIndex, 1);
        this.update({ "system.actionLog": this.system.actionLog });
    }
    getMovementOptions(distance) {
        const actor = this.actor;
        const speeds = [actor.system.strideSpeed, actor.system.runSpeed, actor.system.sprintSpeed];
        if (speeds[2] == 0)
            return []; // We cannot possibly do anything here
        const strainCost = [
            THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
        ];
        const minActions = Math.ceil(distance / speeds[2]);
        const maxActions = Math.ceil(distance / speeds[0]);
        const patterns = [];
        for (let actions = minActions; actions <= maxActions; actions++) {
            patterns.push(MovementCalculator.determineBestPattern(actions, distance, speeds, strainCost));
        }
        return patterns;
    }
    getMovementActionLog(movementOptions) {
        if (!movementOptions.length)
            return [];
        const patternCount = {};
        for (const patternIndex of movementOptions[this.system.movementIndex].pattern) {
            if (patternIndex in patternCount)
                patternCount[patternIndex] += 1;
            else
                patternCount[patternIndex] = 1;
        }
        const movementActionLog = [];
        for (const [patternIndex, count] of Object.entries(patternCount)) {
            movementActionLog.push({
                name: LocalisationServer.localise(["Stride", "Run", "Sprint"][patternIndex], "Combat"),
                actionCost: count
            });
        }
        return movementActionLog;
    }
    get _momentStrainCost() {
        const movementOptions = this.getMovementOptions(this.distanceTravelled);
        const movementStrainCost = movementOptions[this.system.movementIndex].strainCost;
        return movementStrainCost;
    }
    async endOfTurnReset() {
        this.actor.system.applyCombatStrain(this._momentStrainCost);
        await this.update({
            "system.movementIndex": 0,
            "system.strainInitiative": 0,
            "system.actionLog": []
        }, { isTurnReset: true });
    }
}
