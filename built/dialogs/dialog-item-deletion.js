import LocalisationServer from "../system/localisation_server.js";
const { DialogV2 } = foundry.applications.api;
export default class DialogItemDeletion extends DialogV2 {
    static get DEFAULT_CONFIG() {
        return {
            position: { width: 200 },
        };
    }
    static async wait(details, config = {}) {
        config.buttons = [
            {
                action: "yes",
                callback: () => { return { delete: true }; },
                label: LocalisationServer.localise("Yes", "Dialog"),
            },
            {
                action: "cancel",
                callback: () => { return { delete: false }; },
                label: LocalisationServer.localise("Cancel", "Dialog"),
            }
        ];
        config.close = () => { return { delete: false }; };
        config.window = { title: LocalisationServer.parsedLocalisation("Delete Item", "dialog", details) };
        return await super.wait(foundry.utils.mergeObject(this.DEFAULT_CONFIG, config));
    }
}
