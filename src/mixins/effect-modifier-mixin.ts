import DialogDynamicModifier from "../dialogs/dialog-dynamic-modifier.js";
import THE_EDGE from "../system/config-the-edge.js";

const { renderTemplate } = foundry.applications.handlebars;

type intype = Constructor<FoundryHandlebarsApplication>;
type outtype<T> = T & Constructor<EffectModifier>;
export default function EffectModifierMixin<T extends intype>(BaseApplication: T): outtype<T> {
  return class EffectModifier extends BaseApplication {
    declare definedEffects: Record<string, string[]>


    static DEFAULT_OPTIONS = {
      actions: {
        createModifier: EffectModifier._createModifier,
        deleteModifier: EffectModifier._deleteModifier,
        editDynamicModifier: EffectModifier._editDynamicModifier
      }
    }


    // Interface functions - need to be overwritten
    getModifiers(_target: Element): IModifiersAndContext {
      return {modifiers: [], context: {}};
    }
    async updateModifiers(
      _modifiers: IModifier[], _context: EffectModifierMixinContext
    ): Promise<void> {};

    // Private interface
    _onRender(context: foundryAny, options: foundryAny): void {
      super._onRender(context, options)
      this.attachEffectListeners();
    }


    static _createModifier(_event: Event, target: Element): void {
      // @ts-expect-error 2339 as the method is defined as static
      const {modifiers, context} = this.getModifiers(target);
      modifiers.push({group: "attributes", field: "end", value: 0});
      // @ts-expect-error 2339
      this.updateModifiers(modifiers, context);
      // @ts-expect-error 2339
      this.redrawModifiers(target, modifiers, context);
    }


    _modifyEffect(event: Event): void {
      if (!(event.currentTarget instanceof HTMLInputElement) &&
        !(event.currentTarget instanceof HTMLSelectElement)) return;
      if (event.currentTarget.dataset.index === undefined) return;

      event.stopPropagation();
      const change = this._getModifierData(event.currentTarget);
      const {modifiers, context} = this.getModifiers(event.currentTarget);
      const index: string = event.currentTarget.dataset.index;
      for (const [key, value] of Object.entries(change)) {
        if (key === undefined) continue;
        modifiers[index][key] = value;
      }
      if (modifiers[index].group !== "dynamicModifiers" && typeof modifiers[index].value === "string") {
        modifiers[index].value = 0;
      }
      this.updateModifiers(modifiers, context);
      this.redrawModifiers(event.currentTarget, modifiers, context);
    }


    _getModifierData(target: HTMLInputElement | HTMLSelectElement): Partial<IModifier> {
      if (target.dataset.entry === undefined) {
        throw new Error(
          `Input element does not define dataset 'entry'.\nDataset: ${target.dataset}`
        );
      };

      const entry: string = target.dataset.entry;
      const result: Partial<IModifier> = {};
      result[entry] = entry == "value" ? parseInt(target.value) : target.value;
      if (entry == "group") { // Also set a sensible name if the group changes
        result.field = this.definedEffects[target.value][0];
        if (result[entry] === "dynamicModifiers") {
          result.value = THE_EDGE.dynamicModifierDefaults(result.field as TEventNames);
        }
      }
      if ( entry == "field" && THE_EDGE.isDynamicModifier(result[entry] as string) ) {
        result.value = THE_EDGE.dynamicModifierDefaults(result.field as TEventNames);
      }
      return result;
    }


    static _deleteModifier(_event: Event, target: HTMLElement): void {
      // @ts-expect-error 2339 as the method is defined as static
      const {modifiers, context} = this.getModifiers(target);
      const index = target.dataset.index;
      modifiers.splice(index, 1);
      // @ts-expect-error 2339
      this.updateModifiers(modifiers, context);
      // @ts-expect-error 2339
      this.redrawModifiers(target, modifiers, context);
    }


    static async _editDynamicModifier(_event: Event, target: HTMLElement): Promise<void> {
      const index = target.dataset.index;
      // @ts-expect-error 2339 we know we are called with a correct `this`
      const {modifiers, context} = this.getModifiers();
      const currentModifier = modifiers[index];
      const newValue = await DialogDynamicModifier.prompt(currentModifier.value);
      if (newValue === null) return; // Dialog was dismissed
      currentModifier.value = newValue;
      // @ts-expect-error 2339
      this.updateModifiers(modifiers, context);
    }


    async redrawModifiers(
      target: Element,
      modifiers: IModifier[],
      context: EffectModifierMixinContext
    ): Promise<void> {
      const template = "systems/the_edge/templates/generic/effect-modifiers.hbs";
      const html = await renderTemplate(
        template, {
          modifiers: modifiers,
          definedEffects: this.definedEffects,
          interactive: true,
          ...context
        }
      );
      const newContent = document.createElement("div"); // Trick to strip outer class of html-string
      newContent.innerHTML = html;
      const modifiersElement = target.closest(".effect-modifiers-hook");
      if (modifiersElement === null) return;

      modifiersElement.innerHTML = newContent.innerHTML;
      modifiersElement.querySelectorAll(".modifier-hook")?.forEach(
        (x: Element, _key: number, _parent: NodeListOf<Element>) => {
          x.addEventListener("change", ev => this._modifyEffect(ev));
        }
      );
    }


    attachEffectListeners(): void {
      this.element.querySelectorAll(".modifier-hook")?.forEach(
        (x: Element) => x.addEventListener("change", ev => this._modifyEffect(ev))
      );
    }
  }
}