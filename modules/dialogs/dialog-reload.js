import ChatServer from "../system/chat_server.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class DialogReload extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/reload.html";
    const weaponSys = checkData.weapon.system;
    const filteredOptions = checkData.ammunitionOptions.filter(
      x => x.id !== weaponSys.ammunitionID
    );
    let html = await renderTemplate(template, {
      ammunition: filteredOptions,
      weaponReloadDuration: weaponSys.reloadDuration
    });

    const buttons = {}
    if (filteredOptions.length > 0) {
      foundry.utils.mergeObject(buttons, {
        select: {
          label: game.i18n.localize("DIALOG.SELECT"),
          callback: async (html) => {
            const selectedID = html.find('[name="AmmunitionSelector"]').val();
            const loadedID = weaponSys.ammunitionID;

            let reloadDuration = weaponSys.reloadDuration;
            for (const ammu of checkData.ammunitionOptions) {
              if (ammu.id == loadedID) {
                // If we currently have a mag loaded, we unload it
                ammu.update({"system.loaded": false});
                continue;
              }
              if (ammu.id == selectedID) {
                // Copy the ammuniation and load the weapon with it
                const created = await Item.create(ammu, {parent: checkData.actor})
                created.update({"system.loaded": true, "system.quantity": 1})
                await checkData.weapon.update({"system.ammunitionID": created.id})

                reloadDuration += ammu.system.reloadDuration;

                // Remove the copy from the existing item stack
                if (ammu.system.quantity == 1) {
                  await ammu.delete()
                } else ammu.update({"system.quantity": ammu.system.quantity - 1});
              }
            }
            
            ChatServer.transmitEvent("Reload", {details: {
              name: checkData.actor.name,
              weapon: checkData.weapon.name,
              actions: reloadDuration
            }})
          }
        }
      })
    }
    if (weaponSys.ammunitionID !== "") {
      foundry.utils.mergeObject(buttons, {
        empty: {
          label: game.i18n.localize("DIALOG.EMPTY"),
          callback: async (html) => {
            for (const ammu of checkData.ammunitionOptions) {
              if (ammu.id == weaponSys.ammunitionID) {
                // If we currently have a mag loaded, we unload it
                ammu.update({"system.loaded": false});
                checkData.weapon.update({"system.ammunitionID": ""})
                continue;
              }
            }
          }
        },
      })
    }
    foundry.utils.mergeObject(buttons, {
      cancel: {
        label: game.i18n.localize("DIALOG.CANCEL")
      }
    })

    return new DialogReload({
      title: game.i18n.localize("Reload"),
      content: html,
      buttons: buttons,
      default: "cancel"
    }).render(true)
  }
}