export default class DialogReload extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    console.log(checkData.ammunition)
    const template = "systems/the_edge/templates/actors/combat/dialog-ammunition.html";
    let html = await renderTemplate(template, checkData);
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: async (html) => {
        }
      }
    }
    return new DialogReload({
      title: game.i18n.localize("Reload"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}