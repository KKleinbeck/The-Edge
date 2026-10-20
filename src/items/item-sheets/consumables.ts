import LocalisationServer from "../../system/localisation_server.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

const { renderTemplate } = foundry.applications.handlebars;

export class ItemSheetConsumables extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
    },
  };

  static PARTS = {
    header: {
      template: `systems/the_edge/templates/items/Consumables-header.hbs`,
    },
    separatorHeader: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    damage: {
      template: "systems/the_edge/templates/items/Grenade-damage.hbs",
    },
    effects: {
      template: "systems/the_edge/templates/items/meta-effects.hbs",
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
      tabs: [{ id: "effects" }, { id: "description" }],
      labelPrefix: "TABS",
      initial: "description",
    },
  };

  async render(options = {}, _options = {}): Promise<ItemSheetV2> {
    const ctor = this.constructor as typeof ItemSheetConsumables;
    // Disable effects for generic
    if (this.item.system.current_type == "grenade") {
      ctor.TABS.primary.tabs = [
        { id: "damage" },
        { id: "effects" },
        { id: "description" },
      ];
    } else if (this.item.system.current_type != "generic") {
      ctor.TABS.primary.tabs = [
        { id: "effects" },
        { id: "description" },
      ];
      if (this.tabGroups.primary == "damage")
        this.tabGroups.primary = "effects";
    } else {
      ctor.TABS.primary.tabs = [{ id: "description" }];
      if (this.tabGroups.primary == "effects")
        this.tabGroups.primary = "description";
    }

    // Special Effects tab for Grenades
    if (this.item.system.current_type == "grenade") {
      ctor.PARTS.effects.template =
        "systems/the_edge/templates/items/Grenade-effects.hbs";
    } else {
      ctor.PARTS.effects.template =
        "systems/the_edge/templates/items/meta-effects.hbs";
    }

    return super.render(options, _options);
  }

  async _prepareContext(options?): Promise<Record<string, any>> {
    const context = await super._prepareContext(options);
    context.grenadeEffects = this._grenadeEffects();
    context.helpers = {
      medicineEffects: THE_EDGE.medicine_effects,
      displayHint: this.options.displayHint,
      damageTypes: THE_EDGE.combat_damage_types,
    };

    return context;
  }

  getModifiers(target) {
    const effectData = target.closest(".effect-modifiers-hook")?.dataset;
    if (!(effectData?.type == "grenade-effect"))
      return super.getModifiers(target);

    const { category, distance } = effectData;
    const modifiers =
      this.item.system.subtypes.grenade.effects[category][distance];
    return {
      modifiers: modifiers,
      context: {
        ...effectData,
        title: LocalisationServer.localise(effectData.distance, "Combat"),
      },
    };
  }

  async updateModifiers(modifiers, context) {
    if (!(context?.type == "grenade-effect"))
      return super.updateModifiers(modifiers, context);
    await this.item.update(
      {
        [`system.subtypes.grenade.effects.${context.category}.${context.distance}`]:
          modifiers,
      },
      { render: false },
    );
  }

  _grenadeEffects() {
    const grenadeEffects = {
      smoke: { render: "solid", icon: "cloud" },
      emp: { render: "regular", icon: "bolt-lightning" },
      shellshock: { render: "solid", icon: "person-falling-burst" },
    };
    for (const effect of Object.keys(grenadeEffects)) {
      grenadeEffects[effect].selected =
        this.item.system.subtypes.grenade.effects[effect].active;
    }
    return grenadeEffects;
  }

  async onIconSelected(this, iconType, value) {
    switch (iconType) {
      case "grenadeEffect":
        const effects = structuredClone(
          this.item.system.subtypes.grenade.effects,
        );
        const target = "system.subtypes.grenade.effects";
        effects[value].active = !effects[value].active;

        const update = {};
        update[target] = effects;
        await this.item.update(update, { render: false });
        this._drawGrenadeEffects();
        this.updateIcons(iconType, this._grenadeEffects());
    }
  }

  async _drawGrenadeEffects() {
    const template =
      "systems/the_edge/templates/items/Grenade-effects-content.hbs";
    const html = await renderTemplate(template, await this._prepareContext());

    const grenadeEffectsHTML = this.element.querySelector(".grenade-effects-hook");
    if (!grenadeEffectsHTML) return;
    grenadeEffectsHTML.innerHTML = html;
    this.attachEffectListeners();
  }
}
