import DiceServer from "../system/dice_server.js";import LocalisationServer from "../system/localisation_server.js";

export default class DialogAttribute extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/attributes.html";
    let html = await renderTemplate(template, {});
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: (html) => {
          let temporaryMod = parseInt(html.find('[name="Modifier"]').val());
          let advantage = html.find('[name="AdvantageSelector"]').val();
          checkData.actor.rollAttributeCheck(checkData.attribute, temporaryMod, advantage);
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
    return new DialogAttribute({
      title: LocalisationServer.localise(checkData.attribute, "attr") + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}