import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import SliderMixin from "../mixins/slider-mixin.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

export default class DialogProficiency extends SliderMixin(DialogV2) {
  declare checkData: IProficiencyRollQuery
  declare vantage: VantageType

  constructor (checkData: IProficiencyRollQuery, options: foundryAny) {
    super(options);
    this.checkData = checkData;
    this.vantage = "Nothing";
  }

  _onRender(context: any, options: any): void {
    super._onRender(context, options);
    this.element.querySelector(".vantage-hook")!.addEventListener("change", (event: Event) => {
      if(!(event.target instanceof HTMLSelectElement)) return;
      this.vantage = event.target.value as VantageType;
      this._onChanceChanged();
    });
  }

  static async start(checkData: IProficiencyRollQuery) {
    var threshold = 0;
    for (const data of checkData.actor.system.getProficiencyDiceThresholds(checkData.proficiency)) {
      threshold += data.threshold;
    }

    const template = "systems/the_edge/templates/dialogs/proficiency.hbs";
    const html = await renderTemplate(template, {
      chance: Aux.asChance(Aux.proficiencySuccessChance(
        threshold, checkData.actor.system.proficiencyDiceParameter
      ), true)
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
      submit: (result: any, dialog: DialogProficiency) => {
        if (result === "cheat") {
          DialogProficiency.cheatCallback(dialog, checkData);
          return;
        }

        DialogProficiency.rollCallback(dialog, checkData, result);
      }
    }).render({ force: true });
  }

  static rollCallback(dialog: DialogProficiency, checkData: IProficiencyRollQuery, roll: rollType) {
    const promptResult = dialog.getSliderValues();
    promptResult.roll = roll;
    checkData.proficiency = checkData.proficiency.toLowerCase();

    const vantageElement = dialog.element.querySelector(".vantage-hook");
    if (!(vantageElement instanceof HTMLSelectElement)) {
      ui.notifications.error("VantageElement is not of type HTMLSelectElement");
      return;
    }
    promptResult.vantage = vantageElement.value;
    
    const proficiencyPromptResult: IProficiencyPromptResult = foundry.utils.mergeObject(
      checkData, promptResult as unknown as IRollPromptResult);
    checkData.actor.system.rollProficiencyCheck(proficiencyPromptResult);
  }

  static cheatCallback(dialog: DialogProficiency, checkData: IProficiencyRollQuery) {
    console.log("not implemented yet");
  }

  // Helpers for rendering
  onValueChanged(_id: string, _value: number): void { this._onChanceChanged(); }

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