import LocalisationServer from "../system/localisation_server.js";

export default class DialogDamage extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/damage.html";
    let html = await renderTemplate(template, checkData);
    
    let buttons = {
      select: {
        label: LocalisationServer.localise("apply"),
        callback: async (html) => {
          let damageType = html.find('[name="DamageSelector"]').val();
          let value = parseInt(html.find('[name="value"]').val());
          switch (damageType) {
            case "fall-damage":
              checkData.actor.applyFallDamage(value);
              break;
            case "impact-damage":
              checkData.actor.applyImpactDamage(value);
          }
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogDamage({
      title: LocalisationServer.localise("Apply Damage"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}