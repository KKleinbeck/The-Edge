const { renderTemplate } = foundry.applications.handlebars;
export default function SliderMixin(BaseApplication) {
    class SliderMixinClass extends BaseApplication {
        // Interface functions - need to be overwritten
        onValueChanged(id, value) { }
        getSliderValues() {
            return SliderMixinClass.getSliderValuesFromElement(this.element);
        }
        static getSliderValuesFromElement(element) {
            const sliderValues = {};
            element.querySelectorAll(".slider-hook")?.forEach((e) => {
                if (!(e instanceof HTMLElement))
                    return;
                const context = JSON.parse(atob(e.dataset.binaryContext ?? ""));
                sliderValues[context.id] = context.value;
            });
            return sliderValues;
        }
        // Private interface
        _onRender(context, options) {
            super._onRender(context, options);
            this._attachEffectListeners();
        }
        _attachEffectListeners() {
            this.element.querySelectorAll(".slider-click-hook")?.forEach((x) => x.addEventListener("click", (ev) => this._sliderClickedEvent(ev)));
        }
        async _sliderClickedEvent(event) {
            const target = event.currentTarget;
            if (!(target instanceof SVGElement))
                return;
            if (!("value" in target.dataset) || !target.dataset.value)
                return;
            const value = +target.dataset.value;
            const entryElement = target.closest(".slider-hook");
            if (!(entryElement instanceof HTMLElement))
                return;
            if (!(entryElement.dataset.binaryContext))
                return;
            const context = JSON.parse(atob(entryElement.dataset.binaryContext));
            context.value = value;
            if (context.isDynamic) {
                if (value === context.min)
                    context.min *= 2;
                if (value === context.max)
                    context.max *= 2;
                while (value > 0.5 * context.min && context.min !== context._orig_min) {
                    context.min = Math.min(Math.floor(context.min / 2), context._orig_min);
                }
                while (value < 0.5 * context.max && context.max !== context._orig_max) {
                    context.max = Math.max(Math.floor(context.max / 2), context._orig_max);
                }
            }
            await this._redrawSlider(entryElement, context);
            this.onValueChanged(entryElement.dataset.id ?? "", value);
        }
        async _redrawSlider(element, context) {
            const template = "systems/the_edge/templates/generic/slider.hbs";
            const html = await renderTemplate(template, context);
            const content = document.createElement("div");
            content.innerHTML = html;
            content.querySelectorAll(".slider-click-hook")?.forEach((x) => x.addEventListener("click", (ev) => this._sliderClickedEvent(ev)));
            element.replaceWith(content);
        }
    }
    return SliderMixinClass;
}
