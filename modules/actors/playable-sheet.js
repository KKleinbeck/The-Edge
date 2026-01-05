import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import DialogRest from "../dialogs/dialog-rest.js";
import DialogDamage from "../dialogs/dialog-damage.js";
import DialogReload from "../dialogs/dialog-reload.js";
import DialogWeapon from "../dialogs/dialog-weapon.js";
import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogCombatics from "../dialogs/dialog-combatics.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import THE_EDGE from "../system/config-the-edge.js";
import { TheEdgeActorSheet } from "./actor-sheet.js";

export class TheEdgePlayableSheet extends TheEdgeActorSheet {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    TheEdgeActorSheet.DEFAULT_OPTIONS,
    {
      actions: {
        // Hero Token
        heroTokenUsed: TheEdgePlayableSheet.useHeroToken,
        heroTokenRegen: TheEdgePlayableSheet.regenerateHeroToken,
        // Leveling
        advanceAttr: TheEdgePlayableSheet.advanceAttr,
        // Rolls
        rollAttribute: TheEdgePlayableSheet.rollAttribute,
        rollProficiency: TheEdgePlayableSheet.rollProficiency,
        rollAttack: TheEdgePlayableSheet.rollAttack,
        // Health
        longRest: TheEdgePlayableSheet.longRest,
        shortRest: TheEdgePlayableSheet.shortRest,
        applyDamage: TheEdgePlayableSheet.applyDamage,
        // Other
        reload: TheEdgePlayableSheet.reload,
      }
    }
  )

  static PARTS = {
    form: {
      template: "systems/the_edge/templates/actors/character/actor-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs" // Foundry default
    },
    attributes: {
      template: "systems/the_edge/templates/actors/character/attributes/layout.hbs",
    },
    proficiencies: {
      template: "systems/the_edge/templates/actors/character/proficiencies/layout.hbs",
    },
    combat: {
      template: "systems/the_edge/templates/actors/character/combat/layout.hbs",
    },
    items: {
      template: "systems/the_edge/templates/actors/character/items.hbs",
    },
    health: {
      template: "systems/the_edge/templates/actors/character/health.hbs",
    },
    biography: {
      template: "systems/the_edge/templates/actors/character/biography.hbs",
    }
  }

  static TABS = {
    primary: {
      tabs: [
        {id: "attributes"}, {id: "proficiencies"}, {id: "combat"},
        {id: "items"}, {id: "health"}, {id: "biography"}],
      labelPrefix: "TABS",
      initial: "attributes",
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const equippedArmour = this.actor.itemTypes["Armour"]?.filter(
      a => a.system.equipped && a.system.layer == "Inner");
    const armourProtection = {"value": 0, "original": 0};
    for (const armour of equippedArmour) {
      armourProtection.value += armour.system.structurePoints;
      armourProtection.original += armour.system.structurePointsOriginal;
      for (const attachment of armour.system.attachments) {
        armourProtection.value += attachment.shell.system.structurePoints;
        armourProtection.original += attachment.shell.system.structurePointsOriginal;
      }
    }
    const equippedWeapons = this.actor.itemTypes["Weapon"]?.filter(
      a => a.system.equipped
    );

    const credits = this.actor.itemTypes["Credits"]
    const creditsOffline = credits.find(c => c.system?.isSchid)?.system?.value || 0;
    const creditsDigital = credits.find(c => !c.system?.isSchid)?.system?.value || 0;
    const weight = this.actor.determineWeight();
    const wounds = this.actor.itemTypes["Wounds"];

    await this.actor.updateStatus();
    context.helpers = {
      armourProtection: armourProtection,
      equippedWeapons: equippedWeapons,
      bodyParts: ["Torso", "Head", "Arms", "Legs"],
      bleeding: wounds.map(x => x.system.bleeding).sum(),
      credits: {"Schids": creditsOffline, "digital": creditsDigital},
      damage: wounds.map(x => x.system.damage).sum(),
      languages: THE_EDGE.languages,
      itemTypes: ["Weapon", "Armour", "Ammunition", "Gear", "Consumables"],
      weight: weight,
      overloadLevel: this.actor.overloadLevel,
      weightTillNextOverload: this.actor.weightTillNextOverload,
      hrProgressBarData: [
        {value: context.system.heartRate.min.value, label: "Z1"},
        {value: context.prepare.zones[1].value, label: "Z2"},
        {value: context.prepare.zones[2].value, label: "Z3"},
      ]
    }

    context.effectDict = {statusEffects: [], effects: [], itemEffects: [], skillEffects: []}
    for (const item of this.actor.items) {
      if (item.type ==  "Effect") {
        if (item.system.statusEffect) context.effectDict.statusEffects.push(item);
        else context.effectDict.effects.push(item);
      } else if (item.type == "Skill" || item.type == "Combatskill" || item.type == "Medicalskill") {
        for (const effect of item.system.levelEffects) {
          if (effect.length != 0) {
            context.effectDict.skillEffects.push(item);
            break;
          }
        }
      } else if (item.system.equipped && item.system.effects.length !== 0) {
        context.effectDict.itemEffects.push(item);
      }
    }
    context.effectToggle = {statusEffects: false, effects: true, itemEffects: false, skillEffects: true};
    context.tabs = this._prepareTabs("primary");
    return context;
  }

  async _prepatePartContext(partId, context) {
    switch (partId) {
      case "attributes":
        this._prepareAttributeContext(context);
        break
    }
  }

  // actions
  static async useHeroToken(_event, _target) { await this.actor.useHeroToken(); }

  static async regenerateHeroToken(_event, _target) {
    if (game.user.isGM) {
      await this.actor.regenerateHeroToken();
    } else {
      // TODO: notify
    }
  }

  static async advanceAttr(_event, target) {
    const dataset = target.dataset;
    this.actor._advanceAttr(dataset.name, dataset.type);
  }

  static async rollAttribute(_event, target) {
    DialogAttribute.start({
      actor: this.actor, actorId: this.actor.id, attribute: target.dataset.attribute,
      tokenId: this.token?.id, sceneId: game.user.viewedScene // TODO: Scene IDs needed?
    })
  }

  static async rollProficiency(_event, target) {
    DialogProficiency.start({
      actor: this.actor, actorId: this.actor.id, proficiency: target.dataset.proficiency,
      tokenId: this.token?.id, sceneId: game.user.viewedScene // TODO: Scene IDs needed?
    })
  }
  
  static async rollAttack(_event, target) {
    const targetIds = Array.from(game.user.targets.map(x => x.id));  //targets is set
    const sceneId = game.user.viewedScene; // TODO: Needed?
    const actor = this.actor;
    const weaponID = target.closest(".weapon-id")?.dataset.weaponId ||
      target.dataset.weaponId;
    const weapon = this.actor.items.get(weaponID);
    const token = this.token || Aux.getToken(this.actor.id);
    if (token === null) {
        const msg = LocalisationServer.localise("No Token", "Notifications")
        ui.notifications.notify(msg)
      return undefined;
    }

    if (weapon.system.type === "Hand-to-Hand combat") {
      if (targetIds.length > 1) {
        const msg = LocalisationServer.parsedLocalisation(
          "Too many targets", "Notifications", {weapon: "hand to hand", max: 1}
        )
        ui.notifications.notify(msg)
        return undefined;
      }
      const threshold = weaponID ? actor._getWeaponPL(weaponID) : actor._getCombaticsPL();
      const damage = weaponID ? weapon.system.fireModes[0].damage : actor._getCombaticsDamage();
      const name = weaponID ? weapon.name : LocalisationServer.localise("Hand to Hand combat", "combat");
      DialogCombatics.start({
        actor: actor, token: token, sceneId: sceneId, targetId: targetIds[0] || undefined,
        name: name, threshold: threshold, damage: damage, sceneId: sceneId
      })
      return undefined;
    }

    if (targetIds.length > 1 && !(weapon.system.multipleTargets)) {
      const msg = LocalisationServer.parsedLocalisation(
        "Too many targets", "Notifications", {weapon: weapon.name, max: 1}
      )
      ui.notifications.notify(msg)
      return undefined;
    }

    if (weapon.system.ammunitionID === "") {
      let msg = LocalisationServer.localise("Ammu missing", "Notifications")
      ui.notifications.notify(msg)
      return undefined;
    }

    let damageType = ""
    if (weapon.system.isElemental) {
      damageType = "Elemental"
    } else if (Object.keys(game.model.Actor.character.weapons.energy).includes(weapon.system.type)) {
      damageType = "energy"
    } else damageType = "kinetic";
    
    const threshold = actor._getWeaponPL(weapon._id);
    const effectItems = actor.items.filter(x => x.system.effects !== undefined)
    const effectModifier = [];
    for (const effectItem of effectItems) {
      if (!effectItem.system.active && !effectItem.system.equipped) continue;
      for (const effect of effectItem.system.effects) {
        if (effect.group != "weapons") continue;
        if (effect.name == "all" || effect.name == damageType || effect.name == weapon.system.type) {
          effectModifier.push({name: effectItem.name, value: effect.value})
        }
      }
    }
    DialogWeapon.start({
      name: weapon.name, actor: actor, actorId: actor.id, token: token,
      tokenId: token?.id, sceneId: sceneId,
      ammunition: actor.items.get(weapon.system.ammunitionID),
      threshold: threshold, effectModifier: effectModifier,
      damageType: damageType,
      rangeChart: weapon.system.rangeChart,
      fireModes: weapon.system.fireModes,
      targetIds: targetIds
    })
  }

  static async reload(_event, target) {
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

  static longRest( _) { DialogRest.start({actor: this.actor, type: "short rest"}); }
  static shortRest(_) { DialogRest.start({actor: this.actor, type: "short rest"}); }

  static applyDamage(_event, target) {
    const location = target.dataset.location;
    DialogDamage.start({actor: this.actor, location: location});
  }

  // Specific Listeners
  _onRender(context, options) {
    super._onRender(context, options)

    this.element.querySelectorAll("[data-action='advanceAttr']").forEach(attr =>
        attr.addEventListener("mouseover", this._attrCostTooltip)
    )
    this.element.querySelectorAll(".core-value").forEach(cv => {
        cv.addEventListener("keyup", (ev) => this._onModifyCoreValues(ev, this.actor));
        cv.addEventListener("mousewheel", (ev) => this._onModifyCoreValues(ev, this.actor));
        cv.addEventListener("change", (ev) => this._onChangeCoreValues(ev, this.actor));
    })
  }

  _attrCostTooltip(event) {
    const target = event.currentTarget;
    const type = target.getAttribute("advance-type");
    const cost = target.dataset.cost;

    if (type == "advance") {
      const text = LocalisationServer.parsedLocalisation("Costs", "notifications", {cost: cost});
      game.tooltip.activate(event.currentTarget, {text: text, direction: "UP"});
    }
    else {
      const text = LocalisationServer.parsedLocalisation("Gain", "notifications", {gain: cost});
      game.tooltip.activate(event.currentTarget, {text: text, direction: "UP"});
    }
  }

  _onModifyCoreValues(event, actor) {
    const field = $(event.currentTarget);
    const name = event.currentTarget.dataset.target;

    const cost = actor.coreValueChangeCost(name, field.val());

    if (cost == 0) return;
    else if (cost > 0) {
      const text = LocalisationServer.parsedLocalisation("Costs", "notifications", {cost: cost});
      game.tooltip.activate(event.currentTarget, {text: text, direction: "DOWN"});
    }
    else {
      const text = LocalisationServer.parsedLocalisation("Gain", "notifications", {gain: -cost});
      game.tooltip.activate(event.currentTarget, {text: text, direction: "DOWN"});
    }
  }

  _onChangeCoreValues(event, actor) {
    const target = event.target;
    const name = target.dataset.target;
    actor.changeCoreValue(name, target.value);
  }
}

