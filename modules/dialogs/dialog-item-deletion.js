import LocalisationServer from "../system/localisation_server.js";
import Aux from "../system/auxilliaries.js";

export default class DialogItemDeletion extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    let buttons = {
      yes: {
        label: LocalisationServer.localise("yes", "dialog"),
        callback: async (html) => {
          const item = checkData.item;
          const actor = checkData.actor;

          if (item.type = "Armour" && item.system.attachments) {
            if (item.system.layer == "Inner") {
              for (const attachmentData of item.system.attachments) {
                const attachment = actor.items.get(attachmentData.shellId);
                attachment.update({"system.equipped": false, "system.attachments": []});
              }
            } else if (item.system.equipped == true) {
              const parent = actor.items.get(item.system.attachments[0].armourId);
              await Aux.detachFromParent(parent, item._id, item.system.attachmentPoints.max);
            }
          }
          item.delete();
        }
      },
      cancel: {label: LocalisationServer.localise("cancel", "dialog")}
    }

    return new DialogItemDeletion({
      title: LocalisationServer.parsedLocalisation("delete item", "dialog", checkData.item),
      content: "",
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}
