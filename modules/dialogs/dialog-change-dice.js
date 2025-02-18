import LocalisationServer from "../system/localisation_server.js";

export default class DialogChangeDice extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 50
    })
  }

  static async start(rollData) {
    let html = `<input name="newResult" type="number" value="${rollData.old}" style="text-align: right; margin-bottom: 5px">`
    const buttons = {
      roll: {
        label: LocalisationServer.localise("select", "dialog"),
        callback: (html) => rollData.update(parseInt(html.find('[name="newResult"]').val()))
      }
    }
    return new DialogChangeDice({
      title: LocalisationServer.localise("Change dice"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}