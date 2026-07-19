import ApiHandler from "../api-handler.js"
import { assert, TestRegistry } from "../test-registry.js"
 
/** @param {ApiHandler} apiHandler */
export default function registerSmokeTests(apiHandler) {
  async function restApiIsOnline() {
    const result = await apiHandler.requestClients();
    const clients = result.clients;

    assert(clients.length == 1)
    assert(clients[0].systemId == "the_edge")
  }
  TestRegistry.registerTest(restApiIsOnline, "Rest Api is Online", "smoke");
}