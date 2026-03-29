export default function () {
    Hooks.on("preUpdateToken", (tokenDocument, update, _details) => {
        if (game.combat && game.combat.combatant.actorId == tokenDocument.actorId) {
            const scene = game.canvas.scene;
            const factor = scene.grid.distance / scene.grid.size;
            const distanceTravelled = factor * Math.hypot(tokenDocument.x - update.x, tokenDocument.y - update.y);
            game.the_edge.combatLog.addToDistance(distanceTravelled);
        }
    });
}
