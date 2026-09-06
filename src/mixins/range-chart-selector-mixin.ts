import Aux from "../system/auxilliaries.js";

const { renderTemplate } = foundry.applications.handlebars;

type intype = Constructor<HandlebarsApplication>;
type outtype<T> = T & Constructor<RangeChartSelector>;
export default function RangeChartSelectorMixin<T extends intype>(
  BaseApplication: T,
): outtype<T> {
  return class RangeChartSelector extends BaseApplication {
    declare static item: Item;

    static DEFAULT_OPTIONS = {
      actions: { selectRange: RangeChartSelector._selectRange },
    };

    static async _selectRange(_event: Event, target: HTMLElement) {
      const dataset = target.dataset;
      if (typeof dataset.label === "undefined") return;
      if (typeof dataset.modifier === "undefined") return;
      if (typeof dataset.index === "undefined") return;

      const rangeAccuracy = this.item.system.rangeChart[dataset.label];

      const modifier = +dataset.modifier;
      if (modifier >= 11 || modifier <= -11) {
        const promptValue = await Aux.promptInput();
        if (promptValue) rangeAccuracy[dataset.index] = promptValue;
      } else rangeAccuracy[dataset.index] = modifier;

      const field = `system.rangeChart.${dataset.label}`;
      const update = {};
      update[field] = rangeAccuracy;
      await this.item.update(update, { render: false });
      RangeChartSelector._renderRangeChart.call(this);
    }

    static async _renderRangeChart() {
      const template = "systems/the_edge/templates/generic/range-chart.hbs";
      const html = await renderTemplate(template, {
        rangeChart: this.item.system.rangeChart,
      });

      // @ts-expect-error
      const rangeChartHTML = this.element.querySelector(".range-chart");
      if (!(rangeChartHTML instanceof Element)) return;
      rangeChartHTML.outerHTML = html;
    }
  };
}
