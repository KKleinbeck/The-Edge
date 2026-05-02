import THE_EDGE from "../system/config-the-edge.js";
import EffectModifierMixin from "../mixins/effect-modifier-mixin.js";
import IconSelectorMixin from "../mixins/icon-selector-mixin.js";
import RangeChartSelectorMixin from "../mixins/range-chart-selector-mixin.js";
import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { renderTemplate } = foundry.applications.handlebars;
export class TheEdgeItemSheet extends EffectModifierMixin(IconSelectorMixin(HandlebarsApplicationMixin(ItemSheetV2))) {
    constructor(options) {
        super(options);
        this.headerWidth = 0;
        this.headerHeight = 0;
    }
    static DEFAULT_OPTIONS = {
        position: {
            width: 390,
            height: 480,
        },
        form: {
            submitOnChange: true,
        },
        classes: ["the_edge", "item-sheet"],
        actions: {
            createModifier: TheEdgeItemSheet._createModifier,
            deleteModifier: TheEdgeItemSheet._deleteModifier,
        },
    };
    static PARTS = {
        form: {
            template: "templates/sheets/item-sheet.html"
        },
        tabs: {
            template: "templates/generic/tab-navigation.hbs"
        },
        description: {
            template: "systems/the_edge/templates/items/meta-description.hbs"
        }
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "description",
        }
    };
    static setupSheets() {
        foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
        foundry.documents.collections.Items.registerSheet("the_edge", TheEdgeItemSheet, { makeDefault: true });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetAmmunition, { makeDefault: true, types: ["Ammunition"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetArmour, { makeDefault: true, types: ["Armour"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetConsumables, { makeDefault: true, types: ["Consumables"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetGear, { makeDefault: true, types: ["Gear"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetLanguage, { makeDefault: true, types: ["Languageskill"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetSkill, { makeDefault: true, types: ["Skill", "Combatskill", "Medicalskill"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetVantage, { makeDefault: true, types: ["Advantage", "Disadvantage"] });
        foundry.documents.collections.Items.registerSheet("the_edge", ItemSheetWeapon, { makeDefault: true, types: ["Weapon"] });
        foundry.documents.collections.Items.unregisterSheet("the_edge", TheEdgeItemSheet, {
            types: [
                "Advantage", "Ammunition", "Armour", "Combatskill", "Consumables",
                "Disadvantage", "Gear", "Languageskill", "Medicalskill", "Skill", "Weapon"
            ]
        });
    }
    get title() { return this.item.name; }
    async _dynamicHeader(width, height) {
        const lineLength = 0.3 * height;
        const path = `
      M0 ${height} V${lineLength} L${lineLength} 0
      H${0.382 * width - 0.5 * lineLength} L${0.382 * width + 0.5 * lineLength} ${lineLength}
      H${width} V${height}
    `;
        const template = "systems/the_edge/templates/items/layout-header.hbs";
        const html = await renderTemplate(template, {
            width: width, height: height, path: path,
            name: this.item.name, imgPath: this.item.img
        });
        return html;
    }
    async _dynamicFooter(width, height) {
        const lineLength = 0.5 * height;
        const path = `
      M0 0 H${0.32 * width - 0.5 * lineLength} L${0.32 * width + 0.5 * lineLength} ${lineLength}
      H${width - lineLength} L${width} 0
    `;
        const template = "systems/the_edge/templates/items/layout-footer.hbs";
        const html = await renderTemplate(template, {
            width: width, pathHeight: lineLength, path: path,
            content: this._footerContent()
        });
        return html;
    }
    _footerContent() {
        let content = "";
        if (this.item.system.weight !== undefined) {
            content += `
        <div class="item-footer-content-entry">
          <input class="item-footer-input" type="number" name="system.weight" value="${this.item.system.weight}" data-dtype="Number"/>
          kg
        </div>
      `;
        }
        if (this.item.system.value !== undefined) {
            content += `
        <div class="item-footer-content-entry" style="margin-right: 10px;">
          <input class="item-footer-input" type="number" name="system.value" value="${this.item.system.value}" data-dtype="Number"/>
          <img src="systems/the_edge/icons/credits_white.png" style="height: 16px;"/>
        </div>
      `;
        }
        return content;
    }
    async _renderFrame(options) {
        const frame = await super._renderFrame(options);
        // Add image to header and modify to custom class
        const headers = frame.getElementsByClassName("window-header");
        if (headers.length) {
            headers[0].classList.add("item-header");
        }
        // Make title dynamic
        const titles = frame.getElementsByClassName("window-title");
        if (titles.length) {
            titles[0].outerHTML = await this._dynamicHeader(0, 0);
        }
        // Make footer
        const footer = document.createElement("div");
        footer.classList.add("item-footer");
        frame.appendChild(footer);
        footer.outerHTML = await this._dynamicFooter(this.headerWidth, this.headerHeight);
        return frame;
    }
    _attachFrameListeners() {
        super._attachFrameListeners();
        this._attachAdditionalFrameListeners();
    }
    _attachAdditionalFrameListeners() { }
    async minimize() {
        super.minimize();
        const headers = this.element.getElementsByClassName("item-header-frame-tag");
        if (headers.length) {
            headers[0].outerHTML = `
        <div class="item-header-frame-tag" style="display: flex; gap: 10px; width: 100%; align-items: center;">
          <img class="item-header-img-minimised" src="${this.item.img}"/>
          ${this.item.name}
        </div>
      `;
        }
        const footers = this.element.getElementsByClassName("item-footer");
        if (footers.length) {
            footers[0].innerHTML = "";
        }
    }
    async maximize() {
        super.maximize();
        const headers = this.element.getElementsByClassName("item-header-frame-tag");
        if (headers.length) {
            const header = headers[0];
            this.headerWidth = Math.max(header.offsetWidth, this.headerWidth);
            this.headerHeight = Math.max(header.offsetHeight, this.headerHeight);
            header.outerHTML = await this._dynamicHeader(this.headerWidth, this.headerHeight);
        }
        const footers = this.element.getElementsByClassName("item-footer");
        if (footers.length) {
            const footer = footers[0];
            footer.outerHTML = await this._dynamicFooter(this.headerWidth, this.headerHeight);
        }
        this._attachAdditionalFrameListeners();
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item = this.item;
        context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
        context.gmDescriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.gmDescription, {
            secrets: this.document.isOwner,
            async: true
        });
        context.userIsGM = game.user.isGM;
        context.definedEffects = structuredClone(THE_EDGE.effectMap);
        for (const group of ["attributes", "proficiencies", "weapons"]) {
            context.definedEffects[group].crit = undefined;
            context.definedEffects[group].critFail = undefined;
        }
        return context;
    }
    getModifiers(_target) {
        return { modifiers: this.item.system.effect, context: {} };
    }
    async updateModifiers(modifiers, _context) {
        await this.item.update({ "system.effect": modifiers }, { render: false });
    }
    ;
}
class ItemSheetAmmunition extends RangeChartSelectorMixin(TheEdgeItemSheet) {
    static PARTS = { ...TheEdgeItemSheet.PARTS,
        form: {
            template: `systems/the_edge/templates/items/Ammunition-header.hbs`
        },
        details: {
            template: "systems/the_edge/templates/items/Ammunition-details.hbs"
        },
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "details" }, { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "details",
        }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.designatedWeaponsHTML = context.item.system.designatedWeapons;
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
                selected: type == this.item.system.type
            };
        }
        return types;
    }
    _setSubtypesDict() {
        const subtypes = {};
        for (const type of THE_EDGE.ammunitionSubtypes) {
            subtypes[type] = {
                icon: `systems/the_edge/icons/ammunition/${type}.png`,
                selected: type == this.item.system.subtype
            };
        }
        return subtypes;
    }
    onIconSelected(iconType, value) {
        switch (iconType) {
            case "type":
                this.item.system.type = value;
                this.updateIcons(iconType, this._setTypesDict());
                this._renderDetails();
                break;
            case "subtype":
                this.item.system.subtype = value;
                this.updateIcons(iconType, this._setSubtypesDict(), THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value);
                break;
        }
        this.item.update({ [`system.${iconType}`]: value }, { render: false });
    }
    async _renderDetails() {
        const template = "systems/the_edge/templates/items/Ammunition-details-content.hbs";
        const html = await renderTemplate(template, await this._prepareContext());
        const ammunitionDetailsHTML = this.element.querySelector(".ammunition-details");
        ammunitionDetailsHTML.innerHTML = html;
    }
}
class ItemSheetArmour extends TheEdgeItemSheet {
    static DEFAULT_OPTIONS = { ...TheEdgeItemSheet.DEFAULT_OPTIONS,
        actions: {
            ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
            detachAttachment: ItemSheetArmour._detachAttachment,
            editAttachment: ItemSheetArmour._editAttachment,
        }
    };
    static PARTS = { ...TheEdgeItemSheet.PARTS,
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
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "effects" }, { id: "details" }, { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "details",
        },
    };
    async _prepareContext(options) {
        if (this.item.system.attachments.length) {
            this.constructor.TABS.primary.tabs.push({ id: "attachments" });
        }
        else {
            this.constructor.TABS.primary.tabs =
                this.constructor.TABS.primary.tabs.filter(x => x.id != "attachments");
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
                selected: type == this.item.system.bodyPart
            };
        }
        return types;
    }
    onIconSelected(iconType, value) {
        switch (iconType) {
            case "bodyPart":
                this.item.system.bodyPart = value;
                this.updateIcons(iconType, this._setTypesDict());
                break;
        }
        this.item.update({ "system": structuredClone(this.item.system) }, { render: false });
    }
    _fetchAttachment(target) {
        const dataElement = target.parentElement;
        const actorId = dataElement.dataset.actorId;
        const tokenId = dataElement.dataset.tokenId;
        const actor = Aux.getActor(actorId, tokenId);
        const attachmentId = dataElement.dataset.attachmentId;
        return actor.items.get(attachmentId);
    }
    static _editAttachment(_event, target) {
        const attachment = this._fetchAttachment(target);
        attachment.sheet.render(true);
    }
    static _detachAttachment(_event, target) {
        const attachment = this._fetchAttachment(target);
        attachment.update({ "system.equipped": false, "system.attachments": [] });
        Aux.detachFromParent(this.item, attachment._id, attachment.system.attachmentPoints.max);
        this.render();
    }
}
class ItemSheetSkill extends TheEdgeItemSheet {
    static DEFAULT_OPTIONS = { ...TheEdgeItemSheet.DEFAULT_OPTIONS,
        actions: {
            ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
            addEffectLevel: ItemSheetSkill._addEffectLevel,
            deleteEffectLevel: ItemSheetSkill._deleteEffectLevel
        }
    };
    static PARTS = { ...TheEdgeItemSheet.PARTS,
        form: {
            template: `systems/the_edge/templates/items/Skill-header.hbs`
        },
        details: {
            template: `systems/the_edge/templates/items/Skill-details.hbs`
        }
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "details" }, { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "details",
        },
    };
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
                };
            case "requirements":
                return {
                    modifiers: this.item.system.requirements[data.index],
                    context: data
                };
        }
    }
    async updateModifiers(modifiers, context) {
        const target = this.item.system[context.type];
        target[context.index] = modifiers;
        await this.item.update({ [`system.${context.type}`]: target }, { render: false });
    }
    ;
    _onRender(context, options) {
        super._onRender(context, options);
        // this.element.find(".effect-hint").click(ev => {
        //   this.options.displayHint = !this.options.displayHint;
        //   this._render()
        // });
        this.element.querySelectorAll(".max-level")?.forEach(x => x.addEventListener("change", ev => this._onMaxLevelChange(ev)));
        this.element.querySelectorAll(".effect-level-modify")?.forEach(x => x.addEventListener("change", ev => this._onLevelModify(ev)));
    }
    _onMaxLevelChange(ev) {
        const maxLevel = ev.target.value;
        const eff = this.item.system.effects;
        const req = this.item.system.requirements;
        if (eff.length >= maxLevel) {
            this.item.update({
                "system.maxLevel": maxLevel, "system.effects": eff.slice(0, maxLevel),
                "system.requirements": req.slice(0, maxLevel)
            });
        }
        else {
            for (let i = eff.length; i < maxLevel; ++i) {
                eff.push([]);
                req.push([]);
            }
            this.item.update({
                "system.maxLevel": maxLevel, "system.effects": eff,
                "system.requirements": req
            });
        }
    }
}
class ItemSheetConsumables extends TheEdgeItemSheet {
    static DEFAULT_OPTIONS = { ...TheEdgeItemSheet.DEFAULT_OPTIONS,
        actions: { ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
            createGrenadeEffect: ItemSheetConsumables._createGrenadeEffect,
            deleteGrenadeEffect: ItemSheetConsumables._deleteGrenadeEffect,
        }
    };
    static PARTS = { ...TheEdgeItemSheet.PARTS,
        form: {
            template: `systems/the_edge/templates/items/Consumables-header.hbs`
        },
        effects: {
            template: "systems/the_edge/templates/items/meta-effects.hbs"
        },
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "effects" }, { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "description",
        },
    };
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
        </option>`;
        }
        content += `</select>`;
        return content;
    }
    async render(options = {}, _options = {}) {
        // Disable effects for generic
        if (this.item.system.current_type != "generic") {
            this.constructor.TABS.primary.tabs = [{ id: "effects" }, { id: "description" }];
        }
        else {
            this.constructor.TABS.primary.tabs =
                this.constructor.TABS.primary.tabs.filter(x => x.id != "effects");
            if (this.tabGroups.primary == "effects")
                this.tabGroups.primary = "details";
        }
        // Special Effects tab for Grenades
        if (this.item.system.current_type == "grenade") {
            this.constructor.PARTS.effects.template = "systems/the_edge/templates/items/Grenade-effects.hbs";
        }
        else {
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
        context.smallHeader = ["medicine", "food"].includes(this.item.system.current_type);
        return context;
    }
    getModifiers(target) {
        const effectData = target.closest(".effect-modifiers-hook")?.dataset;
        if (!(effectData?.type == "grenade-effect"))
            return super.getModifiers(target);
        const { category, distance } = effectData;
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
        if (!(context?.type == "grenade-effect"))
            return super.updateModifiers(modifiers, context);
        await this.item.update({ [`system.subtypes.grenade.effects.${context.category}.${context.distance}`]: modifiers }, { render: false });
    }
    ;
    _grenadeEffects() {
        const grenadeEffects = {
            smoke: { render: "solid", icon: "cloud" },
            emp: { render: "regular", icon: "bolt-lightning" },
            shellshock: { render: "solid", icon: "person-falling-burst" }
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
        const template = "systems/the_edge/templates/items/Grenade-effects-content.hbs";
        const html = await renderTemplate(template, await this._prepareContext());
        const grenadeEffectsHTML = this.element.querySelector(".grenade-effects");
        grenadeEffectsHTML.innerHTML = html;
        this.attachEffectListeners();
    }
}
class ItemSheetGear extends TheEdgeItemSheet {
    static DEFAULT_OPTIONS = { ...TheEdgeItemSheet.DEFAULT_OPTIONS,
        position: { height: 170, },
    };
    static PARTS = {
        form: {
            template: `systems/the_edge/templates/items/meta-description.hbs`
        },
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.userIsGM = false; // Prevent GM notes on credits
        return context;
    }
}
class ItemSheetLanguage extends ItemSheetGear {
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
class ItemSheetVantage extends ItemSheetGear {
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
class ItemSheetWeapon extends RangeChartSelectorMixin(TheEdgeItemSheet) {
    static DEFAULT_OPTIONS = { ...TheEdgeItemSheet.DEFAULT_OPTIONS,
        actions: {
            ...TheEdgeItemSheet.DEFAULT_OPTIONS.actions,
            addFiringMode: ItemSheetWeapon._addFiringMode,
            deleteFiringMode: ItemSheetWeapon._deleteFiringMode,
        }
    };
    static PARTS = { ...TheEdgeItemSheet.PARTS,
        form: {
            template: `systems/the_edge/templates/items/Weapon-header.hbs`
        },
        effects: {
            template: "systems/the_edge/templates/items/meta-effects.hbs"
        },
        details: {
            template: "systems/the_edge/templates/items/Weapon-details.hbs"
        },
    };
    static TABS = {
        primary: {
            tabs: [
                { id: "details" }, { id: "effects" }, { id: "description" },
            ],
            labelPrefix: "TABS",
            initial: "details",
        }
    };
    async render(options = {}, _options = {}) {
        // Disable details for hand-to-hand combat
        if (this.item.system.type != "Hand-to-Hand combat") {
            this.constructor.TABS.primary.tabs = [
                { id: "details" }, { id: "effects" }, { id: "description" },
            ];
            this.tabGroups.primary = "details";
        }
        else {
            this.constructor.TABS.primary.tabs = [
                { id: "effects" }, { id: "description" },
            ];
            this.tabGroups.primary = "description";
        }
        super.render(options, _options);
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.helpers = {
            attributes: THE_EDGE.characterSchema.attributes,
            weapon_types: Object.keys(THE_EDGE.coreValueMap.weapons).filter(x => !x.includes("General"))
        };
        context.ammunitionTypes = this._setAmmunitionTypesDict();
        context.ammunitionTypeIsArbitrary = !THE_EDGE.ammunitionSubtypes.includes(this.item.system.ammunitionType);
        context.dynamicSubtype = context.ammunitionTypeIsArbitrary ?
            this.item.system.ammunitionType : "";
        return context;
    }
    _onRender(context, options) {
        super._onRender(context, options);
        this.element.querySelectorAll(".firing-mode-modify").forEach(x => x.addEventListener("change", ev => this._onModeModify(ev)));
    }
    _setAmmunitionTypesDict() {
        const ammunitionTypes = {};
        for (const type of THE_EDGE.ammunitionSubtypes) {
            ammunitionTypes[type] = {
                icon: `systems/the_edge/icons/ammunition/${type}.png`,
                selected: type == this.item.system.ammunitionType
            };
        }
        return ammunitionTypes;
    }
    onIconSelected(iconType, value) {
        switch (iconType) {
            case "ammunitionType":
                this.item.system.ammunitionType = value;
                this.updateIcons(iconType, this._setAmmunitionTypesDict(), THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value);
                this.item.update({ "system.ammunitionType": value }, { render: false });
                break;
        }
    }
    static _addFiringMode(_event, _target) {
        const fireModes = this.item.system.fireModes;
        fireModes.push({ name: "", damage: "1d20", dices: 1, cost: 1, precisionPenalty: [0, 0] });
        this.item.update({ "system.fireModes": fireModes });
    }
    static _deleteFiringMode(_event, target) {
        const index = target.dataset.index;
        const fireModes = this.item.system.fireModes;
        fireModes.splice(index, 1);
        this.item.update({ "system.fireModes": fireModes });
    }
    _onModeModify(event) {
        const target = event.target;
        const index = +target.dataset.index;
        const field = target.dataset.field;
        const fireModes = this.item.system.fireModes;
        if (field.includes("precisionPenalty")) {
            const penaltyIndex = +field.slice(-1);
            fireModes[+index].precisionPenalty[penaltyIndex] = +target.value;
        }
        else if (field === "name" || field === "damage") {
            fireModes[+index][field] = target.value;
        }
        else {
            fireModes[+index][field] = +target.value;
        }
        this.item.update({ "system.fireModes": fireModes });
    }
}
