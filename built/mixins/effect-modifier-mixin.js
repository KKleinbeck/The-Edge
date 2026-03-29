import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
export default function EffectModifierMixin(BaseApplication) {
    class EffectModifier extends BaseApplication {
        static DEFAULT_OPTIONS = {
            actions: {
                createModifier: EffectModifier._createModifier,
                deleteModifier: EffectModifier._deleteModifier,
            }
        };
        // Interface functions - need to be overwritten
        getModifiers(_target) { } // Shall return list of modifiers and a context that is passed to updateModifiers
        async updateModifiers(_modifiers, _context) { }
        ;
        // Private interface
        _onRender(context, options) {
            super._onRender(context, options);
            this.attachEffectListeners();
        }
        static _createModifier(_event, target) {
            const { modifiers, context } = this.getModifiers(target);
            modifiers.push({ group: "attributes", field: "end", value: 0 });
            this.updateModifiers(modifiers, context);
            this.redrawModifiers(target, modifiers, context);
        }
        _modifyEffect(event) {
            event.stopPropagation();
            const change = this._getModifierData(event.currentTarget);
            const { modifiers, context } = this.getModifiers(event.currentTarget);
            const index = event.currentTarget.dataset.index;
            for (const [key, value] of Object.entries(change)) {
                modifiers[index][key] = value;
            }
            this.updateModifiers(modifiers, context);
            this.redrawModifiers(event.currentTarget, modifiers, context);
        }
        _getModifierData(target) {
            const entry = target.dataset.entry;
            const result = {};
            result[entry] = entry == "value" ? parseInt(target.value) : target.value;
            // The next line also sets the name to something sensible if the group changes
            if (entry == "group") {
                result.field = Object.keys(THE_EDGE.effectMap[target.value])[0];
            }
            return result;
        }
        static _deleteModifier(_event, target) {
            const { modifiers, context } = this.getModifiers(target);
            const index = target.dataset.index;
            modifiers.splice(index, 1);
            this.updateModifiers(modifiers, context);
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
            modifiersElement.innerHTML = newContent.innerHTML;
            modifiersElement.querySelectorAll(".modifier-hook")?.forEach(x => x.addEventListener("change", ev => this._modifyEffect(ev)));
        }
        attachEffectListeners() {
            this.element.querySelectorAll(".modifier-hook")?.forEach(x => x.addEventListener("change", ev => this._modifyEffect(ev)));
        }
    }
    return EffectModifier;
}
