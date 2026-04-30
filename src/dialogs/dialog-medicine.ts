import DiceServer from "../system/dice_server.js";
import NewChatServer from "../system/new_chat_server.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class DialogMedicine extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData: IDialogMedicineData) {
    const medicine = checkData.medicineItem.system.subtypes.medicine;
    const effect = medicine.effect;
    const wounds = checkData.wounds.filter(x => x.status != "treated")

    const template = "systems/the_edge/templates/dialogs/medicine.hbs";
    const html = await renderTemplate(template, {"wounds": wounds});
    const buttons = {
      select: {
        label: game.i18n.localize("DIALOG.SELECT"),
        callback: async (html) => {
          const index: number = html.find('[name="WoundSelector"]').val();
          if (index >= wounds.length) return undefined;

          const wound = wounds[index];
          let healing: number = await DiceServer.genericRoll(medicine.healing);
          healing = Math.min(healing, wound.damage);
          let coagulation: number = await DiceServer.genericRoll(medicine.coagulation);
          coagulation = Math.min(coagulation, wound.bleeding);

          if (healing == wound.damage && coagulation == wound.bleeding) {
            checkData.actor.system.deleteWound(index);
          } else {
            if (effect == "treats") wound.status = "treated";
            wound.bleeding -= coagulation;
            wound.damage -= healing;

            checkData.actor.update({
              "system.health.value": Math.min(
                checkData.actor.system.health.max.value, checkData.actor.system.health.value + healing
              ),
              "system.wounds": wounds
            })
          }

          const details = {
            healing: healing, healingDice: medicine.healing,
            coagulation: coagulation, coagulationDice: medicine.coagulation,
            actor: checkData.actor.name, medicineName: checkData.medicineItem.name
          };
          NewChatServer.transmitEvent("MEDICINE", details, {speaker: {actor: checkData.actor.id}});
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