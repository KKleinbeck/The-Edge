import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogReload extends DialogV2 {
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 400 },
            window: { title: LocalisationServer.localise("Select ammunition", "dialog") },
        };
    }
    static async wait(details, config = {}) {
        config.buttons = [
            {
                action: "select",
                callback: DialogReload._setupSelectCallback,
                label: LocalisationServer.localise("Select", "Dialog"),
            },
            {
                action: "empty",
                callback: () => { return { outcome: "empty" }; },
                label: LocalisationServer.localise("Empty", "Dialog"),
            }
        ];
        config.close = () => { return { outcome: "closed" }; };
        config.content = await DialogReload._setupContent(details);
        return await super.wait(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static async _setupContent(details) {
        const template = "systems/the_edge/templates/dialogs/reload.hbs";
        return await renderTemplate(template, details);
    }
    static _setupSelectCallback(_event, _button, dialog) {
        const ammunitionElement = dialog.element.querySelector("#ammunitionSelector");
        if (!(ammunitionElement instanceof HTMLSelectElement))
            return { outcome: "closed" };
        return { outcome: "load", ammunitionId: ammunitionElement.value };
    }
}
