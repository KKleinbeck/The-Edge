import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
export default function EffectModifierMixin(BaseApplication) {
    return class EffectModifier extends BaseApplication {
        static DEFAULT_OPTIONS = {
            actions: {
                createModifier: EffectModifier._createModifier,
                deleteModifier: EffectModifier._deleteModifier,
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
            if (!(event.currentTarget instanceof HTMLInputElement))
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
                result.field = Object.keys(THE_EDGE.effectMap[target.value])[0];
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
        async redrawModifiers(target, modifiers, context) {
            const template = "systems/the_edge/templates/generic/effect-modifiers.hbs";
            const html = await renderTemplate(template, {
                modifiers: modifiers,
                definedEffects: THE_EDGE.definedEffects,
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
