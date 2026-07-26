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
}

main();