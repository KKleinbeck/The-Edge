const CombatTracker = foundry.applications.sidebar.tabs.CombatTracker;
export class TheEdgeCombatTracker extends CombatTracker {
    static DEFAULT_OPTIONS = {
        ...CombatTracker.DEFAULT_OPTIONS,
        actions: {
            ...CombatTracker.DEFAULT_OPTIONS.actions,
            decreaseStrain: TheEdgeCombatTracker._handleStrain,
            increaseStrain: TheEdgeCombatTracker._handleStrain,
        }
    };
    static PARTS = {
        ...CombatTracker.PARTS,
        tracker: {
            template: "systems/the_edge/templates/sidebar/combat/tracker.hbs",
            scrollable: [""]
        },
    };
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.element.querySelectorAll(".token-image, .token-name").forEach((x) => x.addEventListener("dblclick", event => {
            const target = event.target;
            if (!(target instanceof HTMLElement))
                return;
            const combatantElement = target.closest("[data-combatant-id]");
            if (!(combatantElement instanceof HTMLElement))
                return;
            const { combatantId } = combatantElement?.dataset ?? {};
            const combatant = this.viewed.combatants.get(combatantId);
            if (!combatant)
                return;
            if (combatant.actor?.testUserPermission(game.user, "OBSERVER"))
                combatant.actor?.sheet.render(true);
        }, { passive: true }));
    }
    _onCombatantMouseDown(event, target, dedicatedAction = false) {
        // Prevent sheet opening via double click, unless explicitly permitted through sheet action
        if (event.type === "dblclick" && !dedicatedAction)
            return;
        super._onCombatantMouseDown(event, target);
    }
    async _prepareTurnContext(combat, combatant, index) {
        const turn = await super._prepareTurnContext(combat, combatant, index);
        turn.strainInitiative = combatant.system.strainInitiative ?? 0;
        return turn;
    }
    static _handleStrain(_event, target) {
        const { combatantId } = target.closest("[data-combatant-id]")?.dataset ?? {};
        const combatant = this.viewed?.combatants.get(combatantId);
        if (!combatant)
            return;
        const { action } = target.dataset;
        switch (action) {
            case "increaseStrain":
                combatant.update({ "system.strainInitiative": (combatant.system.strainInitiative ?? 0) + 1 });
                break;
            case "decreaseStrain":
                if (combatant.system.strainInitiative <= 0)
                    break;
                combatant.update({ "system.strainInitiative": (combatant.system.strainInitiative ?? 0) - 1 });
                break;
        }
    }
}
