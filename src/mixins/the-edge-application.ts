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

    // Copied from foundry, patched for custom nav bar in footer
    changeTab(tab, group, {force=false, updatePosition=true}={}) {
      if ( !tab || !group ) throw new Error("You must pass both the tab and tab group identifier");
      if ( (this.tabGroups[group] === tab) && !force ) return;  // No change necessary
      const tabElement = this.element.querySelector(`.tabs [data-group="${group}"][data-tab="${tab}"]`);
      if ( !tabElement ) throw new Error(`No matching tab element found for group "${group}" and tab "${tab}"`);

      // Update tab navigation
      for ( const t of this.element.querySelectorAll(`.tabs [data-group="${group}"]`) ) {
        if (!(t instanceof HTMLElement)) continue;

        t.classList.toggle("active", t.dataset.tab === tab);
        if ( foundry.utils.isElementInstanceOf(t, "button") ) t.ariaPressed = `${t.dataset.tab === tab}`;
      }

      // Update tab contents
      for ( const section of this.element.querySelectorAll(`.tab[data-group="${group}"]`) ) {
        if (!(section instanceof HTMLElement)) continue;
        section.classList.toggle("active", section.dataset.tab === tab);
      }
      this.tabGroups[group] = tab;

      // Update automatic width or height
      if ( !updatePosition ) return;
      const positionUpdate: Record<string, any> = {};
      if ( this.options.position.width === "auto" ) positionUpdate.width = "auto";
      if ( this.options.position.height === "auto" ) positionUpdate.height = "auto";
      if ( !foundry.utils.isEmpty(positionUpdate) && !this.options.window.resizable ) {
        // If this app is the primary application in a detached window, clear the inline max constraints before measuring
        // so setPosition can observe the tab's natural dimensions, then resize the window and re-apply constraints.
        const isPrimaryDetached = this.window.windowId === this.id;
        if ( isPrimaryDetached ) {
          Object.assign(this.element.style, { maxWidth: "", maxHeight: "" });
          // Snap the primary application back to the top left in case it was moved, otherwise resizing the window will
          // obscure it.
          Object.assign(positionUpdate, { left: 0, top: 0 });
        }
        this.setPosition(positionUpdate);
      }
    }


    async getCustomFooterBar(): Promise<string> {return "";}
    async getCustomHeaderBar(): Promise<string> {return "";}
  }
  return TheEdgeApplication
}
