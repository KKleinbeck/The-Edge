import CounterMixin from "../../mixins/counter-mixin.js";
import LocalisationServer from "../../system/localisation_server.js";
import RangeChartSelectorMixin from "../../mixins/range-chart-selector-mixin.js";
import THE_EDGE from "../../system/config-the-edge.js";
import { TheEdgeItemSheet } from "../item-sheet.js";
const { renderTemplate } = foundry.applications.handlebars;
export default class ItemSheetWeapon extends CounterMixin(RangeChartSelectorMixin(TheEdgeItemSheet)) {
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
            template: "systems/the_edge/templates/items/Weapon-effects.hbs"
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
            // @ts-expect-error
            this.constructor.TABS.primary.tabs = [
                { id: "details" }, { id: "effects" }, { id: "description" },
            ];
            this.tabGroups.primary = "details";
        }
        else {
            // @ts-expect-error
            this.constructor.TABS.primary.tabs = [
                { id: "effects" }, { id: "description" },
            ];
            this.tabGroups.primary = "description";
        }
        return super.render(options, _options);
    }
    getModifiers(_target) {
        return {
            modifiers: this.item.system.effect, context: { title: LocalisationServer.localise("Modifiers") }
        };
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
    async onIconSelected(iconType, value) {
        switch (iconType) {
            case "ammunitionType":
                this.item.system.ammunitionType = value;
                this.updateIcons(iconType, this._setAmmunitionTypesDict(), THE_EDGE.ammunitionSubtypes.includes(value) ? "" : value);
                await this.item.update({ "system.ammunitionType": value }, { render: false });
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
    async _onModeModify(event) {
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
        await this.item.update({ "system.fireModes": fireModes });
    }
    async onUpdateCounters(counters, context) {
        await this.redrawCounters(counters, context);
    }
    async redrawCounters(counters, context) {
        const template = "systems/the_edge/templates/items/meta-counters.hbs";
        const html = await renderTemplate(template, { counters: counters, ...context });
        const counterGroupElement = this.element.querySelector(".counter-group-hook");
        if (counterGroupElement === null)
            return;
        counterGroupElement.innerHTML = html;
        this.attachCounterEffectListeners(counterGroupElement);
    }
}
