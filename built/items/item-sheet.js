import THE_EDGE from "../system/config-the-edge.js";
import EffectModifierMixin from "../mixins/effect-modifier-mixin.js";
import IconSelectorMixin from "../mixins/icon-selector-mixin.js";
import LocalisationServer from "../system/localisation_server.js";
import TheEdgeApplicationMixin from "../mixins/the-edge-application.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { renderTemplate } = foundry.applications.handlebars;
export class TheEdgeItemSheet extends EffectModifierMixin(IconSelectorMixin(TheEdgeApplicationMixin(HandlebarsApplicationMixin(ItemSheetV2)))) {
    constructor(options) {
        super(options);
        this.headerWidth = 0;
        this.headerHeight = 0;
        this.definedEffects = structuredClone(THE_EDGE.definedEffects);
        const dynamicModifiers = THE_EDGE.dynamicModifiers(this.item.type);
        if (dynamicModifiers)
            this.definedEffects.dynamicModifiers = dynamicModifiers;
    }
    static DEFAULT_OPTIONS = {
        actions: {
            createModifier: TheEdgeItemSheet._createModifier,
            deleteModifier: TheEdgeItemSheet._deleteModifier,
        },
        classes: ["the-edge-item-sheet"],
        form: {
            submitOnChange: true,
        },
        position: {
            width: 390,
            height: 480,
        },
        theEdgeParameters: {
            minWidth: 390,
            minHeight: 480
        },
        window: {
            resizable: true
        }
    };
    static PARTS = {
        form: {
            template: "templates/sheets/item-sheet.html",
        },
        tabs: {
            template: "systems/the_edge/templates/applications/the-edge-tab-navigation.hbs"
        },
        description: {
            template: "systems/the_edge/templates/items/meta-description.hbs",
        },
    };
    static TABS = {
        primary: {
            tabs: [{ id: "description" }],
            labelPrefix: "TABS",
            initial: "description",
        },
    };
    get title() {
        return this.item.name;
    }
    async getCustomHeaderBar() {
        return `<input class="item-header-name" name="name" type="text"
      value="${this.item.name}" placeholder="Name" style="width: 100%;"/>`;
    }
    async getCustomFooterBar() {
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
            // @ts-expect-error
            this.headerWidth = Math.max(header.offsetWidth, this.headerWidth);
            // @ts-expect-error
            this.headerHeight = Math.max(header.offsetHeight, this.headerHeight);
            // header.outerHTML = await this._dynamicHeader(
            //   this.headerWidth,
            //   this.headerHeight,
            // );
        }
        const footers = this.element.getElementsByClassName("item-footer");
        if (footers.length) {
            const footer = footers[0];
            // footer.outerHTML = await this._dynamicFooter(
            //   this.headerWidth,
            //   this.headerHeight,
            // );
        }
        this._attachAdditionalFrameListeners();
    }
    _onRender(context, options) {
        super._onRender(context, options);
        this.element
            .querySelectorAll(".ui-keyword")
            .forEach((x) => x.addEventListener("mouseover", this._displayKeywordTooltip));
    }
    _displayKeywordTooltip(event) {
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement))
            return;
        const keyword = target.dataset.keyword;
        if (typeof keyword == "undefined")
            return;
        const text = LocalisationServer.parsedLocalisation(keyword, "keywords");
        game.tooltip.activate(event.currentTarget, { text, direction: "UP" });
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item = this.item;
        context.descriptionHTML =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.description, {
                secrets: this.document.isOwner,
                async: true,
            });
        context.gmDescriptionHTML =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.gmDescription, {
                secrets: this.document.isOwner,
                async: true,
            });
        context.userIsGM = game.user.isGM;
        context.definedEffects = this.definedEffects;
        return context;
    }
    getModifiers(_target) {
        return { modifiers: this.item.system.effect, context: {} };
    }
    async updateModifiers(modifiers, _context) {
        await this.item.update({ "system.effect": modifiers }, { render: false });
    }
}
