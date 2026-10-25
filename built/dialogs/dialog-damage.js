import LocalisationServer from "../system/localisation_server.js";
import IconSelectorMixin from "../mixins/icon-selector-mixin.js";
import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;
export default class DialogDamage extends IconSelectorMixin(DialogV2) {
    damageType = "fall";
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 450 },
            window: { title: LocalisationServer.localise("Apply Damage") },
        };
    }
    async onIconSelected(iconType, value) {
        this.damageType = value;
        for (const id of ["fall", "impact", "general"]) {
            this.element.querySelector(`#${id}`)?.classList.add("hidden");
        }
        this.element.querySelector(`#${value}`)?.classList.remove("hidden");
        this.updateIcons(iconType, {
            fall: { selected: value == "fall" },
            impact: { selected: value == "impact" },
            general: { selected: value == "general" },
        });
    }
    static async prompt(config = {}) {
        config.content = await DialogDamage._setupContent();
        config.ok = DialogDamage._setupCallback();
        return await super.prompt(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static async _setupContent() {
        const template = "systems/the_edge/templates/dialogs/apply-damage.hbs";
        return await renderTemplate(template, {
            fallDamageRoll: 0,
            impactSpeedRoll: 0,
            selectedType: "fall",
            damageTypes: Object.keys(THE_EDGE.bleedingThreshold).filter((x) => x != "fall" && x != "impact"),
        });
    }
    static _setupCallback() {
        return {
            label: LocalisationServer.localise("Accept", "dialog"),
            callback: async (_event, _button, dialog) => {
                if (dialog.damageType == "fall") {
                    const heightElement = dialog.element.querySelector("#fallHeight");
                    if (!(heightElement instanceof HTMLInputElement))
                        return {};
                    return { damageType: dialog.damageType, height: +heightElement.value };
                }
                if (dialog.damageType == "impact") {
                    const impactElement = dialog.element.querySelector("#impactSpeed");
                    if (!(impactElement instanceof HTMLInputElement))
                        return {};
                    return { damageType: dialog.damageType, speed: +impactElement.value };
                }
                const damageElement = dialog.element.querySelector("#generalDamage");
                if (!(damageElement instanceof HTMLInputElement))
                    return {};
                const damage = +damageElement.value;
                const damageTypeElement = dialog.element.querySelector("#damageType");
                if (!(damageTypeElement instanceof HTMLSelectElement))
                    return {};
                const damageType = damageTypeElement.value;
                return { damage, damageType };
            },
        };
    }
    _onRender(context, options) {
        this.element.querySelector("#fallHeight")?.addEventListener("change", (event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement))
                return;
            const fallDamageRoll = THE_EDGE.fallDamageRoll(+target.value);
            const fallDamageRollElemet = this.element.querySelector("#fallDamageRoll");
            if (!(fallDamageRollElemet instanceof HTMLDivElement))
                return;
            fallDamageRollElemet.innerHTML = fallDamageRoll;
        });
        this.element.querySelector("#impactSpeed")?.addEventListener("change", (event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement))
                return;
            const impactSpeedRoll = THE_EDGE.impactDamageRoll(+target.value);
            const impactSpeedRollElemet = this.element.querySelector("#impactSpeedRoll");
            if (!(impactSpeedRollElemet instanceof HTMLDivElement))
                return;
            impactSpeedRollElemet.innerHTML = impactSpeedRoll;
        });
    }
}
