import SliderMixin from "../mixins/slider-mixin.js";

const { DialogV2 } = foundry.applications.api;

export default class CheckDialog extends SliderMixin(DialogV2) {
  declare vantage: TVantage

  constructor (options: foundryAny) {
    super(options);
    this.vantage = "Nothing";
  }

  _onRender(context: any, options: any): void {
    super._onRender(context, options);
    this.element.querySelector(".vantage-hook")!.addEventListener("change", (event: Event) => {
      if(!(event.target instanceof HTMLSelectElement)) return;
      this.vantage = event.target.value as TVantage;
      this.onVantageChanged();
    });
  }

  get promptResult(): Omit<IRollPromptResult, "roll"> {
    const sliderValues = this.getSliderValues();
    return {
      modifier: sliderValues.modifier ?? 0,
      strain: sliderValues.strain ?? 0,
      vantage: this.vantage
    };
  }

  onVantageChanged(): void {}
}
