import Aux from "../system/auxilliaries.js";
import DialogRest from "../dialogs/dialog-rest.js";
import DialogDamage from "../dialogs/dialog-damage.js";
import DialogReload from "../dialogs/dialog-reload.js";
import DialogWeapon from "../dialogs/dialog-weapon.js";
import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogCombatics from "../dialogs/dialog-combatics.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";
import { TheEdgeActorSheet } from "./actor-sheet.js";

// @ts-expect-error
export class TheEdgePlayableSheet extends TheEdgeActorSheet {
  constructor(...args: ConstructorParameters<typeof TheEdgeActorSheet>) {
    super(...args);
    this.effectIsExpanded = {
      statusEffects: Array(this.actor.system.statusEffects.length).fill(false),
      effects: Array(this.actor.system.effects.length).fill(false),
    };
  }

  static DEFAULT_OPTIONS = {...TheEdgeActorSheet.DEFAULT_OPTIONS,
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
      woundControl: TheEdgePlayableSheet._onWoundControl,
    }
  }

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
    await this.actor.update(); // Forces status effects to be up to date
    for (const key of Object.keys(context.system.attributes)) {
      const n = context.system.attributes[key].advances;
      context.system.attributes[key].cost = THE_EDGE.attrCost(n),
      context.system.attributes[key].refund = n == 0 ? 0 : THE_EDGE.attrCost(n-1)
    }

    context.profGroups = []
    context.profGroups.push({
      physical: Object.keys(context.system.proficiencies["physical"]),
      social: Object.keys(context.system.proficiencies["social"]),
      technical: Object.keys(context.system.proficiencies["technical"]),
    })
    context.profGroups.push({
      environmental: Object.keys(context.system.proficiencies["environmental"]),
      knowledge: Object.keys(context.system.proficiencies["knowledge"]),
      mental: Object.keys(context.system.proficiencies["mental"]),
    })

    context.definedEffects = THE_EDGE.definedEffects;
    Object.entries(this.actor.itemTypes).forEach(([type, entries]) => {
      context[type] = entries;
    })
    context.effectIsExpanded = this.effectIsExpanded;

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

    const weight = this.actor.itemWeight;

    context.helpers = {
      armourProtection: armourProtection,
      equippedWeapons: equippedWeapons,
      bodyParts: ["Torso", "Head", "Arms", "Legs"],
      bleeding: this.actor.system.wounds.map(x => x.bleeding).sum(),
      damage: this.actor.system.wounds.map(x => x.damage).sum(),
      initiative: {
        baseFormula: CONFIG.Combat.initiative.formula,
        parsedFormula: Roll.parse(
          CONFIG.Combat.initiative.formula,
          foundry.utils.flattenObject(this.actor.system)
        ).reduce((acc: string, dieTerm: foundryAny) => acc + dieTerm.formula, "")
      },
      itemTypes: ["Weapon", "Armour", "Ammunition", "Gear", "Consumables"],
      weight: weight,
      overloadLevel: this.actor.system.overloadLevel,
      weightTillNextOverload: this.actor.system.weightTillNextOverload,
    }

    context.effectDict = {
      effects: this.actor.system.effects,
      itemEffects: this.actor.getItemEffects(true),
      skillEffects: this.actor.getSkillEffects(),
      statusEffects: this.actor.system.statusEffects,
    };
    context.effectToggle = {statusEffects: false, effects: true, itemEffects: false, skillEffects: true};
    context.tabs = this._prepareTabs("primary");
    return context;
  }

  // async _preparePartContext(partId, context) {
  //   switch (partId) {
  //     case "attributes":
  //       this._prepareAttributeContext(context);
  //       break
  //   }
  // }

  // actions
  static async _onWoundControl(event, target) {
    event.preventDefault();

    // Obtain event data
    const woundElement = target.closest(".wound-hook");
    const index = +woundElement?.dataset.index || 0; 

    // Handle different actions
    switch ( target.dataset.subaction ) {
      case "delete":
        this.actor.system.deleteWound(index);
        break
    }
  }

  static async useHeroToken(_event, _target) { await this.actor.system.useHeroToken(); }

  static async regenerateHeroToken(_event, _target) {
    if (game.user.isGM) {
      await this.actor.system.regenerateHeroToken();
    } else {
      // TODO: notify
    }
  }

  static async advanceAttr(_event, target) {
    const dataset = target.dataset;
    this.actor.system.advanceAttr(dataset.name, dataset.type);
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
      tokenId: this.token?.id, sceneId: game.user.viewedScene
    })
  }
  
  static async rollAttack(_event, target) {
    const actor = this.actor;
    const token = this.token || Aux.getToken(actor.id);
    if (token === null) {
        const msg = LocalisationServer.localise("No Token", "Notifications")
        ui.notifications.notify(msg)
      return undefined;
    }
    const targetIds = Array.from(game.user.targets.map(x => x.id));  //targets is set
    const sceneId = game.user.viewedScene; // TODO: Needed?
    const weaponID = target.closest(".weapon-id")?.dataset.weaponId ||
      target.dataset.weaponId;
    const weapon = this.actor.items.get(weaponID);
    const threshold = weaponID ? actor.system.getWeaponPlOfWeapon(weaponID) : actor.system.combaticsPL;

    if (!weaponID || weapon.system.type === "Hand-to-Hand combat") {
      if (targetIds.length > 1) {
        const msg = LocalisationServer.parsedLocalisation(
          "Too many targets", "Notifications", {weapon: "hand to hand", max: 1}
        )
        ui.notifications.notify(msg)
        return undefined;
      }
      const damage = weaponID ? weapon.system.fireModes[0].damage : actor.system.combaticsDamage;
      const name = weaponID ? weapon.name : LocalisationServer.localise("Hand to Hand combat", "combat");
      DialogCombatics.start({
        actor: actor, token: token, sceneId: sceneId, targetId: targetIds[0] || undefined,
        name: name, threshold: threshold, damage: damage
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
    } else if (Object.keys(THE_EDGE.characterSchema.weapons.energy).includes(weapon.system.type)) {
      damageType = "energy"
    } else damageType = "kinetic";
    
    const activeEffects = [
      ...this.actor.system.effects,
      ...this.actor.getItemEffects(true),
      ...this.actor.getSkillEffects(true),
      ...this.actor.system.statusEffects,
    ];
    const effects: IEffectOverview[] = [];
    for (const effect of activeEffects) {
      for (const modifier of effect.modifiers) {
        if (modifier.group != "weapons") continue;
        if (modifier.field == "all" || modifier.field == damageType || modifier.field == weapon.system.type) {
          effects.push({name: effect.name, value: modifier.value})
        }
      }
    }
    DialogWeapon.start({
      name: weapon.name, actor: actor, actorId: actor.id, token: token,
      tokenId: token?.id, sceneId: sceneId,
      ammunition: actor.items.get(weapon.system.ammunitionID),
      threshold: threshold, effects: effects,
      damageType: damageType,
      rangeChart: weapon.system.rangeChart,
      fireModes: weapon.system.fireModes,
      targetIds: targetIds
    })
  }

  static async reload(_event, target) {
    const weaponID = target.closest(".weapon-id").dataset.weaponId;
    const weapon = this.actor.items.get(weaponID);
    const ammunitionOptions = this.actor.itemTypes["Ammunition"].filter(x => {
      const isWhitelisted = (
        x.system.whitelist[x.system.type][weapon.system.type] ||
        weapon.system.type === "Recoilless Rifles"
      ); 
      const subtypeMatches = (x.system.subtype == weapon.system.ammunitionType);
      const isNotLoaded = !x.system.loaded;
      return isWhitelisted && subtypeMatches && isNotLoaded;
    });

    await DialogReload.start({
      weaponID: weaponID,
      actor: this.actor,
      weapon: weapon,
      ammunitionOptions: ammunitionOptions
    })
  }

  static longRest( _) { DialogRest.start({actor: this.actor, type: "long rest"}); }
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
      if (cost <= 0) return; // No negative gains
      const text = LocalisationServer.parsedLocalisation("Gain", "notifications", {gain: cost});
      game.tooltip.activate(event.currentTarget, {text: text, direction: "UP"});
    }
  }

  _onModifyCoreValues(event, actor) {
    const field = $(event.currentTarget);
    const name = event.currentTarget.dataset.target;

    const newVal = field.val() >= 0 ? field.val() : 0;
    const cost = actor.system.coreValueChangeCost(name, newVal);

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
    actor.system.changeCoreValue(name, Math.max(target.value, 0));
    if (target.value < 0) this.render(true); // As this might not trigger an update
  }
}

