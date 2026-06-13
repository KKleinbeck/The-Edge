import DialogDynamicModifier from "../dialogs/dialog-dynamic-modifier.js";
import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
export default function EffectModifierMixin(BaseApplication) {
    return class EffectModifier extends BaseApplication {
        static DEFAULT_OPTIONS = {
            actions: {
                createModifier: EffectModifier._createModifier,
                deleteModifier: EffectModifier._deleteModifier,
                editDynamicModifier: EffectModifier._editDynamicModifier
            }
        };
        // Interface functions - need to be overwritten
        getModifiers(_target) {
            return { modifiers: [], context: {} };
        }
        async updateModifiers(_modifiers, _context) { }
        ;
        // Private interface
        _onRender(context, options) {
            super._onRender(context, options);
            this.attachEffectListeners();
        }
        static _createModifier(_event, target) {
            // @ts-expect-error 2339 as the method is defined as static
            const { modifiers, context } = this.getModifiers(target);
            modifiers.push({ group: "attributes", field: "end", value: 0 });
            // @ts-expect-error 2339
            this.updateModifiers(modifiers, context);
            // @ts-expect-error 2339
            this.redrawModifiers(target, modifiers, context);
        }
        _modifyEffect(event) {
            if (!(event.currentTarget instanceof HTMLInputElement) &&
                !(event.currentTarget instanceof HTMLSelectElement))
                return;
            if (event.currentTarget.dataset.index === undefined)
                return;
            event.stopPropagation();
            const change = this._getModifierData(event.currentTarget);
            const { modifiers, context } = this.getModifiers(event.currentTarget);
            const index = event.currentTarget.dataset.index;
            for (const [key, value] of Object.entries(change)) {
                if (key === undefined)
                    continue;
                modifiers[index][key] = value;
            }
            if (modifiers[index].group !== "dynamicModifiers" && typeof modifiers[index].value === "string") {
                modifiers[index].value = 0;
            }
            this.updateModifiers(modifiers, context);
            this.redrawModifiers(event.currentTarget, modifiers, context);
        }
        _getModifierData(target) {
            if (target.dataset.entry === undefined) {
                throw new Error(`Input element does not define dataset 'entry'.\nDataset: ${target.dataset}`);
            }
            ;
            const entry = target.dataset.entry;
            const result = {};
            result[entry] = entry == "value" ? parseInt(target.value) : target.value;
            if (entry == "group") { // Also set a sensible name if the group changes
                result.field = this.definedEffects[target.value][0];
                if (result[entry] === "dynamicModifiers") {
                    result.value = THE_EDGE.dynamicModifierDefaults(result.field);
                }
            }
            if (entry == "field" && THE_EDGE.isDynamicModifier(result[entry])) {
                result.value = THE_EDGE.dynamicModifierDefaults(result.field);
            }
            return result;
        }
        static _deleteModifier(_event, target) {
            // @ts-expect-error 2339 as the method is defined as static
            const { modifiers, context } = this.getModifiers(target);
            const index = target.dataset.index;
            modifiers.splice(index, 1);
            // @ts-expect-error 2339
            this.updateModifiers(modifiers, context);
            // @ts-expect-error 2339
            this.redrawModifiers(target, modifiers, context);
        }
        static async _editDynamicModifier(_event, target) {
            const index = target.dataset.index;
            // @ts-expect-error 2339 we know we are called with a correct `this`
            const { modifiers, context } = this.getModifiers();
            const currentModifier = modifiers[index];
            const newValue = await DialogDynamicModifier.prompt(currentModifier.value);
            if (newValue === null)
                return; // Dialog was dismissed
            currentModifier.value = newValue;
            // @ts-expect-error 2339
            this.updateModifiers(modifiers, context);
        }
        async redrawModifiers(target, modifiers, context) {
            const template = "systems/the_edge/templates/generic/effect-modifiers.hbs";
            const html = await renderTemplate(template, {
                modifiers: modifiers,
                definedEffects: this.definedEffects,
                interactive: true,
                ...context
            });
            const newContent = document.createElement("div"); // Trick to strip outer class of html-string
            newContent.innerHTML = html;
            const modifiersElement = target.closest(".effect-modifiers-hook");
            if (modifiersElement === null)
                return;
            modifiersElement.innerHTML = newContent.innerHTML;
            modifiersElement.querySelectorAll(".modifier-hook")?.forEach((x, _key, _parent) => {
                x.addEventListener("change", ev => this._modifyEffect(ev));
            });
        }
        attachEffectListeners() {
            this.element.querySelectorAll(".modifier-hook")?.forEach((x) => x.addEventListener("change", ev => this._modifyEffect(ev)));
        }
    };
}
