import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogMedicine extends DialogV2 {
    constructor(options) {
        super(options);
        this.selectedWound = { woundIndex: -1, source: "" };
        this.mappedWounds = options.mappedWounds;
    }
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 270 },
            window: { title: LocalisationServer.localise("Select wound", "dialog") }
        };
    }
    static async prompt(details, config = {}) {
        const mappedWounds = {};
        details.wounds.forEach((x, index) => mappedWounds[index] = x);
        config.content = await DialogMedicine._setupContent(mappedWounds);
        config.ok = DialogMedicine._setupCallback();
        config.close = () => { return { woundIndex: -1, source: "" }; };
        config.mappedWounds = mappedWounds;
        return await super.prompt(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static async _setupContent(mappedWounds) {
        const template = "systems/the_edge/templates/dialogs/medicine.hbs";
        return await renderTemplate(template, { mappedWounds });
    }
    static _setupCallback() {
        return {
            label: LocalisationServer.localise("Select", "dialog"),
            callback: (_event, _button, dialog) => {
                return dialog.selectedWound;
            },
        };
    }
    async render(options) {
        const dialog = await super.render(options);
        dialog.#attachWoundSelectionHooks();
        const bodyPartSelector = this.element.querySelector("#bodyPartSelector");
        if (bodyPartSelector instanceof HTMLSelectElement) {
            bodyPartSelector?.addEventListener("change", async () => {
                const woundOverview = dialog.element.querySelector(".wound-overview-hook");
                if (!(woundOverview instanceof HTMLDivElement))
                    return;
                if (bodyPartSelector.value == "all") {
                    woundOverview.outerHTML = await dialog.#renderWoundOverview(dialog.mappedWounds);
                }
                else {
                    const selectedWounds = {};
                    for (const [index, wound] of Object.entries(dialog.mappedWounds)) {
                        if (wound.bodyPart.includes(bodyPartSelector.value)) {
                            selectedWounds[index] = wound;
                        }
                    }
                    woundOverview.outerHTML = await dialog.#renderWoundOverview(selectedWounds);
                }
                dialog.#attachWoundSelectionHooks();
            });
        }
        return dialog;
    }
    #attachWoundSelectionHooks() {
        this.element.querySelectorAll(".wound-selection-hook").forEach((x) => {
            x.addEventListener("click", () => {
                if (!(x instanceof HTMLElement))
                    return;
                this.selectedWound = {
                    woundIndex: +(x.dataset.index ?? -1),
                    source: x.dataset.source ?? LocalisationServer.localise("Unknown Wound", "dialog")
                };
                const selectedWoundElement = this.element.querySelector(".selected-wound-hook");
                if (!(selectedWoundElement instanceof HTMLElement))
                    return;
                selectedWoundElement.innerHTML = this.selectedWound.source;
            });
        });
    }
    async #renderWoundOverview(mappedWounds) {
        const template = "systems/the_edge/templates/dialogs/medicine-wound-overview.hbs";
        return await renderTemplate(template, { mappedWounds });
    }
}
