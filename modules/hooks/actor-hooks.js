export default function() {
    Hooks.on("refreshToken", async (token, refreshInfo) => {
        let lastUpdate = game.data["lastTokenUpdate"]
        if (lastUpdate === undefined || Date.now() - lastUpdate > 100) {
            // Prevent too frequent updates to avoid race conditions
            game.data["lastTokenUpdate"] = Date.now()
            let actor = token.actor;
            await actor._updateStatus();
            await actor._determineEncumbrance();
        }
    })
}