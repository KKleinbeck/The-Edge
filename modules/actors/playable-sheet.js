import ChatServer from "../system/chat_server.js";
import DialogAttribute from "../dialogs/dialog-attribute.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
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
      }
    }
  )

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return context;
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
      tokenId: this.token?.id, sceneID: game.user.viewedScene
    })
  }
}

