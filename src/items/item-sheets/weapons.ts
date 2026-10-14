import CounterMixin from "../../mixins/counter-mixin.js";
import DialogEditFireMode from "../../dialogs/dialog-edit-fire-mode.js";
import DiceDistribution from "../../system/dice-distribution.js";
import EmbeddedSkillMixin from "../../mixins/embedded-skills-mixin.js";
import LocalisationServer from "../../system/localisation_server.js";
import RangeChartSelectorMixin from "../../mixins/range-chart-selector-mixin.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

export default class ItemSheetWeapon extends EmbeddedSkillMixin(
  CounterMixin(RangeChartSelectorMixin(TheEdgeItemSheet)),
) {
  declare static item: foundryAny;
  declare tabGroups: foundryAny;

  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
      addFiringMode: ItemSheetWeapon._addFiringMode,
      deleteFiringMode: ItemSheetWeapon._deleteFiringMode,
      editFiringMode: ItemSheetWeapon._editFiringMode,
    },
    position: {
      width: 490,
      height: 790,
    },
    theEdgeParameters: {
      minWidth: 490,
      minHeight: 790
    },
  };

  static PARTS = {    // header: {
    header: {
      template: `systems/the_edge/templates/items/Weapon-header.hbs`,
    },
    separatorHeader: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    effects: {
      template: "systems/the_edge/templates/items/meta-effects-counters-skills.hbs",
    },
    details: {
      template: "systems/the_edge/templates/items/Weapon-details.hbs",
    },
    description: {
      template: "systems/the_edge/templates/items/meta-description.hbs",
    },
    separatorTabs: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    tabs: {
      template: "systems/the_edge/templates/applications/the-edge-tab-navigation.hbs"
    }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "details" }, { id: "effects" }, { id: "description" }],
      labelPrefix: "TABS",
      initial: "details",
    },
  };

  async render(options = {}, _options = {}): Promise<ItemSheetV2> {
    // Disable details for hand-to-hand combat
    if (this.item.system.type != "Hand-to-Hand combat") {
      // @ts-expect-error
      this.constructor.TABS.primary.tabs = [
        { id: "details" },
        { id: "effects" },
        { id: "description" },
      ];
      this.tabGroups.primary = "details";
    } else {
      // @ts-expect-error
      this.constructor.TABS.primary.tabs = [
        { id: "effects" },
        { id: "description" },
      ];
      this.tabGroups.primary = "description";
    }
    return super.render(options, _options);
  }

  getModifiers(_target) {
    return {
      modifiers: this.item.system.effect,
      context: { title: LocalisationServer.localise("Modifiers") },
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.helpers = {
      attributes: THE_EDGE.characterSchema.attributes,
      weapon_types: Object.keys(THE_EDGE.coreValueMap.weapons).filter(
        (x) => !x.includes("General"),
      ),
    };
    context.ammunitionTypes = this._setAmmunitionTypesDict();
    context.ammunitionTypeIsArbitrary = !THE_EDGE.ammunitionSubtypes.includes(
      this.item.system.ammunitionType,
    );
    context.dynamicSubtype = context.ammunitionTypeIsArbitrary
      ? this.item.system.ammunitionType
      : "";
    context.fireModes = [];
    for (const fm of this.item.system.fireModes) {
      const distributionData = DiceDistribution.calculateDistribution(fm.damage);
      context.fireModes.push({
        ...fm,
        ...distributionData,
        distribution: DiceDistribution.toNormalisedMap(distributionData.distribution),
      });
    }
    return context;
  }

  _setAmmunitionTypesDict() {
    const ammunitionTypes = {};
    for (const type of THE_EDGE.ammunitionSubtypes) {
      ammunitionTypes[type] = {
        icon: `systems/the_edge/icons/ammunition/${type}.png`,
        selected: type == this.item.system.ammunitionType,
      };
    }
    return ammunitionTypes;
  }

  async onIconSelected(iconType, value) {
    switch (iconType) {
      case "ammunitionType":
        this.item.system.ammunitionType = value;
        this.updateIcons(
          iconType,
          this._setAmmunitionTypesDict(),
          THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value,
        );
        await this.item.update(
          { "system.ammunitionType": value },
          { render: false },
        );
        break;
    }
  }

  static async _addFiringMode(_event, _target) {
    const fireModeTemplate = {
      name: "Name",
      damage: "1d20",
      nDie: 1,
      cost: 1,
      precisionPenalty: [0, 0],
    };
    const newFireMode = await DialogEditFireMode.prompt({
      fireMode: fireModeTemplate, weaponType: this.item.system.weaponType
    });

    if (newFireMode) {
      const fireModes = this.item.system.fireModes;
      fireModes.push(newFireMode);
      this.item.update({ "system.fireModes": fireModes });
    }
  }

  static _deleteFiringMode(_event, target) {
    const index = target.dataset.index;

    const fireModes = this.item.system.fireModes;
    fireModes.splice(index, 1);
    this.item.update({ "system.fireModes": fireModes });
  }

  static async _editFiringMode(_event, target) {
    const index = target.dataset.index;
    const change = await DialogEditFireMode.prompt({
      fireMode: this.item.system.fireModes[index], weaponType: this.item.system.weaponType
    });

    if (change) {
      const fireModes = this.item.system.fireModes;
      fireModes[index] = change
      this.item.update({ "system.fireModes": fireModes });
    }
  }
}
