import Aux from "../auxilliaries.js";
import LocalisationServer from "../localisation_server.js";
import THE_EDGE from "../config-the-edge.js";
import MovementCalculator from "./combat-tracker-movement-options.js";
export default class CombatLog {
    constructor() {
        this.distance = 0;
        this.movementIndex = 0;
        this.movementOptions = [];
        this.strainLog = [];
    }
    getContext(combatant) {
        this.updateDistance(combatant);
        const context = {};
        context.strainLog = this.strainLog;
        context.distance = this.distance;
        context.movementOptions = this.movementOptions;
        context.movementIndex = this.movementIndex;
        context.movements = this.getMovementStrainLog();
        context.strainNow = combatant.actor.system.strain.value;
        context.strainThen = (context.strainNow +
            (context.movements?.reduce((acc, movement) => acc + movement.strainChange, 0) ?? 0) +
            (context.strainLog?.reduce((acc, entry) => acc + entry.strainChange, 0) ?? 0));
        context.levelNow = combatant.actor.system.strainLevel;
        context.levelThen = combatant.actor.system.strainLevels
            .map(x => x.value).findIndex(x => x > context.strainThen);
        return context;
    }
    updateDistance(combatant) {
        const movementHistory = combatant.token.movementHistory;
        this.distance = movementHistory.reduce((acc, current) => acc + current.cost, 0);
        this.movementOptions = CombatLog.getMovementOptions(this.distance);
    }
    changeMovementIndex(newIndex) { this.movementIndex = newIndex; }
    endTurn() {
        this.distance = 0;
        this.movementIndex = 0;
        this.movementOptions = [];
        this.strainLog = [];
    }
    addAction(payload) {
        let name = LocalisationServer.localise(payload.action, "Game Actions");
        if (payload.actionCost > 1)
            name += ` x ${payload.actionCost}`;
        this.strainLog.push({
            name: name, strainChange: payload.strainCost ? payload.strainCost : 0
        });
    }
    // static _undoAction(_event, target) {
    //   const index = +target.dataset.index;
    //   this.strainLog.splice(index, 1);
    //   game.the_edge.socketHandler.emit("UNDO_ACTION", index);
    //   this.render();
    // }
    static getMovementOptions(distance) {
        const actor = Aux.getCombatant();
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
    getMovementStrainLog() {
        if (!this.movementOptions.length)
            return [];
        const movementStrainLog = [];
        for (const patternIndex of this.movementOptions[this.movementIndex].pattern) {
            movementStrainLog.push({
                name: LocalisationServer.localise(["Stride", "Run", "Sprint"][patternIndex], "Combat"),
                strainChange: [
                    THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
                ][patternIndex]
            });
        }
        return movementStrainLog;
    }
}
