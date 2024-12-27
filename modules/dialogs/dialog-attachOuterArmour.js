import LocalisationServer from "../system/localisation_server.js";

export default class DialogArmourAttachment extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/armour-attachment.html";
    let html = await renderTemplate(template, checkData);

    const buttons = {
      select: {
        label: LocalisationServer.localise("select", "dialog"),
        callback: async (html) => {
          let armourId = html.find('[name="ArmourSelector"]').val();
          checkData.actor.attachOuterArmour(armourId, checkData.shellId, checkData.tokenId)
        }
      },
      cancel: {
        label: LocalisationServer.localise("cancel", "dialog"),
      }
    }

    return new DialogArmourAttachment({
      title: LocalisationServer.localise("Armour attachment", "combat"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}