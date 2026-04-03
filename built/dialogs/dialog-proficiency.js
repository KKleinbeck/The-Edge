import LocalisationServer from "../system/localisation_server.js";
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;
export default class DialogProficiency extends DialogV2 {
    static async start(checkData) {
        const template = "systems/the_edge/templates/dialogs/proficiency.hbs";
        const html = await renderTemplate(template, {});
        const content = document.createElement("div");
        content.innerHTML = html;
        const buttons = [{
                action: "roll",
                label: LocalisationServer.localise("Roll", "Dialog"),
                callback: (event, button, dialog) => {
                    // (checkData as IProficiencyRollResult).temporaryMod = parseInt(html.find('[name="Modifier"]').val());
                    // (checkData as IProficiencyRollResult).vantage = html.find('[name="AdvantageSelector"]').val();
                    // const rollType = Aux.parseRollType(html);
                    // checkData.actor.system.rollProficiencyCheck(checkData, rollType);
                }
            }];
        if (game.user.isGM) {
            buttons.push({
                action: "cheat",
                label: LocalisationServer.localise("Cheat", "Dialog"),
                callback: (event, button, dialog) => {
                    console.log("not implemented yet");
                }
            });
        }
        return new DialogProficiency({
            window: {
                title: LocalisationServer.localise(checkData.proficiency, "proficiency") +
                    " " + game.i18n.localize("CHECK"),
            },
            content: content,
            buttons: buttons,
            position: { width: 300 }
        }).render({ force: true });
    }
}
