import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogEditFireMode extends DialogV2 {
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 300 },
            window: { title: LocalisationServer.localise("Edit Wound", "dialog") },
        };
    }
    static async prompt(options, config = {}) {
        config.content = await DialogEditFireMode._setupContent(options);
        config.ok = DialogEditFireMode._setupCallback(options.weaponType);
        return await super.prompt(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
    static async _setupContent(options) {
        const template = "systems/the_edge/templates/dialogs/edit-fire-mode.hbs";
        return await renderTemplate(template, options);
    }
    static _setupCallback(weaponType) {
        return {
            label: LocalisationServer.localise("Accept Changes", "dialog"),
            callback: (_event, _button, dialog) => {
                const result = { precisionPenalty: [0, 0] };
                const inputs = dialog.element.querySelectorAll("input");
                for (const input of inputs) {
                    if (typeof (input.dataset.field) == "undefined")
                        continue;
                    if (input.dataset.field == "precisionPenaltyUnaimed") {
                        result.precisionPenalty[0] = +input.value;
                    }
                    else if (input.dataset.field == "precisionPenaltyAimed") {
                        result.precisionPenalty[1] = +input.value;
                    }
                    else {
                        result[input.dataset.field] = input.type == "number" ? +input.value : input.value;
                    }
                }
                if (weaponType == "kinetic")
                    result.cost = result.nDie ?? 0;
                return result;
            },
        };
    }
}
