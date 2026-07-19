import ApiHandler from "./api-handler.js";
import { TestRegistry } from "./test-registry.js"

import registerSmokeTests from "./smoke/smoke-main.js";
import registerUnitTests from "./unit/unit-main.js";
import registerIntegrationTests from "./integration/integration-main.js";

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  switch (arg) {
    case "--rest-api-url":
      args.url = argv[++i];
      break;
    case "--rest-api-key":
      args.apiKey = argv[++i];
      break;
    default:
      throw new Error(`Command line argument '${arg}' is not supported`);
  }
}

async function main() {
  if (!args.url || !args.apiKey) {
    throw new Error('Usage: node main.js --rest-api-url <ws-url> --rest-api-key <key>');
  }

  // Setup Stage
  const apiHandler = new ApiHandler(args.url, args.apiKey);
  registerSmokeTests(apiHandler);
  registerUnitTests(apiHandler);
  registerIntegrationTests(apiHandler);

  // Test Stage
  await TestRegistry.runTests();

  // const actor = await apiHandler.actorCreate();
  // const command = `const actor = game.actors.get("${actor.data._id}");` +
  //   `await actor.system.changeCoreValue("system.attributes.end.advances", 20);` + 
  //   `await actor.system.changeCoreValue("system.attributes.spd.advances", 10);` + 
  //   `await actor.system.changeCoreValue("system.attributes.foc.advances", 10);` +
  //   `console.log(actor.system.health.max.value);` +
  //   `return {maxHealth: actor.system.health.max.value, ` +
  //   `  usedPracticeHours: actor.system.PracticeHours.used, ` +
  //   `  strideSpeed: actor.system.strideSpeed};`;
  // const newSystem = await apiHandler.runCommand(command);
  // console.log(newSystem)
  // console.log(THE_EDGE.attrCost(2))

  // await actor.delete();
}

main();