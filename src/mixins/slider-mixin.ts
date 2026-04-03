const { renderTemplate } = foundry.applications.handlebars;

type intype = Constructor<FoundryHandlebarsApplication>;
type outtype<T> = T & Constructor<Slider>;
export default function SliderMixin<T extends intype>(BaseApplication: T): outtype<T> {
  return class Slider extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
      }
    }

    // Interface functions - need to be overwritten

    // Private interface
    _onRender(context: foundryAny, options: foundryAny): void {
      super._onRender(context, options)
      this.attachEffectListeners();
    }

    attachEffectListeners(): void {
      this.element.querySelectorAll(".slider-hook")?.forEach(
        (x: Element) => x.addEventListener("click", ev => console.log("Hello World"))
      );
    }
  }
}