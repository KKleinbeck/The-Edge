import NewChatServer from "../system/new_chat_server.js";

const { renderTemplate } = foundry.applications.handlebars;

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
          const prompt: IAttackRollPrompt = {
            damageRoll: checkData.damage,
            nRolls: 1,
            threshold: modificators.threshold,
            vantage
          }
          const attackRollResult: IAttackRollResult = await checkData.actor.system.rollAttackCheck(prompt);

          // Apply the damage
          const details = {
            name: checkData.name, rolls: [{res: attackRollResult.diceResults[0], hit: attackRollResult.hits[0]}],
            damageRoll: modificators.fireModeModifier.damage, tempModificator: tempModificator, weaponType: "Melee",
            targetId: checkData.targetId, damageType: "kinetic", ...attackRollResult
          };
          foundry.utils.mergeObject(details, modificators);
          const config: IChatServerConfig = {
            speaker: {
              actor: checkData.actor.id,
              scene: checkData.sceneId,
              token: checkData.token.id
            }
          }
          NewChatServer.transmitEvent("WEAPON CHECK", details, config);
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