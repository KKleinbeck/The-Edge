import Aux from "../../system/auxilliaries.js";
import ChatServer from "../../system/chat_server.js";
import DiceServer from "../../system/dice_server.js";
import NotificationServer from "../../system/notifications.js";


export default class ControllerCharacter {
  declare actor: Actor

  constructor(actor: Actor) {
    this.actor = actor;
  }


  async applyMedicine(woundIndex: number, medicineItem: Item) {
    const wounds = this.actor.system.wounds;
    const wound = wounds[woundIndex];
    const medicine = medicineItem.system.subtypes.medicine;
    const effect = medicine.effect;

    let healing: number = await DiceServer.genericRoll(medicine.healing);
    healing = Math.min(healing, wound.damage);
    let coagulation: number = await DiceServer.genericRoll(
      medicine.coagulation,
    );
    coagulation = Math.min(coagulation, wound.bleeding);

    if (healing == wound.damage && coagulation == wound.bleeding) {
      this.actor.system.deleteWound(woundIndex);
    } else {
      if (effect == "treats") wound.status = "treated";
      wound.bleeding -= coagulation;
      wound.damage -= healing;

      this.actor.update({
        "system.health.value": Math.min(
          this.actor.system.health.max.value,
          this.actor.system.health.value + healing,
        ),
        "system.wounds": wounds,
      });
    }

    const details = {
      healing: healing,
      healingDice: medicine.healing,
      coagulation: coagulation,
      coagulationDice: medicine.coagulation,
      actor: this.actor.name,
      medicineName: medicineItem.name,
    };
    ChatServer.transmitEvent("MEDICINE", details, {
      speaker: { actor: this.actor.id },
    });
    medicineItem.useOne();
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