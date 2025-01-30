import LocalisationServer from "../system/localisation_server.js";

export default class DialogRest extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/rest.html";
    let html = await renderTemplate(template, checkData);
    let buttons = {
      rest: {
        label: LocalisationServer.localise("rest", "dialog"),
        callback: async (html) => {
          switch (checkData.type) {
            case "short rest":
              checkData.actor.shortRest();
              break;
            case "long rest":
              checkData.actor.longRest()
              break;
          }
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogRest({
      title: LocalisationServer.localise(checkData.type),
      content: html,
      buttons: buttons,
      default: "rest"
    }).render(true)
  }
}