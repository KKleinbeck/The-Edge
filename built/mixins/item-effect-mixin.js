export default function EmbeddedSkillMixin(BaseApplication) {
  return class EmbeddedSkill extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: {
        counterControl: EmbeddedSkill._onSkillControl,
      },
    };
    // Interface functions - can be overwritten
    getSkills(_context = {}) {
      return this.document.system.counters;
    }
    async updateSkills(counters, _context = {}) {
      await this.document.update(
        { "system.counters": counters },
        { render: false },
      );
    }
    onUpdateSkills(_counters, _context) {}
    // Public interface - do not override
    attachSkillEffectListeners(element = undefined) {
      if (!element) element = this.element;
      // const counterNameElements = element.querySelectorAll(".counter-name-hook");
      // for (const counter of counterNameElements) {
      //   counter.addEventListener("change", (ev) => this._onCounterChange(ev, "name"))
      // }
      // const progressBarInputs = element.querySelectorAll(".counter-input-hook");
      // for (const input of progressBarInputs) {
      //   input.addEventListener("change", (ev) => {
      //     if (!(ev.target instanceof HTMLElement)) return;
      //     const subtype = ev.target.dataset.subtype;
      //     if (subtype != "value" && subtype != "max") return;
      //     this._onCounterChange(ev, subtype);
      //   })
      // }
    }
    // Private interface
    async _updateSkills(counters, context = {}) {
      await this.updateSkills(counters, context);
      this.onUpdateSkills(counters, context);
    }
    _onRender(context, options) {
      super._onRender(context, options);
      this.attachSkillEffectListeners();
    }
    static async _onSkillControl(_event, target) {
      const counterElement = target.closest(".counter-hook");
      // @ts-expect-error
      const index = +counterElement?.dataset.index;
      const counters = this.getSkills();
      const context = this._getContext(target);
      await this._updateSkills(counters, context);
    }
    async _onCounterChange(event, changeType) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const counterElement = target.closest(".embedded-skill-hook");
      if (!(counterElement instanceof HTMLDivElement)) return;
      if (typeof counterElement.dataset.index == "undefined") return;
      const index = +counterElement.dataset.index;
      const counters = this.getSkills();
      switch (changeType) {
        case "value":
          if (typeof target.dataset.max == "undefined") return;
          counters[index].value = Math.min(+target.value, +target.dataset.max);
          break;
        case "max":
          counters[index].max = +target.value;
          counters[index].value = Math.min(
            counters[index].value,
            +target.value,
          );
          break;
        case "name":
          counters[index].name = target.value;
          break;
      }
      const context = this._getContext(target);
      this._updateSkills(counters, context);
    }
    _getContext(target) {
      const contextElement = target.closest(".embedded-skill-context-hook");
      if (
        !(contextElement instanceof HTMLElement) ||
        typeof contextElement.dataset == "undefined"
      )
        return {};
      return contextElement.dataset;
    }
  };
}
