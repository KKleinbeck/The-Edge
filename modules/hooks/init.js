import * as initHandleBars from "./handlebars.js"
import * as actorHooks from "./actor-hooks.js"
import * as chatHooks from "./chat-hooks.js"

export default function() {
  initHandleBars.default();
  chatHooks.default();
  actorHooks.default();
}

Hooks.once("init", () => {

})