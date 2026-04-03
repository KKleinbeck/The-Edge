const { renderTemplate } = foundry.applications.handlebars;
export default function SliderMixin(BaseApplication) {
    return class Slider extends BaseApplication {
        static DEFAULT_OPTIONS = {
            actions: {}
        };
        // Interface functions - need to be overwritten
        // Private interface
        _onRender(context, options) {
            super._onRender(context, options);
            this.attachEffectListeners();
        }
        attachEffectListeners() {
            this.element.querySelectorAll(".slider-hook")?.forEach((x) => x.addEventListener("click", ev => console.log("Hello World")));
        }
    };
}
