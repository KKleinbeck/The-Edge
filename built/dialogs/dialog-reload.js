import Aux from "../system/auxilliaries.js";
const { renderTemplate } = foundry.applications.handlebars;
export default class DialogReload extends Dialog {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 300,
        });
    }
    static async start(checkData) {
        const template = "systems/the_edge/templates/dialogs/reload.html";
        const weaponSys = checkData.weapon.system;
        const html = await renderTemplate(template, {
            ammunition: checkData.ammunitionOptions,
            weaponReloadDuration: weaponSys.reloadDuration,
        });
        const buttons = {};
        if (checkData.ammunitionOptions.length > 0) {
            foundry.utils.mergeObject(buttons, {
                select: {
                    label: game.i18n.localize("DIALOG.SELECT"),
                    callback: async (html) => {
                        if (weaponSys.ammunitionID)
                            Aux.unloadAmmunition(checkData.weapon, checkData.actor);
                        const selectedID = html.find('[name="AmmunitionSelector"]').val();
                        let reloadDuration = weaponSys.reloadDuration;
                        for (const ammu of checkData.ammunitionOptions) {
                            if (ammu.id == selectedID) {
                                // Copy the ammuniation and load the weapon with it
                                const created = await Item.create(ammu, {
                                    parent: checkData.actor,
                                });
                                created.update({ "system.loaded": true, "system.quantity": 1 });
                                await checkData.weapon.update({
                                    "system.ammunitionID": created.id,
                                });
                                reloadDuration += ammu.system.reloadDuration;
                                ammu.useOne();
                            }
                        }
                        Hooks.call("TheEdgeAction", {
                            action: "reload",
                            actionType: "reload",
                            actor: checkData.actor,
                            actionCost: reloadDuration,
                            details: { weapon: checkData.weapon.name },
                        });
                    },
                },
            });
        }
        if (weaponSys.ammunitionID !== "") {
            foundry.utils.mergeObject(buttons, {
                empty: {
                    label: game.i18n.localize("DIALOG.EMPTY"),
                    callback: async (_html) => {
                        Aux.unloadAmmunition(checkData.weapon, checkData.actor);
                    },
                },
            });
        }
        foundry.utils.mergeObject(buttons, {
            cancel: {
                label: game.i18n.localize("DIALOG.CANCEL"),
            },
        });
        return new DialogReload({
            title: game.i18n.localize("Reload"),
            content: html,
            buttons: buttons,
            default: "cancel",
        }).render(true);
    }
}
