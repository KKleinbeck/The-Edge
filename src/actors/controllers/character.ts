import Aux from "../../system/auxilliaries.js";
import ChatServer from "../../system/chat_server.js";
import NotificationServer from "../../system/notifications.js";


export default class ControllerCharacter {
  declare actor: Actor

  constructor(actor: Actor) {
    this.actor = actor;
  }


  async _foodConsume(item: Item) {
    const existingCopies = this.actor.system.findEffectsByName(
      item.name,
    );
    if (existingCopies.length) {
      NotificationServer.notify("Effect already exists");
      return;
    }

    const genericModifiers = Aux.filterToGenericModifiers(
      item.system.effect,
    );
    const hasEffect = genericModifiers.length > 0;
    if (hasEffect) {
      this.actor.system.createNewEffect(item.name, genericModifiers);
    }
    const strainRoll = await new Roll(
      item.system.subtypes.food.strainReduction,
    ).evaluate();
    const strainChange = await this.actor.system.applyStrain(
      -strainRoll.total,
    );
    ChatServer.transmitEvent(
      "FOOD CONSUME",
      {
        details: {
          actorName: this.actor.name,
          item: item.name,
          strainReduction: -strainChange,
        },
        hasEffects: hasEffect,
      },
      this.actor.chatConfig(),
    );
    item.useOne();
  }
}