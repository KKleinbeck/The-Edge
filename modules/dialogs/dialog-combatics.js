import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";
import THE_EDGE from "../system/config-the-edge.js";
import Aux from "../system/auxilliaries.js";

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
            tempModificator: tempModificator
          };
          foundry.utils.mergeObject(details, modificators)
          for (const id of checkData.targetIds) {
            details["targetId"] = id;
            let target = Aux.getActor(undefined, id);
            await target.applyDamage(damage[0], crits[0], "HandToHand", checkData.name)
          }
          ChatServer.transmitEvent("CombaticsCheck", details);
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