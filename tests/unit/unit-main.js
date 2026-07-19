import ApiHandler from "../api-handler.js"
import { assert, TestRegistry } from "../test-registry.js"

import registerUnitTestsForActors from "./unit-actors.js";
 
/** @param {ApiHandler} apiHandler */
export default function registerUnitTests(apiHandler) {
  registerUnitTestsForActors(apiHandler);
}