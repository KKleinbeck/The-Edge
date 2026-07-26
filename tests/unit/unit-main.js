import ApiHandler from "../api-handler.js"

import registerUnitTestsForActors from "./unit-actors.js";
import registerUnitTestsForItems from "./unit-items.js";
 
/** @param {ApiHandler} apiHandler */
export default function registerUnitTests(apiHandler) {
  registerUnitTestsForActors(apiHandler);
  registerUnitTestsForItems(apiHandler);
}