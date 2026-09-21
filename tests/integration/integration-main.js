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
    "Strain - Combat Movement",
    "integration",
  );

  async function strainAfterFoodConsumption() {
    const actor = await apiHandler.actorCreate();
    const samples = [
      { actorStrain: 10, foodReduction: 5, result: 5 },
      { actorStrain: 10, foodReduction: 10, result: 0 },
      { actorStrain: 10, foodReduction: 15, result: 0 },
    ];
    const actualResults = [];

    for (const sample of samples) {
      const command =
        `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.update({"system.strain.value": ${sample.actorStrain}});` +
        `const cls = getDocumentClass("Item");` +
        `const food = await cls.create(` +
        `  { name: "Food", type: "Consumables", "system.subtypes.food.strainReduction": "${sample.foodReduction}" },` +
        `  { parent: actor }` +
        `);` +
        `await actor.controller.useConsumable(food);` +
        `return actor.system.strain.value;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++)
      assert(samples[i].result == actualResults[i]);
  }
  TestRegistry.registerTest(
    strainAfterFoodConsumption,
    "Strain - Food Consumption",
    "integration",
  );
}
