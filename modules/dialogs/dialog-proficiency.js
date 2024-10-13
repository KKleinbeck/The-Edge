import DiceServer from "../system/dice_server.js";

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
          console.log(html.find('[name="Modifier"]').val())
          let check = {dices: checkData.dices};
          let modificators = {
            character: 0,
            temporary: html.find('[name="Modifier"]').val(),
            advantage: html.find('[name="Advantage"]').val()
          }
          DiceServer.proficiencyCheck(check, modificators)
        }
      }
    }
    if (game.user.isGM) {
      mergeObject(buttons, {
        cheat: {
          label: game.i18n.localize("DIALOG.CHEAT"),
          callback: (html) => console.log(html.find('[name="Modifier"]').val())
        }
      })
    }
    return new DialogProficiency({
      title: game.i18n.localize("PROFICIENCY." + checkData.name) + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}