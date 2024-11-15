export default function() {
    const _determineEncumbrance = (actor) => {
        let weight = actor.items.reduce((a,b) => a + (b.system.weight || 0), 0)
        console.log(weight, weight)
        return true
    };

    Hooks.on("refreshToken", (token, refreshInfo) => {
        let actor = token.actor;
        actor._determineEncumbrance()
    })
}