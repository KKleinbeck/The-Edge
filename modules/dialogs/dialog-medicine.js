import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";

export default class DialogMedicine extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    let medicine = checkData.medicineItem.system.subtypes.medicine;
    let effect = medicine.effect;
    let wounds = checkData.wounds.filter(x => x.system.status != "sealed")
    if (effect === "heals") wounds = wounds.filter(x => x.system.status == "open");

    const template = "systems/the_edge/templates/actors/health/dialog-medicine.html";
    let html = await renderTemplate(template, {"wounds": wounds});
    let buttons = {
      select: {
        label: game.i18n.localize("DIALOG.SELECT"),
        callback: async (html) => {
          let healing = (await DiceServer._genericRoll(medicine.healing)).reduce((a,b) => a+b, 0);
          let coagulation = (await DiceServer._genericRoll(medicine.coagulation)).reduce((a,b) => a+b, 0);
          
          let selectedID =  html.find('[name="WoundSelector"]').val();
          let wound = wounds.find(x => x.id == selectedID)
          let damage = wound.system.damage;
          healing = Math.min(healing, damage);
          let bleeding = wound.system.bleeding;
          coagulation = Math.min(coagulation, bleeding)

          if (healing == damage && coagulation == bleeding) wound.delete();
          else {
            let woundStatus = wound.status;
            if (effect == "seals") woundStatus = "sealed";
            else if (effect == "coagulates") woundStatus = "coagulated";
            wound.update({
              "system.damage": damage - healing, "system.bleeding": bleeding - coagulation,
              "system.status": woundStatus
            })
          }

          checkData.actor.update({
            "system.health.value": Math.min(
              checkData.actor.system.health.max, checkData.actor.system.health.value + healing
            )
          })

          if (checkData.medicineItem.system.quantity == 1) {
            await checkData.medicineItem.delete()
          } else checkData.medicineItem.update({"system.quantity": checkData.medicineItem.system.quantity - 1});

          ChatServer.transmitRoll("Medicine", {
            healing: healing, healingDice: medicine.healing,
            coagulation: coagulation, coagulationDice: medicine.coagulation,
            actor: checkData.actor.name, medicineName: checkData.medicineItem.name
          })
        }
      },
      cancel: {
        label: game.i18n.localize("DIALOG.CANCEL")
      }
    }

    return new DialogMedicine({
      title: game.i18n.localize("Apply Medicine"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}