import ApiHandler from "../api-handler.js";
import { assert, TestRegistry } from "../test-registry.js";

/** @param {ApiHandler} apiHandler */
export default function registerIntegrationTests(apiHandler) {
  async function strainAfterCombatMovement() {
    const actor = await apiHandler.actorCreate({
      name: "Test Combat Actor",
      systemPreset: "10s",
    });
    const token = await actor.createToken(true);

    const encounter = await apiHandler.encounterStart();
    await encounter.addTokens([token]);

    await token.move(2000, 200);
    await encounter.nextTurn();
    const document = await token.getActorDocument();

    await actor.delete();
    await token.delete();
    await encounter.end();

    assert(document.system.strain.value == 9);
  }
  TestRegistry.registerTest(
    strainAfterCombatMovement,
    "Combat Movement Strain",
    "integration",
  );
}
