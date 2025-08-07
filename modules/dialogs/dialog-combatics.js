import LocalisationServer from "../system/localisation_server.js";
import ChatServer from "../system/chat_server.js";

export default class DialogCombatics extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    const template = "systems/the_edge/templates/dialogs/combatics.html";
    let html = await renderTemplate(template, checkData);
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: async (html) => {
          const tempModificator = parseInt(html.find('[name="Modifier"]').val());
          const vantage = html.find('[name="VantageSelector"]').val();

          // Roll the attack
          const modificators = {
            threshold: Math.max(1, tempModificator + checkData.threshold),
            vantage: vantage, fireModeModifier: {damage: checkData.damage}
          }
          let [crits, damage, diceRes, hits] = await checkData.actor.rollAttackCheck(
            1, modificators.threshold, vantage, checkData.damage
          );

          // Apply the damage
          let details = {
            name: checkData.name, rolls: [{res: diceRes[0], hit: hits[0]}], damage: damage,
            actorId: checkData.actor.id, damageRoll: modificators.fireModeModifier.damage,
            tempModificator: tempModificator, weaponType: "Melee", targetId: checkData.targetId,
            sceneId: checkData.sceneId, crits: crits, damageType: "kinetic"
          };
          foundry.utils.mergeObject(details, modificators)
          ChatServer.transmitEvent("WeaponCheck", details);

          // Append to strainLog
          const hrChange = checkData.actor.getHrChangeFromStrain(1);
          if (game.combat) {
            game.the_edge.combatLog.addAction(
              LocalisationServer.localise("Weapon attack"), hrChange
            );
          } else {
            checkData.actor.applyStrains([hrChange]);
          }
        }
      },
      cancel: {
        label: game.i18n.localize("DIALOG.CANCEL")
      }
    }
    if (game.user.isGM) {
      foundry.utils.mergeObject(buttons, {
        cheat: {
          label: game.i18n.localize("DIALOG.CHEAT"),
          callback: (html) => console.log(html.find('[name="Modifier"]').val())
        }
      })
    }
    return new DialogCombatics({
      title: checkData.name + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}