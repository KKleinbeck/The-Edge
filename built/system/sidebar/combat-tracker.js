const CombatTracker = foundry.applications.sidebar.tabs.CombatTracker;
export class TheEdgeCombatTracker extends CombatTracker {
  static DEFAULT_OPTIONS = {
    ...CombatTracker.DEFAULT_OPTIONS,
    actions: {
      ...CombatTracker.DEFAULT_OPTIONS.actions,
      decreaseStrain: TheEdgeCombatTracker._handleStrain,
      increaseStrain: TheEdgeCombatTracker._handleStrain,
      undoAction: TheEdgeCombatTracker._undoAction,
      undoMovement: TheEdgeCombatTracker._undoMovement,
    },
  };
  static PARTS = {
    ...CombatTracker.PARTS,
    tracker: {
      template: "systems/the_edge/templates/sidebar/combat/tracker.hbs",
      scrollable: [""],
    },
  };
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll(".token-image, .token-name").forEach((x) =>
      x.addEventListener(
        "dblclick",
        (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          const combatantElement = target.closest("[data-combatant-id]");
          if (!(combatantElement instanceof HTMLElement)) return;
          const { combatantId } = combatantElement?.dataset ?? {};
          const combatant = this.viewed.combatants.get(combatantId);
          if (!combatant) return;
          if (combatant.actor?.testUserPermission(game.user, "OBSERVER"))
            combatant.actor?.sheet.render(true);
        },
        { passive: true },
      ),
    );
    this.element
      .querySelector("#movement-options")
      ?.addEventListener("change", (ev) => {
        this.changeMovementIndex(ev.target.selectedIndex);
      });
  }
  _onCombatantMouseDown(event, target, dedicatedAction = false) {
    // Prevent sheet opening via double click, unless explicitly permitted through sheet action
    if (event.type === "dblclick" && !dedicatedAction) return;
    super._onCombatantMouseDown(event, target);
  }
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);
    const currentCombatant = this._getCurrentCombatant();
    if (currentCombatant) {
      context.combatLog = currentCombatant.context;
      context.combatantName = currentCombatant.name;
      context.userIsOwner = currentCombatant.isOwner;
    }
  }
  async _prepareTurnContext(combat, combatant, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index);
    turn.strainInitiative = combatant.system.strainInitiative ?? 0;
    return turn;
  }
  static _handleStrain(_event, target) {
    const { combatantId } =
      target.closest("[data-combatant-id]")?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId);
    if (!combatant) return;
    const { action } = target.dataset;
    switch (action) {
      case "increaseStrain":
        combatant.update({
          "system.strainInitiative":
            (combatant.system.strainInitiative ?? 0) + 1,
        });
        break;
      case "decreaseStrain":
        if (combatant.system.strainInitiative <= 0) break;
        combatant.update({
          "system.strainInitiative":
            (combatant.system.strainInitiative ?? 0) - 1,
        });
        break;
    }
  }
  static _undoAction(_event, target) {
    const currentCombatant = this._getCurrentCombatant();
    if ("index" in target.dataset) {
      const undoIndex = target.dataset.index;
      currentCombatant.undoAction(+undoIndex);
    }
  }
  static _undoMovement(_event, _target) {
    const currentCombatant = this._getCurrentCombatant();
    const movementHistory = currentCombatant.token.movementHistory;
    if (movementHistory.length) {
      const lastMovementId =
        movementHistory[movementHistory.length - 1].movementId;
      currentCombatant.token.revertRecordedMovement(lastMovementId);
    }
  }
  _getCurrentCombatant() {
    if (game.combat) return game.combat.combatant;
  }
  updateDistance() {
    this.render();
  }
  changeMovementIndex(newIndex) {
    const currentCombatant = this._getCurrentCombatant();
    currentCombatant?.update({ "system.movementIndex": newIndex });
    this.render();
  }
}
