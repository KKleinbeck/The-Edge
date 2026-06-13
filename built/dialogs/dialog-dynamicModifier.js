import LocalisationServer from "../system/localisation_server";
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogDynamicModifier extends Dialog {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 300
        });
    }
    static async start(checkData) {
        const template = "systems/the_edge/templates/dialogs/medicine.hbs";
        const html = await renderTemplate(template);
        const buttons = {
            select: {
                label: game.i18n.localize("DIALOG.SELECT"),
                callback: async (html) => {
                    console.log("Hello World");
                }
            },
            cancel: {
                label: game.i18n.localize("DIALOG.CANCEL")
            }
        };
        return new DialogDynamicModifier({
            title: LocalisationServer.localise("Edit Event", "Dialog"),
            content: html,
            buttons: buttons,
            default: "cancel"
        }).render(true);
    }
}
