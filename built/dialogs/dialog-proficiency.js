import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import SliderMixin from "../mixins/slider-mixin.js";
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;
export default class DialogProficiency extends SliderMixin(DialogV2) {
    constructor(checkData, options) {
        super(options);
        this.checkData = checkData;
        this.vantage = "Nothing";
    }
    _onRender(context, options) {
        super._onRender(context, options);
        this.element.querySelector(".vantage-hook").addEventListener("change", (event) => {
            if (!(event.target instanceof HTMLSelectElement))
                return;
            this.vantage = event.target.value;
            this._onChanceChanged();
        });
    }
    static async start(checkData) {
        const proficiencyData = checkData.actor.system.getProficiencyDiceThresholds(checkData.proficiency);
        var threshold = 0;
        for (const data of proficiencyData)
            threshold += data.threshold;
        const template = "systems/the_edge/templates/dialogs/proficiency.hbs";
        const strainReduction = checkData.actor.system.strain.maxUseReduction.status;
        const html = await renderTemplate(template, {
            chance: Aux.asChance(Aux.proficiencySuccessChance(threshold, checkData.actor.system.proficiencyDiceParameter), true),
            maxStrain: proficiencyData.filter(x => x.name == "proficiency")[0].threshold + strainReduction
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
        return new DialogProficiency(checkData, {
            window: {
                title: LocalisationServer.localise(checkData.proficiency, "proficiency") +
                    " " + game.i18n.localize("CHECK"),
            },
            content: content,
            buttons: buttons,
            position: { width: 300 },
            submit: (result, dialog) => {
                if (result === "cheat") {
                    DialogProficiency.cheatCallback(dialog, checkData);
                    return;
                }
                DialogProficiency.rollCallback(dialog, checkData, result);
            }
        }).render({ force: true });
    }
    static rollCallback(dialog, checkData, roll) {
        const promptResult = dialog.getSliderValues();
        if (!(promptResult.strain))
            promptResult.strain = 0;
        promptResult.roll = roll;
        checkData.proficiency = checkData.proficiency.toLowerCase();
        const vantageElement = dialog.element.querySelector(".vantage-hook");
        if (!(vantageElement instanceof HTMLSelectElement)) {
            ui.notifications.error("VantageElement is not of type HTMLSelectElement");
            return;
        }
        promptResult.vantage = vantageElement.value;
        const proficiencyPromptResult = foundry.utils.mergeObject(checkData, promptResult);
        checkData.actor.system.rollProficiencyCheck(proficiencyPromptResult);
    }
    static cheatCallback(dialog, checkData) {
        console.log("not implemented yet");
    }
    // Helpers for rendering
    onValueChanged(_id, _value) { this._onChanceChanged(); }
    _onChanceChanged() {
        const sliderValues = this.getSliderValues();
        let threshold = Object.values(sliderValues).sum();
        for (const data of this.checkData.actor.system.getProficiencyDiceThresholds(this.checkData.proficiency)) {
            threshold += data.threshold;
        }
        const chanceElement = this.element.querySelector(".chance-hook");
        if (!chanceElement)
            return;
        var chance = Aux.proficiencySuccessChance(threshold, this.checkData.actor.system.proficiencyDiceParameter);
        if (this.vantage == "Advantage")
            chance = 1 - (1 - chance) ** 2;
        else if (this.vantage == "Disadvantage")
            chance = chance ** 2;
        chanceElement.innerHTML = Aux.asChance(chance, true);
    }
}
