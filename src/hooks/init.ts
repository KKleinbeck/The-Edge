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

  Hooks.once("init", () => {
    game.the_edge.drawTestApplication = drawTestApplication;
  })
}

export function drawTestApplication() {
  const app = new TestApplication();
  app.render(true);
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class TestApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      title: "Test App",
      resizable: true
    },
    position: {
      top: 50,
      left: 50,
      width: 500,
      height: 500,
    },
    theEdgeParameters: {
      minWidth: 250,
      minHeight: 250
    },
    classes: ["my-test-class"]
  };

  static PARTS = {
    from: {
      template: "systems/the_edge/templates/test-application.hbs",
    },
  }


  async _renderFrame(options) {
    const document = (options.window?.host ?? window).document;
    const frame = document.createElement(this.options.tag);
    frame.id = `app-${options.uniqueId ?? 0}`;
    if ( this.options.classes.length ) frame.className = this.options.classes.join(" ");

    const { renderTemplate } = foundry.applications.handlebars;
    const template = "systems/the_edge/templates/the-edge-application-base.hbs";
    const applicationTemplate = await renderTemplate(template)
    frame.innerHTML += applicationTemplate
    frame.insertAdjacentHTML("beforeend", '<div class="window-resize-handle"></div>');

    this.window.close = frame.querySelector("button[data-action=close]");
    this.window.content = frame.querySelector(".window-content");
    this.window.controls = frame.querySelector("button[data-action=toggleControls]");
    this.window.header = frame.querySelector(".window-header");
    this.window.icon = frame.querySelector(".window-icon");
    this.window.resize = frame.querySelector(".window-resize-handle");
    this.window.title = frame.querySelector(".window-title");
    return frame;
  }


  setPosition(position) {
    const tep = this.options.theEdgeParameters
    if ("width" in position && position.width < tep.minWidth) position.width = tep.minWidth;
    if ("height" in position && position.height < tep.minHeight) position.height = tep.minHeight;

    super.setPosition(position)

    const width = this.element.offsetWidth;
    const borders = this.element.querySelectorAll(".border-hook");
    for (const border of borders) {
      const pixelWidth = +border.dataset.borderPixelWidth;
      border.setAttribute('stroke-width', `${pixelWidth / width}`);
    }
  }
}
