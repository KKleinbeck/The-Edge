import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";

export default class DialogProficiency extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/proficienecy.html";
    let html = await renderTemplate(template, {});
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: (html) => {
          checkData.temporaryMod = parseInt(html.find('[name="Modifier"]').val());
          checkData.vantage = html.find('[name="AdvantageSelector"]').val();
          const rollType = Aux.parseRollType(html);
          checkData.actor.rollProficiencyCheck(checkData, rollType)
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
      title: LocalisationServer.localise(checkData.proficiency, "proficiency") + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}