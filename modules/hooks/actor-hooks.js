import Aux from "../system/auxilliaries.js";

export default function() {
  Hooks.on("refreshToken", async (token, refreshInfo) => {
    if (Aux.hasRaceCondDanger("refreshToken")) return undefined;

    let actor = token.actor;
    await actor._determineEncumbrance();
    await actor._updateStatus();
    await actor._updateStrain();
  })
}