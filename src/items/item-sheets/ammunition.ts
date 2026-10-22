import RangeChartSelectorMixin from "../../mixins/range-chart-selector-mixin.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

const { renderTemplate } = foundry.applications.handlebars;

export class ItemSheetAmmunition extends RangeChartSelectorMixin(
  TheEdgeItemSheet,
) {
  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    position: {
      width: 490,
      height: 540,
    },
    theEdgeParameters: {
      minWidth: 490,
      minHeight: 540
    },
  }

  static PARTS = {
    header: {
      template: `systems/the_edge/templates/items/Ammunition-header.hbs`,
    },
    separatorHeader: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    details: {
      template: "systems/the_edge/templates/items/Ammunition-details.hbs",
    },
    description: {
      template: "systems/the_edge/templates/items/meta-description.hbs",
    },
    separatorTabs: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    tabs: {
      template: "systems/the_edge/templates/applications/the-edge-tab-navigation.hbs"
    },
  };

  static TABS = {
    primary: {
      tabs: [{ id: "details" }, { id: "description" }],
      labelPrefix: "TABS",
      initial: "details",
    },
  };

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options);
    context.designatedWeaponsHTML = context.item.system.designatedWeapons;
    context.types = this._setTypesDict();
    context.subtypes = this._setSubtypesDict();
    context.subtypeIsArbitrary = !THE_EDGE.ammunitionSubtypes.includes(
      this.item.system.subtype,
    );
    context.dynamicSubtype = context.subtypeIsArbitrary
      ? this.item.system.subtype
      : "";
    return context;
  }

  _setTypesDict(): Record<string, IIconSelected> {
    const types = {};
    for (const type of ["energy", "kinetic"]) {
      types[type] = {
        icon: `systems/the_edge/icons/ammunition/${type}.png`,
        selected: type == this.item.system.type,
      };
    }
    return types;
  }

  _setSubtypesDict() {
    const subtypes = {};
    for (const type of THE_EDGE.ammunitionSubtypes) {
      subtypes[type] = {
        icon: `systems/the_edge/icons/ammunition/${type}.png`,
        selected: type == this.item.system.subtype,
      };
    }
    return subtypes;
  }

  async onIconSelected(iconType, value) {
    switch (iconType) {
      case "type":
        this.item.system.type = value;
        this.updateIcons(iconType, this._setTypesDict());
        this._renderDetails();
        break;

      case "subtype":
        this.item.system.subtype = value;
        this.updateIcons(
          iconType,
          this._setSubtypesDict(),
          THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value,
        );
        break;
    }
    await this.item.update(
      { [`system.${iconType}`]: value },
      { render: false },
    );
  }

  async _renderDetails() {
    const template = "systems/the_edge/templates/items/Ammunition-details-content.hbs";
    const html = await renderTemplate(template, await this._prepareContext());

    const ammunitionDetailsHTML = this.element.querySelector(
      ".ammunition-details",
    );
    
    if (!ammunitionDetailsHTML) return;
    ammunitionDetailsHTML.innerHTML = html;
  }
}
