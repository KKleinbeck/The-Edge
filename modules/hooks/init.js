import * as initHandleBars from "./handlebars.js"
import * as chatHooks from "./chat-hooks.js"

export default function() {
  initHandleBars.default();
  chatHooks.default();
}

Hooks.once("init", () => {

})