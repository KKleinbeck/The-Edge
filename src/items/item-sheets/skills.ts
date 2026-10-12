import LocalisationServer from "../../system/localisation_server.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

export class ItemSheetSkill extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
    },
  };

  static PARTS = {
    details: {
      template: `systems/the_edge/templates/items/Skill-details.hbs`,
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

  async getCustomFooterBar() {
    let content = `
      <div class="item-footer-content-entry">
        <input class="item-footer-input" name="system.maxLevel" type="number" id="maxLevel" value="${this.item.system.maxLevel}"/>
        <label for="maxLevel" style="display: inline-block;">${LocalisationServer.localise("Levels")}</label>
      </div>
      <div class="item-footer-content-entry">
        <input class="item-footer-input" type="text" id="cost" name="system.cost" value="${this.item.system.cost}"/>
        <label for="cost" data-tooltip="${LocalisationServer.localise("PH Cost")}">
          ${LocalisationServer.localise("PH")}
        </label>
      </div>
    `;
    return content;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.coreRequirements = structuredClone(THE_EDGE.coreValueMap);
    context.coreRequirements.skills = {};
    const skills = game.items.filter((x) =>
      x.type.toLowerCase().includes("skill"),
    );
    for (const skill of skills) {
      context.coreRequirements.skills[skill.name] = skill.name;
    }
    return context;
  }

  getModifiers(target): IModifiersAndContext {
    const data = target.closest(".effect-modifiers-hook").dataset;
    switch (data.type) {
      case "effects":
        return {
          modifiers: this.item.system.effects[data.index],
          context: data,
        };
      case "requirements":
      default:
        return {
          modifiers: this.item.system.requirements[data.index],
          context: data,
        };
    }
  }

  async updateModifiers(modifiers, context) {
    const target = this.item.system[context.type];
    target[context.index] = modifiers;
    await this.item.update(
      { [`system.${context.type}`]: target },
      { render: false },
    );
  }

  _attachAdditionalFrameListeners() {
    super._attachAdditionalFrameListeners();

    this.element
      .querySelectorAll("#maxLevel")
      ?.forEach((x) =>
        x.addEventListener("change", (ev) => this._onMaxLevelChange(ev)),
      );
  }

  // _onRender(context, options) {
  //   super._onRender(context, options);
  //   this.element
  //     .querySelectorAll(".effect-level-modify")
  //     ?.forEach((x) =>
  //       x.addEventListener("change", (ev) => this._onLevelModify(ev)),
  //     );
  // }

  async _onMaxLevelChange(ev) {
    const maxLevel = ev.target.value;
    const eff = this.item.system.effects;
    const req = this.item.system.requirements;
    if (eff.length >= maxLevel) {
      await this.item.update({
        "system.maxLevel": maxLevel,
        "system.effects": eff.slice(0, maxLevel),
        "system.requirements": req.slice(0, maxLevel),
      });
    } else {
      for (let i = eff.length; i < maxLevel; ++i) {
        eff.push([]);
        req.push([]);
      }
      await this.item.update({
        "system.maxLevel": maxLevel,
        "system.effects": eff,
        "system.requirements": req,
      });
    }
  }
}
