import LocalisationServer from "../system/localisation_server.js";

export default class DialogCombatActions extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/combat-actions.html";
    const dialogHelpers = {
      strainLevel: ["No strain", "Strain L1", "Strain L2", "Strain L3"],
      actions: ["First action", "Second action", "Third action"]
    }
    let html = await renderTemplate(template, dialogHelpers);
    let buttons = {
      select: {
        label: LocalisationServer.localise("submit", "dialog"),
        callback: async (html) => {
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogCombatActions({
      title: LocalisationServer.localise("combat actions", "combat"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}