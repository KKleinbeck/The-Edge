import LocalisationServer from "../system/localisation_server.js";

type intype = Constructor<HandlebarsApplication>;
type outtype<T> = T & Constructor<any>;
export default function CounterMixin<T extends intype>(BaseApplication: T): outtype<T> {
  return class CounterHandler extends BaseApplication {
    declare document: Item | Actor
    declare definedEffects: Record<string, string[]>

    static DEFAULT_OPTIONS = {
      actions: {
        counterControl: CounterHandler._onCounterControl,
      }
    }


    // Interface functions - can be overwritten
    getCounters(_context: DOMStringMap = {}): ICounter[] { return this.document.system.counters; }
    async updateCounters(counters: ICounter[], _context: DOMStringMap = {}): Promise<void> {
      await this.document.update({"system.counters": counters}, {render: false});
    };
    onUpdateCounters(_counters: ICounter[], _context: DOMStringMap) {}


    // Public interface - do not override
    attachCounterEffectListeners(element: Element | undefined = undefined): void {
      if (!element) element = this.element;

      const counterNameElements = element.querySelectorAll(".counter-name-hook");
      for (const counter of counterNameElements) {
        counter.addEventListener("change", (ev) => this._onCounterChange(ev, "name"))
      }
      
      const progressBarInputs = element.querySelectorAll(".counter-input-hook");
      for (const input of progressBarInputs) {
        input.addEventListener("change", (ev) => {
          if (!(ev.target instanceof HTMLElement)) return;
          const subtype = ev.target.dataset.subtype;
          if (subtype != "value" && subtype != "max") return;
          this._onCounterChange(ev, subtype);
        })
      }
    }


    // Private interface
    async _updateCounters(counters: ICounter[], context: DOMStringMap = {}): Promise<void> {
      await this.updateCounters(counters, context);
      this.onUpdateCounters(counters, context);
    }


    _onRender(context: foundryAny, options: foundryAny): void {
      super._onRender(context, options);
      this.attachCounterEffectListeners();
    }


    static async _onCounterControl(this: CounterHandler, _event: Event, target: HTMLElement): Promise<void> {
      const counterElement = target.closest(".counter-hook");
      // @ts-expect-error
      const index = +counterElement?.dataset.index;
      const counters = this.getCounters();

      switch ( target.dataset.subaction ) {
        case "create-counter":
          counters.push({
            name: LocalisationServer.localise("New Counter", "item"),
            value: 1, max: 1
          })
          break;
        
        case "delete":
          counters.splice(index, 1);
          break;

        case "increase-counter":
          counters[index].max += 1;
          break;

        case "decrease-counter":
          if (counters[index].max == 1) return;
          counters[index].max -= 1;
          counters[index].value = Math.min(
            counters[index].value, counters[index].max
          );
          break;
        
        case "deplete-counter":
          counters[index].value = 0;
          break;
        
        case "use":
          // @ts-expect-error
          const level = 1 + +target.dataset.level;
          counters[index].value = (counters[index].value < level) ? level : level - 1;
          break;
      }
      const context = this._getCounterContext(target);
      await this._updateCounters(counters, context);
    }


    async _onCounterChange(event: Event, changeType: "name" | "value" | "max") {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const counterElement = target.closest(".counter-hook");
      if (!(counterElement instanceof HTMLDivElement)) return;
      if (typeof counterElement.dataset.index == "undefined") return;
      const index = +counterElement.dataset.index;

      const counters = this.getCounters();
      switch (changeType) {
        case "value":
          if (typeof target.dataset.max == "undefined") return;
          counters[index].value = Math.min(+target.value, +target.dataset.max);
          break;
        
        case "max":
          counters[index].max = +target.value;
          counters[index].value = Math.min(counters[index].value, +target.value);
          break;
        
        case "name":
          counters[index].name = target.value;
          break;
      }

      const context = this._getCounterContext(target);
      this._updateCounters(counters, context);
    }


    _getCounterContext(target: HTMLElement): DOMStringMap {
      const contextElement = target.closest(".counter-context-hook");
      if (!(contextElement instanceof HTMLElement) || typeof contextElement.dataset == "undefined") return {};

      return contextElement.dataset;
    }
  }
}