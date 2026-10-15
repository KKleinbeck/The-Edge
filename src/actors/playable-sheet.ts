import Aux from "../system/auxilliaries.js";

import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogCombatics from "../dialogs/dialog-combatics.js";
import DialogDamage from "../dialogs/dialog-damage.js";
import DialogEditWounds from "../dialogs/dialog-edit-wounds.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import DialogReload from "../dialogs/dialog-reload.js";
import DialogRest from "../dialogs/dialog-rest.js";
import DialogWeapon from "../dialogs/dialog-weapon.js";
import LocalisationServer from "../system/localisation_server.js";
import NotificationServer from "../system/notifications.js";

import THE_EDGE from "../system/config-the-edge.js";
import { TheEdgeActor } from "./actor.js";
import { TheEdgeActorSheet } from "./actor-sheet.js";

const { renderTemplate } = foundry.applications.handlebars;

export class TheEdgePlayableSheet extends TheEdgeActorSheet {
  declare actor: TheEdgeActor;
  declare token: TokenDocument;
  declare definedEffects: Record<string, string[]>;

  constructor(...args: ConstructorParameters<typeof TheEdgeActorSheet>) {
    super(...args);
    this.effectIsExpanded = {
      statusEffects: Array(this.actor.system.statusEffects.length).fill(false),
      effects: Array(this.actor.system.effects.length).fill(false),
    };

    this.definedEffects = structuredClone(THE_EDGE.definedEffects);
  }

  static DEFAULT_OPTIONS = {
    ...TheEdgeActorSheet.DEFAULT_OPTIONS,
    actions: {
      ...TheEdgeActorSheet.DEFAULT_OPTIONS.actions,
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
    },
  };

  static PARTS = {
    header: {
      template: "systems/the_edge/templates/actors/character/actor-header.hbs",
    },
    separator: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    attributes: {
      template:
        "systems/the_edge/templates/actors/character/attributes/layout.hbs",
    },
    proficiencies: {
      template:
        "systems/the_edge/templates/actors/character/proficiencies/layout.hbs",
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
    },
    separatorTabs: {
      template: "systems/the_edge/templates/generic/separator-horizontal.hbs",
    },
    tabs: {
      template: "systems/the_edge/templates/applications/the-edge-tab-navigation.hbs"
    },
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "attributes" },
        { id: "proficiencies" },
        { id: "combat" },
        { id: "items" },
        { id: "health" },
        { id: "biography" },
      ],
      labelPrefix: "TABS",
      initial: "attributes",
    },
  };

  async getCustomFooterBar(): Promise<string> {
    if (this.tabGroups.primary == "items") return this._footerItems();
    if (this.tabGroups.primary == "biography") return this._footerBiography();
    return this._footerPracticeHours();
  }

  _footerPracticeHours(): string {
    var footer = `<div style="display: flex; gap: 15px; align-items: end;">
      <div>
        ${LocalisationServer.localise("PracticeHours")}
      </div>
      <div>
        <div style="text-align: center;"><b>${LocalisationServer.localise("used")}</b></div>
        <div class="output" style="width: 80px;">${this.actor.system.PracticeHours.used}</div>
      </div>
      <div>
        <div style="text-align: center;"><b>${LocalisationServer.localise("used")}</b></div>
    `
    if (game.user.isGM) {
      footer += `<input style="width: 80px; text-align: center;"
        value="${this.actor.system.PracticeHours.max}" name="system.PracticeHours.max" type="number">`;
    } else {
      footer += `<span class="output" style="width: 80px;">${this.actor.system.PracticeHours.max}</span>`;
    }
    footer += `</div></div>`
    return footer;
  }

  _footerItems(): string {
    const weightTillNextOverload = this.actor.system.weightTillNextOverload;

    var footer = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      ${LocalisationServer.localise("Credits")}
      <div style="max-width: 30%;">
        <input type="Number" id="Chids" style="width: 70%; text-align: right;" name="system.credits.chids"
          value="${this.actor.system.credits.chids}"/>
      </div>
      <div style="display: flex; gap: 20px; align-items: center; padding-right: 15px;">
        <div>${LocalisationServer.localise("Weight")}: ${this.actor.itemWeight.toFixed(1)} kg</div>
        <div style="white-space: nowrap; text-align: right;">
          <div>${LocalisationServer.localise("Overload", "Effect_Group")}: ${this.actor.system.overloadLevel}</div>
          <div>${weightTillNextOverload.toFixed(0)}kg ${LocalisationServer.localise("to next level")}</div>
        </div>
      </div>
    </div>
    `
    return footer;
  }

  _footerBiography(): string {
    var footer = `
      <div style="display: flex; width: 100%; justify-content: space-between;">
        <div>
          <label style="display: block; text-align: center;" for="Age Selector">${LocalisationServer.localise("Age")}</label>
          <input name="system.age" id="Age Selector" type="text" value="${this.actor.system.age}"
            min="21" placeholder="Name" style="max-width: 40px; text-align: right;"/>
        </div>
        <div>
          <label style="display: block; text-align: center;" for="Sex Selector">${LocalisationServer.localise("Sex")}</label>
          <select class="selection-box" name="system.sex" id="Sex Selector" style="width: 75px; padding: 0 2px 0 0;">
            <option value="female" ${this.actor.system.sex == 'female' ? "selected" : ""}>${LocalisationServer.localise("female")}</option>
            <option value="male" ${this.actor.system.sex == 'male' ? "selected" : ""}>${LocalisationServer.localise("make")}</option>
            <option value="other" ${this.actor.system.sex == 'other' ? "selected" : ""}>${LocalisationServer.localise("other")}</option>
          </select>
        </div>
        <div>
          <label style="display: block; text-align: center;" for="height selectr">${LocalisationServer.localise("Height")} [cm]</label>
          <div style="display: flex; gap: 5px; align-items: center;">
            <input
              name="system.height" type="number" value="${this.actor.system.height}" placeholder="165" min="0"
              style="max-width: 36px; text-align: right; padding: 0 2px 0 0;" id="height selector"/>
            (${LocalisationServer.localise(Aux.getSizeGroup(this.actor.system.height), "combat")})
          </div>
        </div>
        <div>
          <label style="display: block; text-align: center;" for="race selector">${LocalisationServer.localise("Race")}</label>
          <input name="system.race" id="race selector" type="text" value="${this.actor.system.race}"
            placeholder="${LocalisationServer.localise('Race ...')}" style="max-width: 80px; text-align: right;"/>
        </div>
      </div>
    `;
    return footer;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    await this.actor.update(); // Forces status effects to be up to date
    for (const key of Object.keys(context.system.attributes)) {
      const n = context.system.attributes[key].advances;
      ((context.system.attributes[key].cost = THE_EDGE.attrCost(n)),
        (context.system.attributes[key].refund =
          n == 0 ? 0 : THE_EDGE.attrCost(n - 1)));
    }

    context.profGroups = [];
    context.profGroups.push({
      physical: Object.keys(context.system.proficiencies["physical"]),
      social: Object.keys(context.system.proficiencies["social"]),
      technical: Object.keys(context.system.proficiencies["technical"]),
    });
    context.profGroups.push({
      environmental: Object.keys(context.system.proficiencies["environmental"]),
      knowledge: Object.keys(context.system.proficiencies["knowledge"]),
      mental: Object.keys(context.system.proficiencies["mental"]),
    });

    context.definedEffects = this.definedEffects;
    Object.entries(this.actor.itemTypes).forEach(([type, entries]) => {
      context[type] = entries;
    });
    context.effectIsExpanded = this.effectIsExpanded;

    const equippedArmour = this.actor.itemTypes["Armour"]?.filter(
      (a: Item) => a.system.equipped && a.system.layer == "Inner",
    );
    const armourProtection = { value: 0, original: 0 };
    for (const armour of equippedArmour) {
      armourProtection.value += armour.system.structurePoints;
      armourProtection.original += armour.system.structurePointsOriginal;
      for (const attachment of armour.system.attachments) {
        armourProtection.value += attachment.shell.system.structurePoints;
        armourProtection.original +=
          attachment.shell.system.structurePointsOriginal;
      }
    }
    const equippedWeapons = this.actor.itemTypes["Weapon"]?.filter(
      (a: Item) => a.system.equipped,
    );

    context.helpers = {
      armourProtection: armourProtection,
      equippedWeapons: equippedWeapons,
      bodyParts: ["Torso", "Head", "Arms", "Legs"],
      bleeding: this.actor.system.wounds.map((x) => x.bleeding).sum(),
      damage: this.actor.system.wounds.map((x) => x.damage).sum(),
      initiative: {
        baseFormula: CONFIG.Combat.initiative.formula,
        parsedFormula: Roll.parse(
          CONFIG.Combat.initiative.formula,
          foundry.utils.flattenObject(this.actor.system),
        ).reduce(
          (acc: string, dieTerm: foundryAny) => acc + dieTerm.formula,
          "",
        ),
      },
      itemTypes: ["Weapon", "Armour", "Ammunition", "Gear", "Consumables"],
    };

    context.effectDict = {
      effects: this.actor.system.effects,
      itemEffects: this.actor.getItemEffects(true),
      skillEffects: this.actor.getSkillEffects(),
      statusEffects: this.actor.system.statusEffects,
    };
    context.effectToggle = {
      statusEffects: false,
      effects: true,
      itemEffects: false,
      skillEffects: true,
    };
    context.tabs = this._prepareTabs("primary");
    return context;
  }

  async changeTab(tab: string, group: string, options: Record<string, any>) {
    const result = super.changeTab(tab, group, options);
    const footer = await this.getCustomFooterBar();
    this.element.querySelector(".custom-footer-bar").innerHTML = footer;
    return result;
  }


  // actions
  static async _onWoundControl(this, event, target) {
    event.preventDefault();

    // Obtain event data
    const woundElement = target.closest(".wound-hook");
    const index = +woundElement?.dataset.index || 0;

    // Handle different actions
    switch (target.dataset.subaction) {
      case "delete":
        this.actor.system.deleteWound(index);
        break;

      case "edit":
        const wound: IWound = this.actor.system.wounds[index];
        const newDetails = await DialogEditWounds.prompt(wound);
        if (newDetails) this.actor.system.editWound(index, newDetails);
        break;
    }
  }

  static async useHeroToken(this, _event, _target) {
    await this.actor.system.useHeroToken();
  }

  static async regenerateHeroToken(this, _event, _target) {
    if (game.user.isGM) {
      await this.actor.system.regenerateHeroToken();
    } else {
      // TODO: notify
    }
  }

  static async advanceAttr(this, _event, target) {
    const dataset = target.dataset;
    this.actor.system.advanceAttr(dataset.name, dataset.type);
  }

  static async rollAttribute(this, _event, target) {
    DialogAttribute.start({
      actor: this.actor,
      actorId: this.actor.id,
      attribute: target.dataset.attribute,
      tokenId: this.token?.id,
      sceneId: game.user.viewedScene, // TODO: Scene IDs needed?
    });
  }

  static async rollProficiency(this, _event, target) {
    DialogProficiency.start({
      actor: this.actor,
      actorId: this.actor.id,
      proficiency: target.dataset.proficiency,
      tokenId: this.token?.id,
      sceneId: game.user.viewedScene,
    });
  }

  static async rollAttack(this, _event, target) {
    const actor = this.actor;
    const token = this.token || Aux.getToken(actor.id);
    if (token === null) {
      NotificationServer.notify({ id: "No Token" });
      return undefined;
    }

    const targetIds: string[] = Array.from(game.user.targets.map((x) => x.id));
    const sceneId = game.user.viewedScene; // TODO: Needed?
    const weaponId =
      target.closest(".weapon-id")?.dataset.weaponId || target.dataset.weaponId;
    const weapon = this.actor.items.get(weaponId);

    if (!weaponId || weapon.system.type === "Hand-to-Hand combat") {
      if (targetIds.length > 1) {
        NotificationServer.notify({ id: "Too many targets", details: {
          weapon: "hand to hand",
          max: 1,
        } });
        return undefined;
      }
      const damageRoll = weaponId
        ? weapon.system.fireModes[0].damage
        : actor.system.combaticsDamage;
      const name = weaponId
        ? weapon.name
        : LocalisationServer.localise("Hand to Hand combat", "combat");
      const threshold = actor.system.combaticsPL;
      DialogCombatics.start(
        {
          actor,
          actorId: actor.id,
          token,
          sceneId,
          targetId: targetIds[0] || undefined,
          name,
          threshold,
          damageRoll,
        },
        weaponId ?? "UnarmedStrike",
      );
      return undefined;
    }

    if (targetIds.length > 1 && !weapon.system.multipleTargets) {
      NotificationServer.notify({ id: "Too many targets", details: {
        weapon: weapon.name,
        max: 1,
      } });
      return undefined;
    }

    if (weapon.system.ammunitionID === "") {
      NotificationServer.notify({ id: "Ammu missing" });
      return undefined;
    }

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
        if (
          modifier.field == "all" ||
          modifier.field == weapon.system.damageType ||
          modifier.field == weapon.system.type
        ) {
          effects.push({ name: effect.name, value: modifier.value });
        }
      }
    }

    DialogWeapon.start({
      actor: actor,
      token: token,
      sceneId: sceneId,
      weapon: weapon,
      targetIds: targetIds,
      effects: effects,
    });
  }

  static async reload(this, _event, target) {
    const weaponId = target.closest(".weapon-id").dataset.weaponId;
    const weapon = this.actor.items.get(weaponId);
    const ammunitionOptions = this.actor.itemTypes["Ammunition"].filter((x) => {
      const subtypeMatches = x.system.subtype == weapon.system.ammunitionType;
      const isNotLoaded = !x.system.loaded;
      return subtypeMatches && isNotLoaded;
    });

    await DialogReload.start({
      weaponId: weaponId,
      actor: this.actor,
      weapon: weapon,
      ammunitionOptions: ammunitionOptions,
    });
  }

  static longRest(this, _) {
    DialogRest.start({ actor: this.actor, type: "long rest" });
  }
  static shortRest(this, _) {
    DialogRest.start({ actor: this.actor, type: "short rest" });
  }

  static applyDamage(this, _event, target) {
    const location = target.dataset.location;
    DialogDamage.start({ actor: this.actor, location: location });
  }

  // Specific Listeners
  async _onRender(context, options) {
    super._onRender(context, options);
    
    const footer = await this.getCustomFooterBar();
    this.element.querySelector(".custom-footer-bar").innerHTML = footer;

    this.element
      .querySelectorAll("[data-action='advanceAttr']")
      .forEach((attr) =>
        attr.addEventListener("mouseover", this._attrCostTooltip),
      );
    this.element.querySelectorAll(".core-value").forEach((cv) => {
      cv.addEventListener("keyup", (ev) =>
        this._onModifyCoreValues(ev, this.actor),
      );
      cv.addEventListener("mousewheel", (ev) =>
        this._onModifyCoreValues(ev, this.actor),
      );
      cv.addEventListener("change", (ev) =>
        this._onChangeCoreValues(ev, this.actor),
      );
    });
  }

  _attrCostTooltip(event) {
    const target = event.currentTarget;
    const type = target.getAttribute("advance-type");
    const cost = target.dataset.cost;

    if (type == "advance") {
      const text = LocalisationServer.parsedLocalisation(
        "Costs",
        "notifications",
        { cost: cost },
      );
      game.tooltip.activate(event.currentTarget, {
        text: text,
        direction: "UP",
      });
    } else {
      if (cost <= 0) return; // No negative gains
      const text = LocalisationServer.parsedLocalisation(
        "Gain",
        "notifications",
        { gain: cost },
      );
      game.tooltip.activate(event.currentTarget, {
        text: text,
        direction: "UP",
      });
    }
  }

  _onModifyCoreValues(event, actor) {
    const field = $(event.currentTarget);
    const name = event.currentTarget.dataset.target;

    const newVal = field.val() >= 0 ? field.val() : 0;
    const cost = actor.system.coreValueChangeCost(name, newVal);

    if (cost == 0) return;
    else if (cost > 0) {
      const text = LocalisationServer.parsedLocalisation(
        "Costs",
        "notifications",
        { cost: cost },
      );
      game.tooltip.activate(event.currentTarget, {
        text: text,
        direction: "DOWN",
      });
    } else {
      const text = LocalisationServer.parsedLocalisation(
        "Gain",
        "notifications",
        { gain: -cost },
      );
      game.tooltip.activate(event.currentTarget, {
        text: text,
        direction: "DOWN",
      });
    }
  }

  _onChangeCoreValues(event, actor) {
    const target = event.target;
    const name = target.dataset.target;
    actor.system.changeCoreValue(name, Math.max(target.value, 0));
    if (target.value < 0) this.render(true); // As this might not trigger an update
  }
}
