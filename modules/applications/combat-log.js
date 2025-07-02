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
    context.strain = game.the_edge.strain_log;
    
    const combatant = Aux.getCombatant();
    if (combatant) context.skills = combatant.itemTypes["Combatskill"];

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
    this.element.querySelector("select[name=skill-picker]").addEventListener("change", ev => {
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
  }

  static _undoAction(event, target) {
    const index = +target.dataset.index;
    game.the_edge.strain_log.splice(index, 1);
    this.render();
  }

  static async formHandler(event, form, formData) {
    console.log("Event 22: ", event)
  }
}