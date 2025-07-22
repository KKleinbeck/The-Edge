import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class CombatLog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    form: {
      handler: CombatLog.formHandler,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      undoAction: CombatLog._undoAction,
      addAction: CombatLog._addAction
    },
    window: {
      title: "Combat Log"
    },
    classes: ["combat-log"]
  }

  static PARTS = {
    from: {
      template: "systems/the_edge/modules/applications/templates/combat-log.hbs"
    }
  }

  async _prepareContext(options) {
    const context = {};
    const isRest = Math.max(...game.the_edge.strain_log.map(x => x.hrChange)) <= 0;
    context.strain = game.the_edge.strain_log.map(x => {
        const hrChange = !isRest && x.hrChange < 0 ? `0 (${x.hrChange})` : x.hrChange;
        return {name: x.name, hrChange: hrChange};
    });
    
    const combatant = Aux.getCombatant();
    if (combatant) context.skills = combatant.itemTypes["Combatskill"];

    context.distance = game.the_edge.distance;
    if (game.the_edge.distance > 0) {
      context.movementOptions = CombatLog.getMovements(game.the_edge.distance, combatant);
      if (game.the_edge.movementIndex >= context.movementOptions.length) {
        game.the_edge.movementIndex = 0;
      }
      context.movementIndex = game.the_edge.movementIndex;

      context.movements = [];
      for (const movement of context.movementOptions[context.movementIndex].pattern) {
        context.movements.push({
          name: LocalisationServer.localise(
            ["Idle", "Stride", "Run", "Sprint"][movement], "Combat"
          ),
          hrChange: combatant.getHrChangeFromStrain(movement)
        });
      }
    }

    context.hrNow = combatant.system.heartRate.value;
    if (combatant.system.health.value <= 0) {
      context.hrThen = combatant.system.heartRate.value - 10;
    } else {
      context.hrThen = combatant.system.heartRate.value + Aux.combatRoundHrChange();
      if (context.movements?.length >= 0) {
        for (const movement of context.movements) { context.hrThen += movement.hrChange }
      }
      context.dying = true;
    }
    context.hrChanged = (context.skills.length >= 0) || (context.movements.length >= 0);
    context.zoneNow = combatant.getHRZone();
    context.zoneThen = combatant.getHRZone(context.hrThen);

    return context;
  }

  async addAction(name, hrChange) {
    game.the_edge.strain_log.push({name: name, hrChange: hrChange});
    this.render();
  }

  static _addAction(event, target) {
    switch (target.dataset.details) {
      case "strain":
        const strainLevel = target.dataset.level;
        const combatant = Aux.getCombatant();
        const hrChange = combatant ? combatant.getHrChangeFromStrain(+strainLevel) : 0;
        game.the_edge.strain_log.push({
          name: LocalisationServer.localise("Strain level", "Combat") +
            " " + target.dataset.level,
          hrChange: hrChange
        });
    }
    this.render();
  }

  _onRender(context, options) {
    this.element.querySelector("select[name=skill-picker]")?.addEventListener("change", ev => {
      const combatant = Aux.getCombatant();
      const skillId = ev.target.value;
      if (combatant && skillId) {
        const skill = combatant.items.get(skillId);
        const hrChange = Aux.skillHrChange(skill, combatant);
        if (hrChange) {
          game.the_edge.strain_log.push({name: skill.name, hrChange: hrChange});
          this.render();
        }
      }
    });

    this.element.querySelector("input[name=distance]")?.addEventListener("change", ev => {
      game.the_edge.distance = +ev.target.value;
      this.render();
    })

    this.element.querySelector("#movement-options")?.addEventListener("change", ev => {
      game.the_edge.movementIndex = ev.target.selectedIndex;
      this.render();
    })
  }

  static _undoAction(event, target) {
    const index = +target.dataset.index;
    game.the_edge.strain_log.splice(index, 1);
    this.render();
  }

  static getMovements(distance, actor) {
    const speeds = [
      0, actor.getStrideSpeed(), actor.getRunSpeed(), actor.getSprintSpeed()
    ];
    const hrCost = [
      actor.getHrChangeFromStrain(0), actor.getHrChangeFromStrain(1),
      actor.getHrChangeFromStrain(2), actor.getHrChangeFromStrain(3)
    ];
    const minActions = Math.ceil(distance / speeds[3]);
    const maxActions = Math.ceil(distance / speeds[1]);

    const patterns = []
    for (let actions = minActions; actions <= maxActions; actions++) {
      let currentPattern = null;
      let lowestCost = Infinity;
      for (let iterator = Math.pow(4, actions) - 1; iterator >= Math.pow(4, actions - 1); iterator--) {
        const pattern = CombatLog.getMovementPattern(iterator);
        if (pattern.includes(0)) continue; // Prevent idle actions in calculation
        const patternDist = CombatLog.calculateTotalFromPattern(pattern, speeds) + 0.0001;
        const patternCost = CombatLog.calculateTotalFromPattern(pattern, hrCost);
        if (distance < patternDist && lowestCost >= patternCost) {
          if (lowestCost > patternCost || currentPattern?.variance() > pattern.variance()) {
            lowestCost = patternCost;
            currentPattern = pattern;
          } 
        }
      }
      patterns.push({actions: actions, pattern: currentPattern, cost: lowestCost});
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
    for (const movement of pattern) {acc += target[movement];}
    return acc;
  }
}