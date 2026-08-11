import Aux from "../system/auxilliaries.js";
import DialogDynamicModifier from "../dialogs/dialog-dynamic-modifier.js";
import LocalisationServer from "../system/localisation_server.js";
const NEW_EFFECT_DEFAULT = `function onEvent(details, id) {\n` +
    `  console.log(details);\n` +
    `  // details.parent equals the item holding this skill\n}`;
export default function EmbeddedSkillMixin(BaseApplication) {
    return class EmbeddedSkill extends BaseApplication {
        static DEFAULT_OPTIONS = {
            actions: {
                embeddedSkillCreate: EmbeddedSkill._onSkillCreate,
                embeddedSkillControl: EmbeddedSkill._onSkillControl,
            }
        };
        // Interface functions - can be overwritten
        getSkills(_context = {}) { return this.document.system.embeddedSkills; }
        async updateSkills(counters, _context = {}) {
            await this.document.update({ "system.embeddedSkills": counters }, { render: false });
        }
        ;
        onUpdateSkills(_counters, _context) { }
        // Public interface - do not override
        attachSkillEffectListeners(element = undefined) {
            if (!element)
                element = this.element;
            const skillNameElements = element.querySelectorAll(".embedded-skills-name-hook");
            for (const skillElement of skillNameElements) {
                skillElement.addEventListener("change", (ev) => this._onChangeSkillName(ev));
            }
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
        static async _onSkillCreate(_event, target) {
            const skills = this.getSkills();
            skills.push({
                name: LocalisationServer.localise("New Embedded Skill", "item"),
                effect: NEW_EFFECT_DEFAULT
            });
            const context = this._getContext(target);
            await this._updateSkills(skills, context);
        }
        static async _onSkillControl(_event, target) {
            const skillElement = target.closest(".embedded-skill-hook");
            if (!(skillElement instanceof HTMLDivElement))
                return;
            if (typeof skillElement.dataset.index == "undefined")
                return;
            const index = +skillElement?.dataset.index;
            const skills = this.getSkills();
            switch (target.dataset.subaction) {
                case "delete":
                    skills.splice(index, 1);
                    break;
                case "edit":
                    const newEffect = await DialogDynamicModifier.prompt(skills[index].effect);
                    if (newEffect === null)
                        return; // Dialog was dismissed
                    skills[index].effect = newEffect;
                    break;
                case "use":
                    Aux.evalOnEventWith(skills[index].effect, { parent: this }, this.document.id);
                    break;
            }
            const context = this._getContext(target);
            await this._updateSkills(skills, context);
        }
        async _onChangeSkillName(event) {
            const target = event.target;
            if (!(target instanceof HTMLInputElement))
                return;
            const skillElement = target.closest(".embedded-skill-hook");
            if (!(skillElement instanceof HTMLDivElement))
                return;
            if (typeof skillElement.dataset.index == "undefined")
                return;
            const index = +skillElement.dataset.index;
            const skills = this.getSkills();
            skills[index].name = target.value;
            const context = this._getContext(target);
            this._updateSkills(skills, context);
        }
        _getContext(target) {
            const contextElement = target.closest(".embedded-skills-context-hook");
            if (!(contextElement instanceof HTMLElement) || typeof contextElement.dataset == "undefined")
                return {};
            return contextElement.dataset;
        }
    };
}
