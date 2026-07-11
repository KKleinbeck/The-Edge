import { TheEdgeCombatant } from "../../documents/Combatant.js";

const CombatTracker = foundry.applications.sidebar.tabs.CombatTracker;

export class TheEdgeCombatTracker extends CombatTracker {
  static DEFAULT_OPTIONS = {
    ...CombatTracker.DEFAULT_OPTIONS,
    actions: {
      ...CombatTracker.DEFAULT_OPTIONS.actions,
      decreaseStrain: TheEdgeCombatTracker._handleStrain,
      increaseStrain: TheEdgeCombatTracker._handleStrain,
      undoMovement: TheEdgeCombatTracker._undoMovement
    }
  }

  static PARTS = {
    ...CombatTracker.PARTS,
    tracker: {
      template: "systems/the_edge/templates/sidebar/combat/tracker.hbs",
      scrollable: [""]
    },
  };


  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll(".token-image, .token-name").forEach((x: HTMLElement) =>
      x.addEventListener("dblclick", event => {
        const target = event.target;
        if(!(target instanceof HTMLElement)) return;
        const combatantElement = target.closest("[data-combatant-id]");
        if(!(combatantElement instanceof HTMLElement)) return;

        const { combatantId } = combatantElement?.dataset ?? {};
        const combatant = this.viewed.combatants.get(combatantId);
        if ( !combatant ) return;

        if ( combatant.actor?.testUserPermission(game.user, "OBSERVER") ) combatant.actor?.sheet.render(true);
      }, { passive: true })
    );

    this.element.querySelector("#movement-options")?.addEventListener("change", ev => {
      this.changeMovementIndex(ev.target.selectedIndex);
    })
  }
  

  _onCombatantMouseDown(event: PointerEvent, target: HTMLElement, dedicatedAction: boolean = false) {
    // Prevent sheet opening via double click, unless explicitly permitted through sheet action
    if ( event.type === "dblclick" && !dedicatedAction ) return;
    super._onCombatantMouseDown(event, target);
  }


  async _prepareTrackerContext(context: foundryAny, options: foundryAny) {
    await super._prepareTrackerContext(context, options);

    const currentCombatant = this._getCurrentCombatant();
    if (currentCombatant) {
      // context.combatLog = game.the_edge.combatLog.getContext(currentCombatant);
      context.combatLog = currentCombatant.context;
      context.combatantName = currentCombatant.name;
      context.userIsOwner = currentCombatant.isOwner;
    }
  }


  async _prepareTurnContext(combat: foundryAny, combatant: TheEdgeCombatant, index: number): Promise<foundryAny> {
    const turn = await super._prepareTurnContext(combat, combatant, index);
    turn.strainInitiative = combatant.system.strainInitiative ?? 0;
    return turn;
  }


  static _handleStrain(_event: PointerEvent, target: HTMLAnchorElement) {
    const { combatantId } = (target.closest("[data-combatant-id]") as HTMLLIElement)?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId);
    if ( !combatant ) return;

    const { action } = target.dataset;
    switch (action) {
      case "increaseStrain":
        combatant.update({"system.strainInitiative": (combatant.system.strainInitiative ?? 0) + 1});
        break;
      
      case "decreaseStrain":
        if (combatant.system.strainInitiative <= 0) break;
        combatant.update({"system.strainInitiative": (combatant.system.strainInitiative ?? 0) - 1});
        break;
    }
  }


  static _undoMovement(_event: PointerEvent, _target: HTMLAnchorElement) {
    const currentCombatant = this._getCurrentCombatant();
    const movementHistory = currentCombatant.token.movementHistory;
    if (movementHistory.length) {
      const lastMovementId = movementHistory[movementHistory.length - 1].movementId;
      currentCombatant.token.revertRecordedMovement(lastMovementId);
    }
  }


  _getCurrentCombatant(): foundryAny | undefined {
    if (this.viewed) return this.viewed.combatant;
  }


  // CombatLogWrapper
  addAction(payload: ITheEdgeActionPayload) {
    game.the_edge.combatLog.addAction(payload);
    game.the_edge.socketHandler.emit("COMBAT_LOG_ADD_ACTION", payload);
    this.render();
  }

  updateDistance() { this.render(); }


  changeMovementIndex(newIndex: number) {
    const currentCombatant = this._getCurrentCombatant();
    currentCombatant?.update({"system.movementIndex": newIndex})
    // game.the_edge.combatLog.changeMovementIndex(newIndex);
    // game.the_edge.socketHandler.emit("COMBAT_LOG_CHANGE_MOVEMENT_INDEX", newIndex);
    this.render();
  }
}