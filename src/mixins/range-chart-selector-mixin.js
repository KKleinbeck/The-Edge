import Aux from "../system/auxilliaries.js";

const { renderTemplate } = foundry.applications.handlebars;

export default function RangeChartSelectorMixin(BaseApplication) {
  class RangeChartSelector extends BaseApplication {
    static DEFAULT_OPTIONS = {
      actions: { selectRange: RangeChartSelector._selectRange }
    }

    static async _selectRange(_event, target) {
      const dataset = target.dataset;
      const rangeAccuracy = this.item.system.rangeChart[dataset.label];
      
      const modifier = +dataset.modifier;
      if (modifier >= 11 || modifier <= -11) {
        const promptValue = await Aux.promptInput();
        if (promptValue) rangeAccuracy[dataset.index] = promptValue;
      }
      else rangeAccuracy[dataset.index] = modifier;

      const field = `system.rangeChart.${dataset.label}`;
      const update = {};
      update[field] = rangeAccuracy;
      await this.item.update(update, {render: false});
      this._renderRangeChart()
    }

    async _renderRangeChart() {
      const template = "systems/the_edge/templates/generic/range-chart.hbs";
      const html = await renderTemplate(
        template, {rangeChart: this.item.system.rangeChart}
      );

      const rangeChartHTML = this.element.querySelector(".range-chart");
      rangeChartHTML.outerHTML = html;
    }
  }

  return RangeChartSelector;
}