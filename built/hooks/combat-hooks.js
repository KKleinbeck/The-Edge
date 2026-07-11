import Aux from "../system/auxilliaries.js";
export default function () {
    Hooks.on("renderCombatTracker", (_combatTracker, html, details) => {
        html.querySelectorAll(".combat-control").forEach(combatControl => combatControl.addEventListener("click", async (ev) => {
            if (Aux.hasRaceCondDanger("combat-control"))
                return undefined;
            const target = ev.currentTarget;
            if (target.dataset.action != "nextTurn")
                return undefined;
            const actorID = details.combat.combatant.actorId;
            const tokenID = details.combat.combatant.tokenId;
            const sceneID = details.combat.combatant.scneeId;
            const actor = Aux.getActor(actorID, tokenID, sceneID);
            actor.system.applyCombatStrain();
        }));
    });
    Hooks.on("combatTurnChange", _onCombatTurnChange);
}
async function _onCombatTurnChange(_combat, prior, _current) {
    console.log(prior);
    game.the_edge.combatLog.endTurn();
    for (const delay of [50, 100, 150]) {
        // As token's movement History might still update for users
        // delay here and then try to redraw at different intervals
        await new Promise(resolve => setTimeout(resolve, delay));
        ui.combat.render();
    }
}
