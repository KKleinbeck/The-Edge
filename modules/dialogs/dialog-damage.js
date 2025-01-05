import LocalisationServer from "../system/localisation_server.js";

export default class DialogDamage extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/new-damage.html";
    let html = await renderTemplate(template, checkData);
    
    let buttons = {
      fall: {
        label: LocalisationServer.localise("fall damage"),
        callback: async (html) => {DialogFallAndImpact.start(checkData, "fall")}
      },
      impact: {
        label: LocalisationServer.localise("impact damage"),
        callback: async (html) => {DialogFallAndImpact.start(checkData, "impact")}
      },
      wound: {
        label: LocalisationServer.localise("General wound"),
        callback: async (html) => {
          let [location, locationCoord] = checkData.actor._generateLocation(false, checkData.location);
          checkData.actor.generateNewWound(
            LocalisationServer.localise("New Wound"), location, locationCoord, 0, 0
          ) 
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

class DialogFallAndImpact extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData, type) {
    const template = `systems/the_edge/templates/dialogs/${type}-damage.html`;
    let html = await renderTemplate(template, checkData);
    
    let buttons = {
      apply: {
        label: LocalisationServer.localise("apply"),
        callback: async (html) => {
          let value = parseInt(html.find('[name="value"]').val());
          switch (type) {
            case "fall":
              checkData.actor.applyFallDamage(value, checkData.location);
              break;
            case "impact":
              checkData.actor.applyImpactDamage(value, checkData.location);
          }
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogFallAndImpact({
      title: LocalisationServer.localise("Apply Damage"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}