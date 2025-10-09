import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class DialogMedicine extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    let medicine = checkData.medicineItem.system.subtypes.medicine;
    let effect = medicine.effect;
    let wounds = checkData.wounds.filter(x => x.system.status != "treated")

    const template = "systems/the_edge/templates/dialogs/medicine.html";
    let html = await renderTemplate(template, {"wounds": wounds});
    let buttons = {
      select: {
        label: game.i18n.localize("DIALOG.SELECT"),
        callback: async (html) => {
          let healing = (await DiceServer.genericRoll(medicine.healing));
          let coagulation = (await DiceServer.genericRoll(medicine.coagulation));
          
          let selectedID =  html.find('[name="WoundSelector"]').val();
          let wound = wounds.find(x => x.id == selectedID)
          if (!wound) return undefined;
          let damage = wound.system.damage;
          healing = Math.min(healing, damage);
          let bleeding = wound.system.bleeding;
          coagulation = Math.min(coagulation, bleeding)

          if (healing == damage && coagulation == bleeding) wound.delete();
          else {
            let woundStatus = wound.status;
            if (effect == "treats") woundStatus = "treated";
            wound.update({
              "system.damage": damage - healing, "system.bleeding": bleeding - coagulation,
              "system.status": woundStatus
            })
          }

          checkData.actor.update({
            "system.health.value": Math.min(
              checkData.actor.system.health.max.value, checkData.actor.system.health.value + healing
            )
          })

          ChatServer.transmitEvent("Medicine", {
            healing: healing, healingDice: medicine.healing,
            coagulation: coagulation, coagulationDice: medicine.coagulation,
            actor: checkData.actor.name, medicineName: checkData.medicineItem.name
          })
          checkData.medicineItem.useOne();
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