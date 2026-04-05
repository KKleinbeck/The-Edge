import LocalisationServer from "../system/localisation_server.js";
import SliderMixin from "../mixins/slider-mixin.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

export default class DialogProficiency extends SliderMixin(DialogV2) {
  static async start(checkData: IProficiencyRollQuery) {
    const template = "systems/the_edge/templates/dialogs/proficiency.hbs";
    const html = await renderTemplate(template, {});
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
    ]
    if (game.user.isGM) {
      buttons.push({
        action: "cheat",
        icon: "",
        label: LocalisationServer.localise("Cheat", "Dialog"),
      })
    }

    return new DialogProficiency({
      window: {
        title: LocalisationServer.localise(checkData.proficiency, "proficiency") +
        " " + game.i18n.localize("CHECK"),
      },
      content: content,
      buttons: buttons,
      position: {width: 300},
      submit: (result: any, dialog: DialogProficiency) => {
        if (result === "cheat") {
          DialogProficiency.cheatCallback(dialog, checkData);
          return;
        }

        DialogProficiency.rollCallback(dialog, checkData, result);
      }
    }).render({ force: true });
  }

  static rollCallback(dialog: DialogProficiency, checkData: IProficiencyRollQuery, roll: any) {
    const promptResult = dialog.getSliderValues();
    promptResult.roll = roll;

    const vantageElement = dialog.element.querySelector(".vantage-hook");
    if (!(vantageElement instanceof HTMLSelectElement)) return;
    promptResult.vantage = vantageElement.value;
    
    const proficiencyPromptResult: IProficiencyPromptResult = foundry.utils.mergeObject(
      checkData, promptResult as unknown as IRollPromptResult);
    checkData.actor.system.rollProficiencyCheck(proficiencyPromptResult);
    console.log(promptResult)
  }

  static cheatCallback(dialog: DialogProficiency, checkData: IProficiencyRollQuery) {
    console.log("not implemented yet");
  }
}