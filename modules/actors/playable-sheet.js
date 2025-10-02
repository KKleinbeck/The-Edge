import ChatServer from "../system/chat_server.js";
import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import THE_EDGE from "../system/config-the-edge.js";
import { TheEdgeActorSheet } from "./actor-sheet.js";

const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets;

export class TheEdgePlayableSheet extends TheEdgeActorSheet {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    TheEdgeActorSheet.DEFAULT_OPTIONS,
    {
      actions: {
        heroTokenUsed: TheEdgePlayableSheet.useHeroToken,
        heroTokenRegen: TheEdgePlayableSheet.regenerateHeroToken,
        rollAttribute: TheEdgePlayableSheet.rollAttribute,
        rollProficiency: TheEdgePlayableSheet.rollProficiency,
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
      scrollable: [""]
    },
    proficiencies: {
      template: "systems/the_edge/templates/actors/character/proficiencies/layout.hbs",
      scrollable: [""]
    }
  }

  static TABS = {
    primary: {
      tabs: [{id: "attributes"}, {id: "proficiencies"}],
      labelPrefix: "TABS",
      initial: "attributes",
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const equippedArmour = this.actor.itemTypes["Armour"]?.filter(
      a => a.system.equipped && a.system.layer == "Inner");
    let armourProtection = 0;
    for (const armour of equippedArmour) {
      armourProtection += armour.system.structurePoints;
      for (const attachment of armour.system.attachments) {
        armourProtection += attachment.shell.system.structurePoints;
      }
    }
    const equippedWeapons = this.actor.itemTypes["Weapon"]?.filter(
      a => a.system.equipped
    );

    const credits = this.actor.itemTypes["Credits"]
    const creditsOffline = credits.find(c => c.system?.isSchid)?.system?.value || 0;
    const creditsDigital = credits.find(c => !c.system?.isSchid)?.system?.value || 0;
    const weight =  this.actor._determineWeight();
    const wounds = this.actor.itemTypes["Wounds"];
    context.helpers = {
      armourProtection: armourProtection,
      equippedWeapons: equippedWeapons,
      bodyParts: ["Torso", "Head", "Arms", "Legs"],
      bleeding: wounds.map(x => x.system.bleeding).sum(),
      credits: {"Schids": creditsOffline, "digital": creditsDigital},
      damage: wounds.map(x => x.system.damage).sum(),
      languages: THE_EDGE.languages,
      types: ["Weapon", "Armour", "Ammunition", "Gear", "Consumables"],
      weight: weight,
      overloadLevel: this.actor.overloadLevel,
      weightTillNextOverload: this.actor.weightTillNextOverload,
      hrProgressBarData: [
        {value: context.system.heartRate.min.value, label: "Z1"},
        {value: context.prepare.zones[1].value, label: "Z2"},
        {value: context.prepare.zones[2].value, label: "Z3"},
      ]
    }
    console.log(context)
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
  static useHeroToken(_event, _target) {
    const actor = this.actor
    actor.update({"system.heroToken.available": actor.system.heroToken.available - 1});
    ChatServer.transmitEvent("Hero Token", {name: actor.name, reason: "reason"});
  }

  static regenerateHeroToken(_event, _target) {
    if (game.user.isGM) {
      this.actor.update({"system.heroToken.available": this.actor.system.heroToken.available + 1});
    } else {
      // TODO: notify
    }
  }

  static rollAttribute(_event, target) {
    DialogAttribute.start({
      actor: this.actor, actorId: this.actor.id, attribute: target.dataset.attribute,
      tokenId: this.token?.id, sceneID: game.user.viewedScene // TODO: Scene IDs needed?
    })
  }
  static rollProficiency(_event, target) {
    console.log(target.dataset)
    DialogProficiency.start({
      actor: this.actor, actorId: this.actor.id, proficiency: target.dataset.proficiency,
      tokenId: this.token?.id, sceneID: game.user.viewedScene // TODO: Scene IDs needed?
    })
  }
}

