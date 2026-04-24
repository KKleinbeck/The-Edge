const { renderTemplate } = foundry.applications.handlebars;

type intype = Constructor<FoundryHandlebarsApplication>;
type outtype<T> = T & Constructor<SliderInstance> &  SliderStatic;
export default function SliderMixin<T extends intype>(BaseApplication: T): outtype<T> {
  class SliderMixinClass extends BaseApplication {
    // Interface functions - need to be overwritten
    onValueChanged(id: string, value: number): void {}
    getSliderValues(): Record<string, number> {
      return SliderMixinClass.getSliderValuesFromElement(this.element);
    }
    static getSliderValuesFromElement(element: Element): Record<string, number> {
      const sliderValues = {};
      element.querySelectorAll(".slider-hook")?.forEach((e: Element) => {
        if (!(e instanceof HTMLElement)) return;
        const context = JSON.parse(atob(e.dataset.binaryContext ?? ""));
        sliderValues[context.id] = context.value;
      })
      return sliderValues;
    }


    // Private interface
    _onRender(context: foundryAny, options: foundryAny): void {
      super._onRender(context, options)
      this._attachEffectListeners();
    }


    _attachEffectListeners(): void {
      this.element.querySelectorAll(".slider-click-hook")?.forEach(
        (x: Element) => x.addEventListener("click", (ev: Event) => this._sliderClickedEvent(ev))
      );
    }


    async _sliderClickedEvent(event: Event): Promise<void> {
      const target = event.currentTarget;
      if (!(target instanceof SVGElement)) return;
      if (!("value" in target.dataset) || !target.dataset.value) return;
      
      const value = +target.dataset.value;
      const entryElement = target.closest(".slider-hook");
      if (!(entryElement instanceof HTMLElement)) return;

      if (!(entryElement.dataset.binaryContext)) return;
      const context: ISliderContext = JSON.parse(
        atob(entryElement.dataset.binaryContext));
      context.value = value;
      if (context.isDynamic) {
        if (value === context.min) context.min *= 2;
        if (value === context.max) context.max *= 2;
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


    async _redrawSlider(element: Element, context: ISliderContext) {
      const template = "systems/the_edge/templates/generic/slider.hbs";
      const html = await renderTemplate(template, context);
      const content = document.createElement("div");
      content.innerHTML = html;
      content.querySelectorAll(".slider-click-hook")?.forEach(
        (x: Element) => x.addEventListener("click", (ev: Event) => this._sliderClickedEvent(ev))
      );

      element.replaceWith(content);
    }
  }

  return SliderMixinClass as unknown as outtype<T>;
}