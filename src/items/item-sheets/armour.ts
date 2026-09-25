import Aux from "../../system/auxilliaries.js";
import CounterMixin from "../../mixins/counter-mixin.js";
import EmbeddedSkillMixin from "../../mixins/embedded-skills-mixin.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

const { renderTemplate } = foundry.applications.handlebars;


export class ItemSheetArmour extends EmbeddedSkillMixin(CounterMixin(TheEdgeItemSheet)) {
  static DEFAULT_OPTIONS = {
    ...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
      detachAttachment: ItemSheetArmour._detachAttachment,
      editAttachment: ItemSheetArmour._editAttachment,
    },
  };

  static PARTS = {
    ...TheEdgeItemSheet.PARTS,
    form: {
      template: `systems/the_edge/templates/items/Armour-header.hbs`,
    },
    effects: {
      template: "systems/the_edge/templates/items/meta-effects-counters-skills.hbs",
    },
    details: {
      template: "systems/the_edge/templates/items/Armour-details.hbs",
    },
    attachments: {
      template: "systems/the_edge/templates/items/meta-attachments.hbs",
    },
  };

  static TABS = {
    primary: {
      tabs: [{ id: "effects" }, { id: "details" }, { id: "description" }],
      labelPrefix: "TABS",
      initial: "details",
    },
  };

  async _prepareContext(options) {
    if (
      this.item.system.attachments.length &&
      this.item.system.layer == "Inner"
    ) {
      // @ts-expect-error
      this.constructor.TABS.primary.tabs.push({ id: "attachments" });
    } else {
      // @ts-expect-error
      this.constructor.TABS.primary.tabs =
        // @ts-expect-error
        this.constructor.TABS.primary.tabs.filter((x) => x.id != "attachments");
      if (this.tabGroups.primary == "attachments")
        this.tabGroups.primary = "details";
    }
    const context = await super._prepareContext(options);
    context.types = this._setTypesDict();
    return context;
  }

  _setTypesDict() {
    const types = {};
    for (const type of Object.keys(THE_EDGE.cover_map)) {
      types[type] = {
        icon: `systems/the_edge/icons/armour/${type.toLowerCase()}.png`,
        selected: type == this.item.system.bodyPart,
      };
    }
    return types;
  }

  async onIconSelected(iconType, value) {
    switch (iconType) {
      case "bodyPart":
        this.item.system.bodyPart = value;
        this.updateIcons(iconType, this._setTypesDict());
        break;
    }
    await this.item.update(
      { system: structuredClone(this.item.system) },
      { render: false },
    );
  }

  _fetchAttachment(target: HTMLElement): Item | undefined {
    const dataElement = target.parentElement;
    if (!dataElement) return;

    const actorId = dataElement.dataset.actorId;
    const tokenId = dataElement.dataset.tokenId;
    const attachmentId = dataElement.dataset.attachmentId;
    if (!actorId || !tokenId || !attachmentId) return;
    const actor = Aux.getActor(actorId, tokenId);

    return actor.items.get(attachmentId);
  }

  static _editAttachment(this, _event, target) {
    const attachment = this._fetchAttachment(target);
    attachment.sheet.render(true);
  }

  static _detachAttachment(this, _event, target) {
    const attachment = this._fetchAttachment(target);
    attachment.update({ "system.equipped": false, "system.attachments": [] });
    this.item.system.detachShell(attachment);
    this.render();
  }
}

