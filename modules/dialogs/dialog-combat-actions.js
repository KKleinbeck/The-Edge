import LocalisationServer from "../system/localisation_server.js";

export default class DialogCombatActions extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/combat-actions.html";
    const dialogHelpers = {
      strainLevel: ["No action", "No strain", "Strain L1", "Strain L2", "Strain L3"],
      descriptions: ["No strain", "Strain L1", "Strain L2", "Strain L3"],
      actions: ["First action", "Second action", "Third action"]
    }
    let html = await renderTemplate(template, dialogHelpers);
    let buttons = {
      select: {
        label: LocalisationServer.localise("submit", "dialog"),
        callback: async (html) => {
          const selections = html.find('[name="StrainSelector"]');
          const strains = []
          for (const selection of selections) {
            if ($(selection).val() == "0") continue;
            strains.push(+$(selection).val() - 1)
          }
          const communication = html.find('[name="communication"]').is(":checked");
          if (strains.length > 0) {
            checkData.actor.applyCombatStrain(strains, communication);
          }
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