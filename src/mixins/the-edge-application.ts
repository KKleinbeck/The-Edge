type intype = Constructor<HandlebarsApplication>;
type outtype<T> = T & Constructor<TheEdgeApplication>;
export default function TheEdgeApplicationMixin<T extends intype>(
  BaseApplication: T,
): outtype<T> {
  class TheEdgeApplication extends BaseApplication {
    declare tabGroups;
    declare id;
    declare window: {
      close,
      content,
      controls,
      header,
      icon,
      resize,
      title,
      windowId
    }


    constructor(...options) {
      if (!("classes" in options[0])) options[0].classes = [];
      options[0].classes.push("the-edge-application");
      super(...options);
    }

    async _renderFrame(options) {
      const document = (options.window?.host ?? window).document;
      const frame = document.createElement(this.options.tag);
      frame.id = this.id;
      if ( this.options.classes.length ) frame.className = this.options.classes.join(" ");

      const { renderTemplate } = foundry.applications.handlebars;
      const template = "systems/the_edge/templates/applications/the-edge-application-base.hbs";
      const applicationTemplate = await renderTemplate(template)
      frame.innerHTML += applicationTemplate

      // Custom Footer and Header
      const customHeaderBarElement = frame.querySelector(".custom-header-bar");
      customHeaderBarElement.innerHTML = await this.getCustomHeaderBar();
      const customFooterBarElement = frame.querySelector(".custom-footer-bar");
      customFooterBarElement.innerHTML = await this.getCustomFooterBar();

      this.window.close = frame.querySelector("button[data-action=close]");
      this.window.content = frame.querySelector(".window-content");
      this.window.controls = frame.querySelector("button[data-action=toggleControls]");
      this.window.header = frame.querySelector(".window-header");
      this.window.icon = frame.querySelector(".window-icon");
      this.window.resize = frame.querySelector(".window-resize-handle");
      this.window.title = frame.querySelector(".window-title");
      return frame;
    }


    public _onRender(context: any, options: any): void {
      super._onRender(context, options);

      this.element.querySelectorAll(".dynamic-size-hook").forEach((input: Element) => {
        this._adjustInputWidth(input);
        input.addEventListener("input", () => this._adjustInputWidth(input));
      });
    }


    _adjustInputWidth(input: Element) {
      if (!(input instanceof HTMLInputElement)) return;
      
      const width = this._getWidthForContent(
        input.value || input.placeholder || "",
        getComputedStyle(input).font
      );
      input.style.width = `${width}px`;
    }


    _getWidthForContent(content: string, font: string | undefined = undefined): number {
      const span = document.createElement("span");
      span.style.visibility = "hidden";
      span.style.whiteSpace = "pre";
      span.style.position = "absolute";
      if (font) span.style.font = font;
      span.textContent = content;
      document.body.appendChild(span);
      const width = span.offsetWidth + 20;
      document.body.removeChild(span);
      return width;
    }


    setPosition(position) {
      if (typeof position == "undefined") return;

      const tep = this.options.theEdgeParameters;
      if ("width" in position && position.width < tep.minWidth) position.width = tep.minWidth;
      if ("height" in position && position.height < tep.minHeight) position.height = tep.minHeight;

      super.setPosition(position)

      const width = this.element.offsetWidth;
      const borders = this.element.querySelectorAll(".border-hook");
      for (const border of borders) {
        if (!(border instanceof HTMLElement)) continue;
        if (!("borderPixelWidth" in border.dataset) || !border.dataset.borderPixelWidth) continue;
        const pixelWidth = +border.dataset.borderPixelWidth;
        border.setAttribute('stroke-width', `${pixelWidth / width}`);
      }
    }
    
    async minimize() {
      this._toggleMinimisedMaximised("minimise");
      
      super.minimize();
    }
    
    async maximize() {
      this._toggleMinimisedMaximised("maximise");
      
      super.maximize();
    }

    _toggleMinimisedMaximised(state: "maximise" | "minimise") {
      const container = this.element.querySelector(".application-shape-container");
      if (!(container instanceof Element)) return;
      const content = this.element.querySelector(".content-clip");
      if (!(content instanceof HTMLElement)) return;
      const header = this.element.querySelector(".the-edge-application-header");
      if (!(header instanceof HTMLElement)) return;

      // Cannot use classList.toggle, as foundry calls maximise initially
      if (state == "maximise") {
        container.classList.remove("minimised");
        content.classList.remove("minimised");
        header.classList.remove("minimised-header");
      } else {
        container.classList.add("minimised");
        content.classList.add("minimised");
        header.classList.add("minimised-header");
      }
    }


    async getCustomFooterBar(): Promise<string> {return "";}
    async getCustomHeaderBar(): Promise<string> {return "";}
  }
  return TheEdgeApplication
}
