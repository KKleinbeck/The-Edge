import * as actorHooks from "./actor-hooks.js";
import * as chatHooks from "./chat-hooks.js";
import * as grenadePickerHooks from "./grenade-picker-hooks.js";
import * as initHandleBars from "./handlebars.js";
import * as initUiHandleBars from "./ui-handlebars.js";
import * as itemHooks from "./item-hooks.js";
import * as theEdgeHooks from "./the-edge-hooks.js";
export default function () {
    actorHooks.default();
    chatHooks.default();
    grenadePickerHooks.default();
    initHandleBars.default();
    initUiHandleBars.default();
    itemHooks.default();
    theEdgeHooks.default();
}
