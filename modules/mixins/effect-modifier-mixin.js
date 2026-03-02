import THE_EDGE from "../system/config-the-edge.js";

const { renderTemplate } = foundry.applications.handlebars;

export default function EffectModifierMixin(BaseApplication) {
  class EffectModifier extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        createModifier: EffectModifier._createModifier,
        deleteModifier: EffectModifier._deleteModifier,
      }
    }

    // Interface functions - need to be overwritten
    getModifiers(_target) {} // Shall return system path and respective list of modifiers

    // Private interface
    _onRender(context, options) {
      super._onRender(context, options)
      this._attachEffectListeners();
    }

    static _createModifier(_event, target) {
      const [systemPath, modifiers] = this.getModifiers(target);
      modifiers.push({group: "attributes", name: "end", value: 0});
      const update = {};
      update[systemPath] = modifiers;
      this.document.update(update, {render: false});
      this.redrawModifiers(target, modifiers);
    }

    async _modifyEffect(event) {
      const change = await this._getModifierData(event.currentTarget);
      const [systemPath, modifiers] = this.getModifiers(event.currentTarget);
      const index = event.currentTarget.dataset.index;
      for (const [key, value] of Object.entries(change)) {
        modifiers[index][key] = value;
      }
      const update = {};
      update[systemPath] = modifiers;
      this.document.update(update, {render: false});
      this.redrawModifiers(event.currentTarget, modifiers);
    }

    async _getModifierData(target) {
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
      const [systemPath, modifiers] = this.getModifiers(target);
      const index = target.dataset.index;
      modifiers.splice(index, 1);
      const update = {};
      update[systemPath] = modifiers;
      this.document.update(update, {render: false});
      this.redrawModifiers(target, modifiers);
    }

    async redrawModifiers(target, modifiers) {
      const template = "systems/the_edge/templates/generic/effect-modifiers.hbs";
      const html = await renderTemplate(
        template, {modifiers: modifiers, definedEffects: THE_EDGE.definedEffects}
      );
      const newContent = document.createElement("div"); // Trick to strip outer class of html-string
      newContent.innerHTML = html;
      const modifiersElement = target.closest(".effect-modifiers-hook");
      modifiersElement.innerHTML = newContent.innerHTML;
      modifiersElement.querySelectorAll(".modifier-hook")?.forEach(
        x => x.addEventListener("change", ev => this._modifyEffect(ev))
      );
    }

    _attachEffectListeners() {
      this.element.querySelectorAll(".modifier-hook")?.forEach(
        x => x.addEventListener("change", ev => this._modifyEffect(ev))
      );
    }
  }

  return EffectModifier;
}