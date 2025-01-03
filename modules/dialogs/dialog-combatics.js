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
            vantage: vantage, fireModeModifier: {damage: checkData.damage},
            dicesEff: 1
          }
          let [crits, damage, diceRes, hits] = await checkData.actor.rollAttackCheck(
            modificators.dicesEff, modificators.threshold, vantage, checkData.damage
          );

          // Apply the damage
          let details = {
            name: checkData.name, rolls: [], damage: damage, actorId: checkData.actor.id,
            damageRoll: modificators.fireModeModifier.damage, damageType: checkData.damageType,
            tempModificator: tempModificator
          };
          for (let i = 0; i < modificators.dicesEff; ++i) {
            details.rolls.push({res: diceRes[i], hit: hits[i]})
          }
          foundry.utils.mergeObject(details, modificators)
          for (const id of checkData.targetIDs) {
            details["targetId"] = id;
            let target = Aux.getActor(undefined, id);
            for (let i = 0; i < damage.length; ++i){
              await target.applyDamage(damage[i], crits[i], checkData.damageType, checkData.name)
            }
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