import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";
import THE_EDGE from "../system/config-the-edge.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export default class CombatLog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options) {
        super(options);
        this.distance = 0;
        this.movementIndex = 0;
        this.strainLog = [];
    }
    static DEFAULT_OPTIONS = {
        tag: "form",
        form: {
            handler: CombatLog.formHandler,
            submitOnChange: false,
            closeOnSubmit: false,
        },
        actions: {
            undoAction: CombatLog._undoAction,
        },
        window: {
            title: "Combat Log"
        },
        classes: ["combat-log"]
    };
    static PARTS = {
        form: {
            template: "systems/the_edge/templates/applications/combat-log.hbs"
        }
    };
    async _prepareContext(_options) {
        const context = {};
        const isRest = Math.max(...this.strainLog.map(x => x.hrChange)) <= 0;
        context.strain = this.strainLog.map(x => {
            const hrChange = !isRest && x.hrChange < 0 ? `0 (${x.hrChange})` : x.hrChange;
            return { name: x.name, hrChange: hrChange };
        });
        const combatant = Aux.getCombatant();
        if (combatant)
            context.skills = combatant.itemTypes["Combatskill"];
        context.distance = this.distance;
        if (this.distance > 0) {
            context.movementOptions = CombatLog.getMovements(this.distance, combatant);
            if (context.movementOptions.length === 0)
                context.movements = [];
            else if (this.movementIndex >= context.movementOptions.length) {
                this.changeMovementIndex(0);
            }
            else {
                context.movementIndex = this.movementIndex;
                context.movements = [];
                for (const movement of context.movementOptions[context.movementIndex].pattern) {
                    console.log(movement);
                    context.movements.push({
                        name: LocalisationServer.localise(["Idle", "Stride", "Run", "Sprint"][movement], "Combat"),
                        hrChange: [
                            0, THE_EDGE.strainCost.striding,
                            THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
                        ][movement]
                    });
                }
            }
        }
        context.hrNow = combatant.system.heartRate.value;
        if (combatant.system.health.value <= 0) {
            context.hrThen = combatant.system.heartRate.value - 10;
        }
        else {
            context.hrThen = combatant.system.heartRate.value + Aux.combatRoundHrChange();
            if (context.movements?.length >= 0) {
                for (const movement of context.movements) {
                    context.hrThen += movement.hrChange;
                }
            }
            context.dying = true;
        }
        context.hrChanged = (context.skills.length >= 0) || (context.movements.length >= 0);
        context.zoneNow = combatant.system.getHRZone();
        context.zoneThen = combatant.system.getHRZone(context.hrThen);
        return context;
    }
    get title() {
        return LocalisationServer.localise("Combat Log", "Combat");
    }
    async addAction(name, hrChange) {
        const payload = { name: name, hrChange: hrChange };
        this.strainLog.push(payload);
        game.the_edge.socketHandler.emit("ADD_TO_COMBAT_LOG", payload);
        this.render();
    }
    _onRender(_context, _options) {
        this.element.querySelector("select[name=skill-picker]")?.addEventListener("change", ev => {
            const combatant = Aux.getCombatant();
            const skillId = ev.target.value;
            if (combatant && skillId) {
                const skill = combatant.items.get(skillId);
                const hrChange = Aux.parseStrainCostStr(skill, combatant.system.strainLevel);
                if (hrChange)
                    this.addAction(skill.name, hrChange);
            }
        });
        this.element.querySelector("input[name=distance]")?.addEventListener("change", ev => {
            this.changeDistance(+ev.target.value);
        });
        this.element.querySelector("#movement-options")?.addEventListener("change", ev => {
            this.changeMovementIndex(ev.target.selectedIndex);
        });
    }
    addToDistance(additional) {
        this.distance += additional;
        game.the_edge.socketHandler.emit("ADD_DISTANCE_TRAVELLED", additional);
        this.render();
    }
    changeDistance(newDistance) {
        this.distance = newDistance;
        game.the_edge.socketHandler.emit("CHANGE_DISTANCE_TRAVELLED", newDistance);
        this.render();
    }
    changeMovementIndex(newIndex) {
        this.movementIndex = newIndex;
        game.the_edge.socketHandler.emit("CHANGE_MOVEMENT_INDEX", newIndex);
        this.render();
    }
    endTurn() {
        this.distance = 0;
        this.movementIndex = 0;
        this.strainLog = [];
        game.the_edge.socketHandler.emit("END_TURN");
    }
    static _undoAction(_event, target) {
        const index = +target.dataset.index;
        this.strainLog.splice(index, 1);
        game.the_edge.socketHandler.emit("UNDO_ACTION", index);
        this.render();
    }
    static getMovements(distance, actor) {
        const speeds = [
            0, actor.system.strideSpeed, actor.system.runSpeed, actor.system.sprintSpeed
        ];
        if (speeds[3] == 0)
            return []; // We cannot possibly do anything here
        const strainCost = [
            0, THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running,
            THE_EDGE.strainCost.sprinting
        ];
        const minActions = Math.ceil(distance / speeds[3]);
        const maxActions = Math.ceil(distance / speeds[1]);
        const patterns = [];
        for (let actions = minActions; actions <= maxActions; actions++) {
            let currentPattern = null;
            let lowestCost = Infinity;
            for (let iterator = Math.pow(4, actions) - 1; iterator >= Math.pow(4, actions - 1); iterator--) {
                const pattern = CombatLog.getMovementPattern(iterator);
                if (pattern.includes(0))
                    continue; // Prevent idle actions in calculation
                const patternDist = CombatLog.calculateTotalFromPattern(pattern, speeds) + 0.0001;
                const patternCost = CombatLog.calculateTotalFromPattern(pattern, strainCost);
                if (distance < patternDist && lowestCost >= patternCost) {
                    if (lowestCost > patternCost || currentPattern?.variance() > pattern.variance()) {
                        lowestCost = patternCost;
                        currentPattern = pattern;
                    }
                }
            }
            patterns.push({ actions: actions, pattern: currentPattern, cost: lowestCost });
        }
        return patterns;
    }
    static getMovementPattern(state) {
        const pattern = [state % 4];
        state = Math.floor(state / 4);
        while (state > 0) {
            pattern.push(state % 4);
            state = Math.floor(state / 4);
        }
        return pattern;
    }
    static calculateTotalFromPattern(pattern, target) {
        let acc = 0;
        for (const movement of pattern) {
            acc += target[movement];
        }
        return acc;
    }
}
