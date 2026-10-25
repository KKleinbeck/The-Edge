import Aux from "../../system/auxilliaries.js";
import ChatServer from "../../system/chat_server.js";
import NotificationServer from "../../system/notifications.js";


export default class ControllerCharacter {
  declare actor: Actor

  constructor(actor: Actor) {
    this.actor = actor;
  }


  async useConsumable(item: Item) {
    const existingCopies = this.actor.system.findEffectsByName(
      item.name,
    );
    if (existingCopies.length) {
      NotificationServer.notify({ id: "Effect already exists" });
      return;
    }

    const genericModifiers = Aux.filterToGenericModifiers(
      item.system.effect,
    );
    const hasEffect = genericModifiers.length > 0;
    if (hasEffect) {
      this.actor.system.createNewEffect(item.name, genericModifiers);
    }

    var strainReduction = 0;
    if (item.system.current_type == "food") {
      const strainRoll = await new Roll(
        item.system.subtypes.food.strainReduction,
      ).evaluate();
      strainReduction = await this.actor.system.applyStrain(
        -strainRoll.total,
      );
    }

    ChatServer.transmitEvent(
      item.system.current_type == "food" ? "FOOD CONSUME" : "CONSUMABLE USED",
      {
        details: {
          actorName: this.actor.name,
          item: item.name,
          strainReduction: -strainReduction,
        },
        hasEffects: hasEffect,
      },
      this.actor.chatConfig(),
    );
    item.useOne();
  }


  async loadWeapon(weapon: Item, ammunitionId: string) {
    const ammunition = this.actor.items.get(ammunitionId);

    if (weapon.system.ammunitionID) weapon.system.unloadAmmunition();

    // Copy the ammuniation and load the weapon with it
    const created = await Item.create(ammunition, {parent: this.actor});
    created.update({ "system.loaded": true, "system.quantity": 1 });
    await weapon.update({"system.ammunitionID": created.id,});

    ammunition.useOne();

    const reloadDuration = weapon.system.reloadDuration + ammunition.system.reloadDuration;
    Hooks.call("TheEdgeAction", {
      action: "reload",
      actionType: "reload",
      actor: this.actor,
      actionCost: reloadDuration,
      details: { weapon: weapon.name },
    });
  }
}