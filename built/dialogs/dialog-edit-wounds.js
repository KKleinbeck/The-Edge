import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogEditWounds extends DialogV2 {
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 250, height: 250 },
            window: { title: LocalisationServer.localise("Edit Wound", "dialog") }
        };
    }
    static async prompt(wound, config = {}) {
        config.content = await DialogEditWounds._setupContent(wound);
        config.ok = DialogEditWounds._setupCallback();
        return await super.prompt(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static async _setupContent(wound) {
        const template = "systems/the_edge/templates/dialogs/edit-wounds.hbs";
        return await renderTemplate(template, wound);
    }
    static _setupCallback() {
        return {
            label: LocalisationServer.localise("Accept Changes", "dialog"),
            callback: (_event, _button, dialog) => {
                const result = {};
                for (const entry of ["source", "status", "damage", "bleeding"]) {
                    const element = dialog.element.querySelector(`.${entry}-hook`);
                    result[entry] = element.type === "number" ? +element.value : element.value;
                }
                return result;
            }
        };
    }
}
