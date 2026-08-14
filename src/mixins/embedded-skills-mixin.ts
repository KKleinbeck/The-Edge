import Aux from "../system/auxilliaries.js";
import DialogDynamicModifier from "../dialogs/dialog-dynamic-modifier.js";
import LocalisationServer from "../system/localisation_server.js";


const NEW_EFFECT_DEFAULT: string = `function onEvent(details, id) {\n` +
  `  console.log(details);\n` +
  `  // details.parent equals the item holding this skill\n}`;


type intype = Constructor<HandlebarsApplication>;
type outtype<T> = T & Constructor<any>;
export default function EmbeddedSkillMixin<T extends intype>(BaseApplication: T): outtype<T> {
  return class EmbeddedSkill extends BaseApplication {
    declare document: Item | Actor
    declare definedEffects: Record<string, string[]>

    static DEFAULT_OPTIONS = {
      actions: {
        embeddedSkillCreate: EmbeddedSkill._onSkillCreate,
        embeddedSkillControl: EmbeddedSkill._onSkillControl,
      }
    }


    // Interface functions - can be overwritten
    getSkills(_context: DOMStringMap = {}): IEmbeddedSkill[] { return this.document.system.embeddedSkills; }
    async updateSkills(counters: IEmbeddedSkill[], _context: DOMStringMap = {}): Promise<void> {
      await this.document.update({"system.embeddedSkills": counters}, {render: false});
    };
    onUpdateSkills(_counters: IEmbeddedSkill[], _context: DOMStringMap) {}


    // Public interface - do not override
    attachSkillEffectListeners(element: Element | undefined = undefined): void {
      if (!element) element = this.element;

      const skillNameElements = element.querySelectorAll(".embedded-skills-name-hook");
      for (const skillElement of skillNameElements) {
        skillElement.addEventListener("change", (ev) => this._onChangeSkillName(ev))
      }
    }


    // Private interface
    async _updateSkills(counters: IEmbeddedSkill[], context: DOMStringMap = {}): Promise<void> {
      await this.updateSkills(counters, context);
      this.onUpdateSkills(counters, context);
    }


    _onRender(context: foundryAny, options: foundryAny): void {
      super._onRender(context, options);
      this.attachSkillEffectListeners();
    }


    static async _onSkillCreate(this: EmbeddedSkill, _event: Event, target: HTMLElement): Promise<void> {
      const skills = this.getSkills();
      skills.push({
        name: LocalisationServer.localise("New Embedded Skill", "item"),
        effect: NEW_EFFECT_DEFAULT,
        id: foundry.utils.randomID(),
        parentId: this.document.id
      });
      const context = this._getEmbeddedSkillsContext(target);
      await this._updateSkills(skills, context);
    }


    static async _onSkillControl(this: EmbeddedSkill, _event: Event, target: HTMLElement): Promise<void> {
      const skillElement = target.closest(".embedded-skill-hook");
      if (!(skillElement instanceof HTMLDivElement)) return;
      if (typeof skillElement.dataset.index == "undefined") return;
      const index = +skillElement?.dataset.index;
      const skills = this.getSkills();

      switch ( target.dataset.subaction ) {
        case "delete":
          skills.splice(index, 1);
          break;

        case "edit":
          const newEffect = await DialogDynamicModifier.prompt(skills[index].effect);
          if (newEffect === null) return; // Dialog was dismissed
          skills[index].effect = newEffect;
          break;

        case "use":
          Aux.evalOnEventWith(skills[index].effect, {parent: this}, this.document.id);
          break;
      }

      const context = this._getEmbeddedSkillsContext(target);
      await this._updateSkills(skills, context);
    }


    async _onChangeSkillName(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const skillElement = target.closest(".embedded-skill-hook");
      if (!(skillElement instanceof HTMLDivElement)) return;
      if (typeof skillElement.dataset.index == "undefined") return;
      const index = +skillElement.dataset.index;

      const skills = this.getSkills();
      skills[index].name = target.value;

      const context = this._getEmbeddedSkillsContext(target);
      this._updateSkills(skills, context);
    }


    _getEmbeddedSkillsContext(target: HTMLElement): DOMStringMap {
      const contextElement = target.closest(".embedded-skills-context-hook");
      if (!(contextElement instanceof HTMLElement) || typeof contextElement.dataset == "undefined") return {};

      return contextElement.dataset;
    }
  }
}