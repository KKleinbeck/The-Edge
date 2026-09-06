import THE_EDGE from "../system/config-the-edge.js";
import EffectModifierMixin from "../mixins/effect-modifier-mixin.js";
import IconSelectorMixin from "../mixins/icon-selector-mixin.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { renderTemplate } = foundry.applications.handlebars;
export class TheEdgeItemSheet extends EffectModifierMixin(
  IconSelectorMixin(HandlebarsApplicationMixin(ItemSheetV2)),
) {
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
      template: "templates/sheets/item-sheet.html",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
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
  async _dynamicHeader(width, height) {
    const lineLength = 0.3 * height;
    const path = `
      M0 ${height} V${lineLength} L${lineLength} 0
      H${0.382 * width - 0.5 * lineLength} L${0.382 * width + 0.5 * lineLength} ${lineLength}
      H${width} V${height}
    `;
    const template = "systems/the_edge/templates/items/layout-header.hbs";
    const html = await renderTemplate(template, {
      width: width,
      height: height,
      path: path,
      name: this.item.name,
      imgPath: this.item.img,
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
      width: width,
      pathHeight: lineLength,
      path: path,
      content: this._footerContent(),
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
    footer.outerHTML = await this._dynamicFooter(
      this.headerWidth,
      this.headerHeight,
    );
    return frame;
  }
  _attachFrameListeners() {
    super._attachFrameListeners();
    this._attachAdditionalFrameListeners();
  }
  _attachAdditionalFrameListeners() {}
  async minimize() {
    super.minimize();
    const headers = this.element.getElementsByClassName(
      "item-header-frame-tag",
    );
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
    const headers = this.element.getElementsByClassName(
      "item-header-frame-tag",
    );
    if (headers.length) {
      const header = headers[0];
      // @ts-expect-error
      this.headerWidth = Math.max(header.offsetWidth, this.headerWidth);
      // @ts-expect-error
      this.headerHeight = Math.max(header.offsetHeight, this.headerHeight);
      header.outerHTML = await this._dynamicHeader(
        this.headerWidth,
        this.headerHeight,
      );
    }
    const footers = this.element.getElementsByClassName("item-footer");
    if (footers.length) {
      const footer = footers[0];
      footer.outerHTML = await this._dynamicFooter(
        this.headerWidth,
        this.headerHeight,
      );
    }
    this._attachAdditionalFrameListeners();
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.descriptionHTML =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        context.item.system.description,
        {
          secrets: this.document.isOwner,
          async: true,
        },
      );
    context.gmDescriptionHTML =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        context.item.system.gmDescription,
        {
          secrets: this.document.isOwner,
          async: true,
        },
      );
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
