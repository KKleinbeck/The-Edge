import Aux from "../system/auxilliaries.js";
import CheckDialog from "./meta-check-dialog.js";
import LocalisationServer from "../system/localisation_server.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class DialogProficiency extends CheckDialog {
  declare checkData: IProficiencyRollQuery
  declare vantage: TVantage

  constructor (checkData: IProficiencyRollQuery, options: foundryAny) {
    super(options);
    this.checkData = checkData;
  }

  static async start(checkData: IProficiencyRollQuery, onSubmitCallback?: Function): Promise<DialogV2> {
    const proficiencyData = checkData.actor.system.getProficiencyDiceThresholds(checkData.proficiency);
    var threshold = 0;
    for (const data of proficiencyData) threshold += data.threshold;

    const template = "systems/the_edge/templates/dialogs/basic-rolls.hbs";
    const strainReduction = checkData.actor.system.strain.maxUseReduction.status;
    const html = await renderTemplate(template, {
      chance: Aux.asChance(Aux.proficiencySuccessChance(
        threshold, checkData.actor.system.proficiencyDiceParameter
      ), true),
      modifierValue: checkData.modifier ?? 0,
      maxStrain: proficiencyData.filter(x => x.name == "proficiency")[0].threshold + strainReduction,
      strainHintType: "proficiency strain"
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
    ]
    if (game.user.isGM) {
      buttons.push({
        action: "cheat",
        icon: "",
        label: LocalisationServer.localise("Cheat", "Dialog"),
      })
    }

    return new DialogProficiency(checkData, {
      window: {
        title: LocalisationServer.localise(checkData.proficiency, "proficiency") +
        " " + game.i18n.localize("CHECK"),
      },
      content: content,
      buttons: buttons,
      position: {width: 300},
      submit: async (result: any, dialog: DialogProficiency): Promise<void> => {
        if (result === "cheat") DialogProficiency.cheatCallback(dialog, checkData, onSubmitCallback);
        else DialogProficiency.rollCallback(dialog, checkData, result, onSubmitCallback);
      }
    }).render({ force: true });
  }

  static async rollCallback(
    dialog: DialogProficiency, checkData: IProficiencyRollQuery, roll: rollType, onSubmitCallback: Function | undefined
  ) {
    const sliderValues = dialog.getSliderValues();
    checkData.proficiency = checkData.proficiency.toLowerCase();

    const vantageElement = dialog.element.querySelector(".vantage-hook");
    if (!(vantageElement instanceof HTMLSelectElement)) {
      ui.notifications.error("VantageElement is not of type HTMLSelectElement");
      return;
    }
    const promptResult: IRollPromptResult = {roll, ...dialog.promptResult};
    if (!(promptResult.strain)) promptResult.strain = 0;
    
    const proficiencyPromptResult: IProficiencyPromptResult = foundry.utils.mergeObject(
      checkData, promptResult);
    checkData.actor.system.rollProficiencyCheck(proficiencyPromptResult, onSubmitCallback);
  }

  static cheatCallback(dialog: DialogProficiency, checkData: IProficiencyRollQuery, onSubmitCallback: Function | undefined) {
    console.log("not implemented yet");
  }

  // Helpers for rendering
  onValueChanged(_id: string, _value: number): void { this._onChanceChanged(); }
  onVantageChanged(): void { this._onChanceChanged(); }

  _onChanceChanged() {
    const sliderValues = this.getSliderValues()

    let threshold: number = Object.values(sliderValues).sum() as number;
    for (const data of this.checkData.actor.system.getProficiencyDiceThresholds(this.checkData.proficiency)) {
      threshold += data.threshold;
    }

    const chanceElement = this.element.querySelector(".chance-hook");
    if (!chanceElement) return;

    var chance = Aux.proficiencySuccessChance(threshold, this.checkData.actor.system.proficiencyDiceParameter);
    if (this.vantage == "Advantage") chance = 1 - (1 - chance)**2;
    else if (this.vantage == "Disadvantage") chance = chance**2;
    chanceElement.innerHTML = Aux.asChance(chance, true) as string;
  }
}