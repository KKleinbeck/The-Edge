import LocalisationServer from "../system/localisation_server.js";
import MovementCalculator from "../system/sidebar/combat-tracker-movement-options.js";
import THE_EDGE from "../system/config-the-edge.js";
export class TheEdgeCombatant extends Combatant {
    constructor(data, options) {
        super(data, options);
        if (!("movementIndex" in this.system))
            this.system.movementIndex = 0;
        if (!("strainLog" in this.system))
            this.system.strainLog = [];
    }
    async update(dataCandidate, operation) {
        const data = { ...dataCandidate }; // Create a copy to prevent mutation
        // First proper update, needed as the first update comes through `Document.updateDocuments`
        if (!("baseInitiative" in this.system))
            data["system.baseInitiative"] = data.initiative ?? this.initiative;
        // reset everything when we set the initiative manually
        if ("initiative" in data) {
            data["system.baseInitiative"] = data.initiative;
            if (this.system.strainInitiative)
                this.actor.system.applyStrain(-this.system.strainInitiative);
            data["system.strainInitiative"] = 0;
        }
        // when we update strainInitiative, update the initiative too
        if ("system.strainInitiative" in dataCandidate) {
            const strainDelta = dataCandidate["system.strainInitiative"] - (this.system.strainInitiative ?? 0);
            data.initiative = this.initiative + strainDelta;
            if (!operation?.isRoundReset)
                this.actor.system.applyStrain(strainDelta);
        }
        return super.update(data, operation);
    }
    async rollInitiative(formula) {
        const roll = this.getInitiativeRoll(formula);
        await roll.evaluate();
        return this.update({
            initiative: roll.total,
            "system.initialInitiative": roll.total,
            "system.strainInitiative": 0
        });
    }
    get context() {
        const context = {};
        context.strainLog = this.system.strainLog;
        context.distance = this.distanceTravelled;
        context.movementOptions = this.getMovementOptions(context.distance);
        context.movementIndex = this.system.movementIndex;
        context.movements = this.getMovementStrainLog(context.movementOptions);
        context.strainNow = this.actor.system.strain.value;
        context.strainThen = (context.strainNow +
            (context.movements?.reduce((acc, movement) => acc + movement.strainChange, 0) ?? 0) +
            (context.strainLog?.reduce((acc, entry) => acc + entry.strainChange, 0) ?? 0));
        context.levelNow = this.actor.system.strainLevel;
        context.levelThen = this.actor.system.strainLevels
            .map(x => x.value).findIndex(x => x > context.strainThen);
        return context;
    }
    get distanceTravelled() {
        const movementHistory = this.token.movementHistory;
        return movementHistory.reduce((acc, current) => acc + current.cost, 0);
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
    getMovementStrainLog(movementOptions) {
        if (!movementOptions.length)
            return [];
        const movementStrainLog = [];
        for (const patternIndex of movementOptions[this.system.movementIndex].pattern) {
            movementStrainLog.push({
                name: LocalisationServer.localise(["Stride", "Run", "Sprint"][patternIndex], "Combat"),
                strainChange: [
                    THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
                ][patternIndex]
            });
        }
        return movementStrainLog;
    }
    roundReset() {
        this.update({
            "system.movementIndex": 0,
            "system.strainInitiative": 0,
            "system.strainLog": []
        }, { isRoundReset: true });
    }
}
