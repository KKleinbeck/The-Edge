import LocalisationServer from "../system/localisation_server.js";
import ChatServer from "../system/chat_server.js";
import THE_EDGE from "../system/config-the-edge.js";

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
        callback: async (html) => {DialogGenericWound.start(checkData)}
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
          const value = parseInt(html.find('[name="value"]').val());
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
      default: "apply"
    }).render(true)
  }
}

class DialogGenericWound extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = `systems/the_edge/templates/dialogs/new-wound.html`;
    const details = {damageTypes: Object.keys(THE_EDGE.bleeding_threshold).filter(
      x => x != "fall" && x != "impact"
    )};
    let html = await renderTemplate(template, details);
    
    let buttons = {
      apply: {
        label: LocalisationServer.localise("apply"),
        callback: async (html) => {
          const damage = parseInt(html.find('[name="damage"]').val());
          const type = html.find('[name="type"]').val();
          var partialLog = await checkData.actor.applyDamage(
            damage, false, type, LocalisationServer.localise("New wound"), checkData.location
          );

          const protectionLog = {};
          for (const [key, value] of Object.entries(partialLog)) protectionLog[key] = [value];

          ChatServer.transmitEvent("Generic damage", {
            actor: checkData.actor.name, damage: damage,
            type: type, protection: protectionLog
          })
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogGenericWound({
      title: LocalisationServer.localise("New Wound"),
      content: html,
      buttons: buttons,
      default: "apply"
    }).render(true)
  }
}