import LocalisationServer from "../system/localisation_server.js";
export default class DialogItemDeletion extends Dialog {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 300,
        });
    }
    static async start(checkData) {
        let buttons = {
            yes: {
                label: LocalisationServer.localise("yes", "dialog"),
                callback: async (_html) => { checkData.item.delete(); },
            },
            cancel: { label: LocalisationServer.localise("cancel", "dialog") },
        };
        return new DialogItemDeletion({
            title: LocalisationServer.parsedLocalisation("delete item", "dialog", checkData.item),
            content: "",
            buttons: buttons,
            default: "cancel",
        }).render(true);
    }
}
