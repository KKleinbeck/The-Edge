import DiceServer from "../system/dice_server.js";
import LocalisationServer from "../system/localisation_server.js";

export default class DialogProficiency extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/actors/proficiencies/dialog.html";
    let html = await renderTemplate(template, {});
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: (html) => {
          let check = {name: checkData.name, dices: checkData.dices, thresholds: checkData.thresholds};
          let modificators = {
            character: checkData.modificator,
            temporary: parseInt(html.find('[name="Modifier"]').val()),
            advantage: html.find('[name="AdvantageSelector"]').val()
          }
          DiceServer.proficiencyCheck(check, modificators)
        }
      }
    }
    if (game.user.isGM) {
      foundry.utils.mergeObject(buttons, {
        cheat: {
          label: game.i18n.localize("DIALOG.CHEAT"),
          callback: (html) => console.log(html.find('[name="Modifier"]').val())
        }
      })
    }
    return new DialogProficiency({
      title: LocalisationServer.localise(checkData.name, "proficiency") + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}