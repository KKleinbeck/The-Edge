import * as actorHooks from "./actor-hooks.js"
import * as chatHooks from "./chat-hooks.js"
import * as combatHooks from "./combat-hooks.js"
import * as initHandleBars from "./handlebars.js"

export default function() {
  actorHooks.default();
  chatHooks.default();
  combatHooks.default();
  initHandleBars.default();
}