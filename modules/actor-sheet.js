import { EntitySheetHelper } from "./helper.js";
import {ATTRIBUTE_TYPES} from "./constants.js";
import DialogProficiency from "./dialogs/dialog-proficiency.js";
import DialogAttribute from "./dialogs/dialog-attribute.js";

export class SimpleActorSheet extends ActorSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    // console.log(super.defaultOptions)
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["the_edge", "sheet", "actor"],
      template: "systems/the_edge/templates/actors/actor-sheet.html",
      width: 700,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes"}],
      scrollY: [".attributes", ".proficiencies", ".combat", ".items", ".biography"],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  async render(force, options) {
    if (options && 'width' in options) {
      options.width = options.width < 600 ? 600 : options.width;
    }
    super.render(force, options)
  }

  async getData(options) {
    const context = await super.getData(options);
    EntitySheetHelper.getAttributeData(context.data);
    context.shorthand = !!game.settings.get("the_edge", "macroShorthand");
    context.systemData = context.data.system;
    context.dtypes = ATTRIBUTE_TYPES;
    context.biographyHTML = await TextEditor.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context["prepare"] = this.actor.prepareSheet()
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Attribute Management
    // html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
    // html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
    // html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

    // Item Controls
    html.find(".item-control").click(this._onItemControl.bind(this));
    html.find(".items .rollable").on("click", this._onItemRoll.bind(this));

    // Add draggable for Macro creation
    html.find(".attributes a.attribute-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });

    // Hero Tokens
    html.find(".hero-token").mousedown(ev => this._useHeroToken(ev));
    html.find(".hero-token-spent").mousedown(ev => this._regenerateHeroToken(ev));

    // Attributes
    html.find(".attr-d20").mousedown(ev => this._rollAttr(ev));
    html.find(".advance-attr").click(ev => this._advanceSrv(ev, "attr"));

    // Proficiencies
    html.find(".attr-d20-proficiency").click(ev => this._rollProficiency(ev))
    html.find(".advance-prof").click(ev => this._advanceSrv(ev, "prof"));
  }

  async _useHeroToken(ev) {
    let name = super.getData().data.name;
    // ChatServer.transmit("herotoken", {"_USER_": name})
    this.actor.system.heroToken.available -= 1;
    this._render();
  }

  async _regenerateHeroToken(ev){
    let name = super.getData().data.name;
    // ChatServer.transmit("herotokenspent", {"_USER_": name})
    this.actor.system.heroToken.available += 1;
    this._render();
  }

  async _advanceSrv(ev, quantity) {
    const target = ev.currentTarget;
    let name = target.getAttribute("data-name");
    let type = target.getAttribute("advance-type");
    switch (quantity){
      case "attr":
        this.actor._advanceAttr(name, type);
        break;

      case "prof":
        this.actor._advanceProf(name, type);
        break;
    }
    this._render();
  }

  async _rollAttr(ev) {
    const target = ev.currentTarget; // HTMLElement
    const attribute = target.getAttribute("attr-name");
    const threshold = this.actor.system.attributes[attribute]["value"];
    let d = DialogAttribute.start({
      attribute: attribute,
      threshold: threshold,
    })
  }

  async _rollProficiency(ev) {
    const target = ev.currentTarget; // HTMLElement
    const proficiency = target.className.split("ProfID-")[1];
    // await DiceServer.attributeCheck(threshold, attr);
    let modificator = 0;
    let dices = [];
    for (const [_, proficiencies] of Object.entries(this.actor.system.proficiencies)) {
      if (proficiency in proficiencies) {
        modificator = proficiencies[proficiency]["advances"] + proficiencies[proficiency]["modifier"];
        dices = proficiencies[proficiency].dices;
        break;
      }
    }
    const thresholds = []
    for (const dice of dices) {
      thresholds.push(this.actor.system.attributes[dice]["value"])
    }
    let d = DialogProficiency.start({
      name: proficiency,
      dices: dices,
      thresholds: thresholds,
      modificator: modificator
    })
  }

  _onItemControl(event) {
    event.preventDefault();

    // Obtain event data
    const button = event.currentTarget;
    const li = button.closest(".item");
    const item = this.actor.items.get(li?.dataset.itemId);

    // Handle different actions
    switch ( button.dataset.action ) {
      case "create":
        const cls = getDocumentClass("Item");
        return cls.create({name: game.i18n.localize("SIMPLE.ItemNew"), type: "item"}, {parent: this.actor});
      case "edit":
        return item.sheet.render(true);
      case "delete":
        return item.delete();
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for roll buttons on items.
   * @param {MouseEvent} event    The originating left click event
   */
  _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    let r = new Roll(button.data('roll'), this.actor.getRollData());
    return r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    return formData;
  }
}
