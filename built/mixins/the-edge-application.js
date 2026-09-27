export default function TheEdgeApplicationMixin(BaseApplication) {
    class TheEdgeApplication extends BaseApplication {
        constructor(...options) {
            if (!("classes" in options[0]))
                options[0].classes = [];
            options[0].classes.push("the-edge-application");
            super(...options);
        }
        async _renderFrame(options) {
            const document = (options.window?.host ?? window).document;
            const frame = document.createElement(this.options.tag);
            frame.id = `app-${options.uniqueId ?? 0}`;
            if (this.options.classes.length)
                frame.className = this.options.classes.join(" ");
            const { renderTemplate } = foundry.applications.handlebars;
            const template = "systems/the_edge/templates/applications/the-edge-application-base.hbs";
            const applicationTemplate = await renderTemplate(template);
            frame.innerHTML += applicationTemplate;
            // Custom Footer and Header
            const customHeaderBarElement = frame.querySelector(".custom-header-bar");
            customHeaderBarElement.innerHTML = this.customHeaderBar;
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
            const tep = this.options.theEdgeParameters;
            if ("width" in position && position.width < tep.minWidth)
                position.width = tep.minWidth;
            if ("height" in position && position.height < tep.minHeight)
                position.height = tep.minHeight;
            super.setPosition(position);
            const width = this.element.offsetWidth;
            const borders = this.element.querySelectorAll(".border-hook");
            for (const border of borders) {
                if (!(border instanceof HTMLElement))
                    continue;
                if (!("borderPixelWidth" in border.dataset) || !border.dataset.borderPixelWidth)
                    continue;
                const pixelWidth = +border.dataset.borderPixelWidth;
                border.setAttribute('stroke-width', `${pixelWidth / width}`);
            }
        }
        get customFooterBar() { return ""; }
        get customHeaderBar() { return ""; }
    }
    return TheEdgeApplication;
}
