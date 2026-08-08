import Aux from "../../system/auxilliaries.js";
import RangeChartSelectorMixin from "../../mixins/range-chart-selector-mixin.js";
import LocalisationServer from "../../system/localisation_server.js";
import THE_EDGE from "../../system/config-the-edge.js";

import { TheEdgeItemSheet } from "../item-sheet.js";

export class ItemSheetAmmunition extends RangeChartSelectorMixin(TheEdgeItemSheet) {
  static PARTS = {...TheEdgeItemSheet.PARTS,
    form: {
      template: `systems/the_edge/templates/items/Ammunition-header.hbs`
    },
    details: {
      template: "systems/the_edge/templates/items/Ammunition-details.hbs"
    },
  }

  static TABS = {
    primary: {
      tabs: [
        {id: "details"}, {id: "description"},
      ],
      labelPrefix: "TABS",
      initial: "details",
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.designatedWeaponsHTML = context.item.system.designatedWeapons
    context.types = this._setTypesDict();
    context.subtypes = this._setSubtypesDict();
    context.subtypeIsArbitrary = !THE_EDGE.ammunitionSubtypes.includes(this.item.system.subtype);
    context.dynamicSubtype = context.subtypeIsArbitrary ? this.item.system.subtype : "";
    return context;
  }

  _setTypesDict() {
    const types = {};
    for (const type of ["energy", "kinetic"]) {
      types[type] = {
        icon: `systems/the_edge/icons/ammunition/${type}.png`,
        selected: type==this.item.system.type
      }
    }
    return types;
  }

  _setSubtypesDict() {
    const subtypes = {};
    for (const type of THE_EDGE.ammunitionSubtypes) {
      subtypes[type] = {
        icon: `systems/the_edge/icons/ammunition/${type}.png`,
        selected: type==this.item.system.subtype
      }
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
          iconType, this._setSubtypesDict(),
          THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value
        );
        break;
    }
    await this.item.update({[`system.${iconType}`]: value}, {render: false});
  }

  async _renderDetails() {
    const template = "systems/the_edge/templates/items/Ammunition-details-content.hbs";
    const html = await renderTemplate(
      template, await this._prepareContext()
    );

    const ammunitionDetailsHTML = this.element.querySelector(".ammunition-details");
    ammunitionDetailsHTML.innerHTML = html;
  }
}

export class ItemSheetArmour extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
      detachAttachment: ItemSheetArmour._detachAttachment,
      editAttachment: ItemSheetArmour._editAttachment,
    }
  }

  static PARTS = {...TheEdgeItemSheet.PARTS,
    form: {
      template: `systems/the_edge/templates/items/Armour-header.hbs`
    },
    effects: {
      template: "systems/the_edge/templates/items/meta-effects.hbs"
    }, 
    details: {
      template: "systems/the_edge/templates/items/Armour-details.hbs"
    },
    attachments: {
      template: "systems/the_edge/templates/items/meta-attachments.hbs"
    }
  }

  static TABS = {
    primary: {
      tabs: [
        {id: "effects"}, {id: "details"}, {id: "description"},
      ],
      labelPrefix: "TABS",
      initial: "details",
    },
  }

  async _prepareContext(options) {
    if (this.item.system.attachments.length && this.item.system.layer == "Inner") {
      this.constructor.TABS.primary.tabs.push({id: "attachments"})
    } else {
      this.constructor.TABS.primary.tabs =
        this.constructor.TABS.primary.tabs.filter(x => x.id != "attachments");
      if (this.tabGroups.primary == "attachments") this.tabGroups.primary = "details";
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
        selected: type==this.item.system.bodyPart
      }
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
    await this.item.update({"system": structuredClone(this.item.system)}, {render: false});
  }

  _fetchAttachment(target) {
    const dataElement = target.parentElement;

    const actorId = dataElement.dataset.actorId;
    const tokenId = dataElement.dataset.tokenId;
    const actor = Aux.getActor(actorId, tokenId)

    const attachmentId = dataElement.dataset.attachmentId;
    return actor.items.get(attachmentId);
  }

  static _editAttachment(_event, target) {
    const attachment = this._fetchAttachment(target);
    attachment.sheet.render(true);
  }

  static _detachAttachment(_event, target) {
    const attachment = this._fetchAttachment(target);
    attachment.update({"system.equipped": false, "system.attachments": []});
    Aux.detachFromParent(this.item, attachment._id, attachment.system.attachmentPoints.max);
    this.render()
  }
}

export class ItemSheetSkill extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
      addEffectLevel: ItemSheetSkill._addEffectLevel,
      deleteEffectLevel: ItemSheetSkill._deleteEffectLevel
    }
  }

  static PARTS = {...TheEdgeItemSheet.PARTS,
    form: {
      template: `systems/the_edge/templates/items/Skill-header.hbs`
    },
    details: {
      template: `systems/the_edge/templates/items/Skill-details.hbs`
    }
  }

  static TABS = {
    primary: {
      tabs: [
        {id: "details"}, {id: "description"},
      ],
      labelPrefix: "TABS",
      initial: "details",
    },
  }

  _footerContent() {
    let content = `
      <div style="width: 40%; white-space: nowrap">
        <input name="system.maxLevel" type="number" id="maxLevel" value="${this.item.system.maxLevel}"
          style="text-align: right; width: 35%;"/>
        <label for="maxLevel" style="display: inline-block;">${LocalisationServer.localise("Levels")}</label>
      </div>
      <div class="display: flex; gap: 3px; width: 50%; white-space: nowrap">
        <input type="text" id="cost" name="system.cost" value="${this.item.system.cost}" style="text-align: right; width: 80%"/>
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
    const skills = game.items.filter(x => x.type.toLowerCase().includes("skill"));
    for (const skill of skills) {
      context.coreRequirements.skills[skill.name] = skill.name;
    }
    return context;
  }

  getModifiers(target) {
    const data = target.closest(".effect-modifiers-hook").dataset;
    switch (data.type) {
      case "effects":
        return {
          modifiers: this.item.system.effects[data.index],
          context: data
        }
      case "requirements":
        return {
          modifiers: this.item.system.requirements[data.index],
          context: data
        }
    }
  }

  async updateModifiers(modifiers, context) {
    const target = this.item.system[context.type];
    target[context.index] = modifiers;
    await this.item.update(
      {[`system.${context.type}`]: target}, {render: false}
    );
  };

  _onRender(context, options) {
    super._onRender(context, options)
    // this.element.find(".effect-hint").click(ev => {
    //   this.options.displayHint = !this.options.displayHint;
    //   this._render()
    // });
    this.element.querySelectorAll(".max-level")?.forEach(
      x => x.addEventListener("change", ev => this._onMaxLevelChange(ev))
    )
    this.element.querySelectorAll(".effect-level-modify")?.forEach(
      x => x.addEventListener("change", ev => this._onLevelModify(ev))
    )
  }

  async _onMaxLevelChange(ev) {
    const maxLevel = ev.target.value;
    const eff = this.item.system.effects;
    const req = this.item.system.requirements;
    if (eff.length >= maxLevel) {
      await this.item.update({
        "system.maxLevel": maxLevel, "system.effects": eff.slice(0, maxLevel),
        "system.requirements": req.slice(0, maxLevel)
      })
    } else {
      for (let i = eff.length; i < maxLevel ; ++i) {
        eff.push([])
        req.push([])
      }
      await this.item.update({
        "system.maxLevel": maxLevel, "system.effects": eff,
        "system.requirements": req
      });
    }
  }
}

export class ItemSheetConsumables extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {...TheEdgeItemSheet.DEFAULT_OPTIONS,
    actions: {...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
      createGrenadeEffect: ItemSheetConsumables._createGrenadeEffect,
      deleteGrenadeEffect: ItemSheetConsumables._deleteGrenadeEffect,
    }
  }

  static PARTS = {...TheEdgeItemSheet.PARTS,
    form: {
      template: `systems/the_edge/templates/items/Consumables-header.hbs`
    },
    effects: {
      template: "systems/the_edge/templates/items/meta-effects.hbs"
    }, 
  }

  static TABS = {
    primary: {
      tabs: [
        {id: "effects"}, {id: "description"},
      ],
      labelPrefix: "TABS",
      initial: "description",
    },
  }

  _footerContent() {
    let content = super._footerContent();
    content += `
      <select class="selection-box type-selection-hook" name="system.current_type"
        style="padding-left: 1px; padding-right: 1px;">`;
    for (const typeName of Object.keys(this.item.system.subtypes)) {
      const selected = this.item.system.current_type == typeName ? "selected" : "";
      content += `
        <option value="${typeName}" ${selected}>
          ${LocalisationServer.localise(typeName, "Item")}
        </option>`
    }
    content += `</select>`;
    return content;
  }

  async render(options={}, _options={}) {
    // Disable effects for generic
    if (this.item.system.current_type != "generic") {
      this.constructor.TABS.primary.tabs = [{id: "effects"}, {id: "description"}];
    } else {
      this.constructor.TABS.primary.tabs =
        this.constructor.TABS.primary.tabs.filter(x => x.id != "effects");
      if (this.tabGroups.primary == "effects") this.tabGroups.primary = "details";
    }
    
    // Special Effects tab for Grenades
    if (this.item.system.current_type == "grenade") {
        this.constructor.PARTS.effects.template = "systems/the_edge/templates/items/Grenade-effects.hbs";
    } else {
        this.constructor.PARTS.effects.template = "systems/the_edge/templates/items/meta-effects.hbs";
    }

    // Remove non necessary headers
    switch (this.item.system.current_type) {
      case "drugs":
      case "generic":
        this.constructor.PARTS.form.template = "systems/the_edge/templates/items/meta-no-header.hbs";
        break;
      case "food":
      case "grenade":
      case "medicine":
        this.constructor.PARTS.form.template = "systems/the_edge/templates/items/Consumables-header.hbs";
        break;
    }
    super.render(options, _options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.grenadeEffects = this._grenadeEffects();
    context.helpers = {
      medicineEffects: THE_EDGE.medicine_effects,
      displayHint: this.options.displayHint,
      damageTypes: THE_EDGE.combat_damage_types
    };
    
    context.smallHeader = ["medicine", "food"].includes(this.item.system.current_type)
    return context;
  }

  getModifiers(target) {
    const effectData = target.closest(".effect-modifiers-hook")?.dataset;
    if (!(effectData?.type == "grenade-effect")) return super.getModifiers(target);

    const {category, distance} = effectData;
    const modifiers = this.item.system.subtypes.grenade.effects[category][distance];
    return {
      modifiers: modifiers,
      context: {
        ...effectData,
        title: LocalisationServer.localise(effectData.distance, "Combat")
      }
    };
  }

  async updateModifiers(modifiers, context) {
    if (!(context?.type == "grenade-effect")) return super.updateModifiers(modifiers, context);
    await this.item.update(
      {[`system.subtypes.grenade.effects.${context.category}.${context.distance}`]: modifiers},
      {render: false}
    );
  };

  _grenadeEffects() {
    const grenadeEffects = {
      smoke: {render: "solid", icon: "cloud"},
      emp: {render: "regular", icon: "bolt-lightning"},
      shellshock: {render: "solid", icon: "person-falling-burst"}
    };
    for (const effect of Object.keys(grenadeEffects)) {
      grenadeEffects[effect].selected = this.item.system.subtypes.grenade.effects[effect].active;
    }
    return grenadeEffects;
  }

  async onIconSelected(iconType, value) {
    switch (iconType) {
      case "grenadeEffect":
        const effects = structuredClone(this.item.system.subtypes.grenade.effects);
        const target = "system.subtypes.grenade.effects"
        effects[value].active = !effects[value].active;

        const update = {};
        update[target] = effects;
        await this.item.update(update, {render: false});
        this._drawGrenadeEffects();
        this.updateIcons(iconType, this._grenadeEffects());
    }
  }

  async _drawGrenadeEffects() {
    const template = "systems/the_edge/templates/items/Grenade-effects-content.hbs";
    const html = await renderTemplate(template, await this._prepareContext());

    const grenadeEffectsHTML = this.element.querySelector(".grenade-effects");
    grenadeEffectsHTML.innerHTML = html;
    this.attachEffectListeners();
  }
}

export class ItemSheetGear extends TheEdgeItemSheet {
  static DEFAULT_OPTIONS = {...TheEdgeItemSheet.DEFAULT_OPTIONS,
    position: { height: 170, },
  }

  static PARTS = {
    form: {
      template: `systems/the_edge/templates/items/meta-description.hbs`
    },
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.userIsGM = false; // Prevent GM notes on credits
    return context;
  }
}

export class ItemSheetLanguage extends ItemSheetGear { // Inherit Gear as a minimal interface
  _footerContent() {
    return `
      <div style="display: flex; gap: 5px; align-items: center; white-space: nowrap">
        <label for="hasLevels">
          ${LocalisationServer.localise("human spoken", "item")}
        </label>
        <input type="checkbox" id="hasLevels" name="system.humanSpoken"
          ${this.item.system.humanSpoken ? "checked" : ""} />
      </div>`;
  }
}

export class ItemSheetVantage extends ItemSheetGear { // Inherit Gear as a minimal interface
  _footerContent() {
    return `
      <div style="display: flex; gap: 5px; align-items: center; white-space: nowrap">
        <input class="item-footer-input" type="number" name="system.AP" value="${this.item.system.AP}" data-dtype="Number" id="AP"/>
        <label for="AP" data-tooltip aria-label="${LocalisationServer.localise('AdvantagePoints')}"
          style="margin-right: 5px;">
          AP
        </label>
        <input class="item-footer-input" type="number" name="system.level" value="${this.item.system.level}" data-dtype="Number"/>
        <input class="item-footer-input" type="number" name="system.maxLevel" value="${this.item.system.maxLevel}" data-dtype="Number"/>
        ${LocalisationServer.localise("Level")}
      </div>`;
  }
}