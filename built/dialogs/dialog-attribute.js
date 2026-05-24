import CheckDialog from "./meta-check-dialog.js";
import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogAttribute extends CheckDialog {
    static async start(checkData) {
        const template = "systems/the_edge/templates/dialogs/basic-rolls.hbs";
        const attributeLevel = checkData.actor.system.attributes[checkData.attribute].value;
        const strainMaxUseReduction = checkData.actor.system.strain.maxUseReduction.status;
        const html = await renderTemplate(template, {
            maxStrain: THE_EDGE.attributesMaxStrain(attributeLevel, strainMaxUseReduction),
            strainHintType: "Attribute Strain"
        });
        const content = document.createElement("div");
        content.innerHTML = html;
        const buttons = [
            {
                action: "roll",
                icon: "fa-regular fa-message",
                label: LocalisationServer.localise("Roll", "Dialog"),
            },
            {
                action: "whisper",
                icon: "fa-regular fa-mask",
                label: LocalisationServer.localise("GM-Whisper", "Dialog"),
            },
            {
                action: "blind",
                icon: "fa-regular fa-eye-low-vision",
                label: LocalisationServer.localise("Blind Roll", "Dialog"),
            },
        ];
        if (game.user.isGM) {
            buttons.push({
                action: "cheat",
                icon: "",
                label: LocalisationServer.localise("Cheat", "Dialog"),
            });
        }
        return new DialogAttribute({
            window: {
                title: LocalisationServer.localise(checkData.attribute, "attr") + " " + game.i18n.localize("CHECK"),
            },
            content: content,
            buttons: buttons,
            position: { width: 300 },
            submit: (result, dialog) => {
                if (result === "cheat") {
                    DialogAttribute.cheatCallback(dialog, checkData);
                    return;
                }
                DialogAttribute.rollCallback(dialog, checkData, result);
            }
        }).render(true);
    }
    static rollCallback(dialog, checkData, roll) {
        const sliderValues = dialog.getSliderValues();
        const vantageElement = dialog.element.querySelector(".vantage-hook");
        if (!(vantageElement instanceof HTMLSelectElement)) {
            ui.notifications.error("VantageElement is not of type HTMLSelectElement");
            return;
        }
        const promptResult = { roll, ...dialog.promptResult };
        checkData.attribute = checkData.attribute.toLowerCase();
        const attributePromptResult = foundry.utils.mergeObject(checkData, promptResult);
        checkData.actor.system.rollAttributeCheck(attributePromptResult);
    }
    static cheatCallback(dialog, checkData) {
        console.log("not implemented yet");
    }
}
