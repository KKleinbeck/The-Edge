export default function() {
    Hooks.on("refreshToken", async (token, refreshInfo) => {
        let actor = token.actor;
        await actor._updateStatus();
        actor._determineEncumbrance();
    })
}