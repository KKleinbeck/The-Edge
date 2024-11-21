import THE_EDGE from "../system/config-the-edge.js";
import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import DialogReload from "../dialogs/dialog-reload.js";
import DialogWeapon from "../dialogs/dialog-weapon.js";
import LocalisationServer from "../system/localisation_server.js";

export class TheEdgeActorSheet extends ActorSheet {

  /** @inheritdoc */
  static get defaultOptions() {
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
    context.shorthand = !!game.settings.get("the_edge", "macroShorthand");
    context.systemData = context.data.system;
    context.biographyHTML = await TextEditor.enrichHTML(context.systemData.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context["prepare"] = this.actor.prepareSheet()

    let credits = this.actor.itemTypes["Credits"]
    let creditsOffline = credits.find(c => c.system?.isSchid)?.system?.value || 0;
    let creditsDigital = credits.find(c => !c.system?.isSchid)?.system?.value || 0;
    let weight =  this.actor._determineWeight();
    context.helpers = {
      types: ["Weapon", "Armour", "Ammunition"],
      languages: THE_EDGE.languages,
      credits: {"Schids": creditsOffline, "digital": creditsDigital},
      weight: weight
    }
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    // Item Controls
    html.find(".item-control").click(ev => this._onItemControl(ev));
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
    html.find(".hero-token").click(ev => this._useHeroToken(ev));
    html.find(".hero-token-spent").click(ev => this._regenerateHeroToken(ev));

    // Language skills
    html.find(".skill-control").click(ev => this._onSkillControl(ev))

    // Attributes
    html.find(".attr-d20").click(ev => this._rollAttr(ev));
    html.find(".advance-attr").click(ev => this._advanceSrv(ev, "attr"));

    // Proficiencies
    html.find(".prof-d20").click(ev => this._rollProficiency(ev))
    html.find(".advance-prof").click(ev => this._advanceSrv(ev, "prof"));

    // Weapon Proficiencies
    html.find(".weapon-d20").click(ev => this._rollAttack(ev))
    html.find(".reload").click(ev => this._reload(ev))
    html.find(".advance-combat").click(ev => this._advanceSrv(ev, "combat"));
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

      case "combat":
        this.actor._advanceWeaponProf(name, type);
        break
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
    const proficiency = target.getAttribute("prof-name");
    // await DiceServer.attributeCheck(threshold, attr);
    let modificator = 0;
    let dices = [];
    for (const [_, proficiencies] of Object.entries(this.actor.system.proficiencies)) {
      if (proficiency in proficiencies) {
        modificator = proficiencies[proficiency]["advances"] +
          proficiencies[proficiency]["modifier"] + proficiencies[proficiency]["status"];
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

  async _rollAttack(ev) {
    const target = ev.currentTarget; // HTMLElement
    const weaponID = target.closest(".weapon-id").dataset.weaponId

    let actor = this.actor
    let sceneID = game.user.viewedScene
    let targetIDs = []
    for (const target of game.user.targets) {
      targetIDs.push(target.id.toUpperCase())
    }

    const weapon = this.actor.items.get(weaponID)
    if (weapon.system.ammunitionID === "") {
      let msg = LocalisationServer.localise("Ammu missing", "Notifications")
      ui.notifications.notify(msg)
      return undefined;
    }

    let damageType = ""
    if (weapon.system.isElemental) {
      damageType = "Elemental"
    } else if (THE_EDGE.effect_map.weapons.energy.includes(weapon.system.type)) {
      damageType = "energy"
    } else damageType = "kinetic";
    
    const threshold = this.actor._getWeaponPL(weaponID)
    let d = DialogWeapon.start({
      name: weapon.name,
      ammunition: this.actor.items.get(weapon.system.ammunitionID),
      threshold: threshold,
      damageType: damageType,
      rangeChart: weapon.system.rangeChart,
      fireModes: weapon.system.fireModes,
      actor: actor,
      sceneID: sceneID,
      targetIDs: targetIDs
    })
  }

  async _reload(ev) {
    const target = ev.currentTarget; // HTMLElement
    const weaponID = target.closest(".weapon-id").dataset.weaponId
    const ammunition = []
    let weapon = this.actor.items.get(weaponID);
    for (const ammu of this.actor.itemTypes["Ammunition"]) {
      let sys = ammu.system
      let designatedWeapons = sys.designatedWeapons
        .replace(/<[^>]*>?/gm, '') // Strip html tags
        .split(",")
        .map(x => x.trim())
      if (designatedWeapons.includes(weapon.name)) {
        ammunition.push(ammu);
      } else if (sys.whitelist[sys.type][weapon.system.type]) ammunition.push(ammu);
    }

    await DialogReload.start({
      weaponID: weaponID,
      actor: this.actor,
      weapon: weapon,
      ammunition: ammunition
    })
  }

  async _onDropItem(event, data) {
    const item = (await Item.implementation.fromDropData(data)).toObject();
    switch (item.type) {
      case "Weapon":
      case "Armour":
        return super._onDropItem(event, data)

      case "Ammunition":
        return this._onDropStackableItem(event, data, item)
      
      case "Advantage":
        let actorAP = this.actor.system.AdvantagePoints

        if (item.system.AP + actorAP.used > actorAP.max) {
          let msg = LocalisationServer.parsedLocalisation(
            "AP missing", "Notifications",
            {name: item.name, need: item.system.AP, available: actorAP.max - actorAP.used}
          )
          ui.notifications.notify(msg)
          return false;
        } // Now implicitly go into the disadvantage return
      case "Disadvantage":
        return await this._createVantage(event, data, item)
      
      case "Combatskill":
      case "Languageskill":
        let createNew = this.actor.learnSkill(item);
        return createNew ? super._onDropItem(event, data) : undefined;
      
      case "Credits":
        if (item.system.isChid) {
          this.actor.update({"system.credits.chids": this.actor.system.credits.chids + item.system.value})
        } else this.actor.update({"system.credits.digital": this.actor.system.credits.digital + item.system.value})
        return false;

      case "Effect":
        return super._onDropItem(event, data)
    }
    // return this.actor.createEmbeddedDocuments("Item", itemData);
  }

  _itemExists(item) {
    let _existingCopy = false
    for (const _item of this.actor.items) {
      if (_item.name == item.name) {
        if (_item.type == "Ammunition") {
          let _cap = _item.system.capacity
          let cap = item.system.capacity
          if (_cap.max == cap.max && _cap.used == cap.used) {
            _existingCopy = _item
          }
        } else {
          _existingCopy = _item
        }
      }
    }
    return _existingCopy
  }

  async _createVantage(event, data, item) {
    let update = item.type == "Advantage" ?
      {"system.AdvantagePoints.used": this.actor.system.AdvantagePoints.used + item.system.AP} :
      {"system.AdvantagePoints.max": this.actor.system.AdvantagePoints.max + item.system.AP}

    let _existingCopy = this._itemExists(item)
    if (_existingCopy) {
      const sys = _existingCopy.system
      if (sys.hasLevels && sys.maxLevel > sys.level) {
        await this.actor.update(update)
        await _existingCopy.update({"system.level": sys.level + 1})
      }
      return false
    }

    await this.actor.update(update)
    return super._onDropItem(event, data)
  }

  _onDropStackableItem(event, data, item) {
    let _existingCopy = this._itemExists(item) 
    if (_existingCopy) {
      _existingCopy.system.quantity += 1
      this._render()
      return _existingCopy;
    }
    return super._onDropItem(event, data)
  }

  _onItemControl(event) {
    event.preventDefault();

    // Obtain event data
    const button = event.currentTarget;
    const itemElment = button.closest(".item");
    const item = this.actor.items.get(itemElment?.dataset.itemId);

    // Handle different actions
    switch ( button.dataset.action ) {
      case "create":
        const cls = getDocumentClass("Item");
        return cls.create({name: LocalisationServer.localise("New", "item"), type: "Weapon"}, {parent: this.actor});
      case "create-effect":
        const clsEffect = getDocumentClass("Item");
        return clsEffect.create({name: LocalisationServer.localise("New effect", "item"), type: "Effect"}, {parent: this.actor});
      case "edit":
        return item.sheet.render(true);
      case "delete":
        if (item.type == "Disadvantage") {
          let actorAP = this.actor.system.AdvantagePoints
          let itemAP = (item.system.hasLevels ? item.system.level : 1) * item.system.AP
          if ((actorAP.max - itemAP < actorAP.used)) {
            let msg = LocalisationServer.parsedLocalisation(
              "AP missing", "Notifications",
              {name: item.name, need: itemAP, available: actorAP.max - actorAP.used}
            )
            ui.notifications.notify(msg)
            return undefined;
          }

          if (item.system.hasLevels) {
            this.actor.update({"system.AdvantagePoints.max": actorAP.max - itemAP})
          }
        }
        if (item.type == "Advantage") {
          let itemAP = (item.system.hasLevels ? item.system.level : 1) * item.system.AP
          this.actor.update({"system.AdvantagePoints.used": this.actor.system.AdvantagePoints.used - itemAP})
        }
        item.delete();
        this._render();
        break
      case "toggle-equip":
        item.toggleEquipped()
        this._render();
        break;
    }
  }

  _onSkillControl(event) {
    event.preventDefault();

    // Obtain event data
    const button = event.currentTarget;
    const skillElement = button.closest(".skill");
    console.log(skillElement, skillElement.dataset)
    const skillID = skillElement?.dataset.itemId;

    // Handle different actions
    switch ( button.dataset.action ) {
      case "increase":
        return this.actor.skillLevelIncrease(skillID);
      case "decrease":
        return this.actor.skillLevelDecrease(skillID);
      case "delete":
        return this.actor.deleteSkill(skillID);
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
