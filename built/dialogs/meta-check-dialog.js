import SliderMixin from "../mixins/slider-mixin.js";
const { DialogV2 } = foundry.applications.api;
export default class CheckDialog extends SliderMixin(DialogV2) {
    constructor(options) {
        super(options);
        this.vantage = "Nothing";
    }
    _onRender(context, options) {
        super._onRender(context, options);
        this.element.querySelector(".vantage-hook").addEventListener("change", (event) => {
            if (!(event.target instanceof HTMLSelectElement))
                return;
            this.vantage = event.target.value;
            this.onVantageChanged();
        });
    }
    get promptResult() {
        const sliderValues = this.getSliderValues();
        return {
            modifier: sliderValues.modifier ?? 0,
            strain: sliderValues.strain ?? 0,
            vantage: this.vantage
        };
    }
    onVantageChanged() { }
}
