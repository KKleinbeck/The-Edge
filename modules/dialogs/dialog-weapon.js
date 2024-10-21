import DiceServer from "../system/dice_server.js";
import THE_EDGE from "../system/config-the-edge.js";
import LocalisationServer from "../system/localisation_server.js";

export default class DialogWeapon extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    checkData = mergeObject(checkData, {sizes: THE_EDGE.sizes, movements: THE_EDGE.movements})
    const template = "systems/the_edge/templates/actors/combat/dialog-weapon.html";
    let html = await renderTemplate(template, checkData);
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: (html) => {
          let precision =  html.find('[name="PrecisionSelector"]').val();
          let pIndex = precision == "aimed" ? 1 : 0;
          let tempModificator = parseInt(html.find('[name="Modifier"]').val()); 
          let range = html.find('[name="RangeSelector"]').val();
          let size = html.find('[name="SizeSelector"]').val();
          let movement = html.find('[name="MovementSelector"]').val();
          let fireMode = html.find('[name="FireSelector"]').val();

          let threshold = checkData.threshold + tempModificator +
            checkData.rangeChart[range][pIndex] + THE_EDGE.sizes[size][pIndex] +
            THE_EDGE.movements[movement][pIndex] + checkData.fireModes[fireMode].mali[pIndex];

          let check = {name: checkData.name, threshold: threshold};
          let modificators = {
            temporary: tempModificator,
            advantage: html.find('[name="AdvantageSelector"]').val(),
            range: {selection: range, modifier: checkData.rangeChart[range][pIndex]},
            size: {selection: size, modifier: THE_EDGE.sizes[size][pIndex]},
            movement: {selection: movement, modifier: THE_EDGE.movements[movement][pIndex]},
            fireMode: fireMode,
            fireModeModifiers: checkData.fireModes[fireMode],
            precision: precision,
            pIndex: pIndex
          }
          DiceServer.attackCheck(check, modificators)
        }
      }
    }
    if (game.user.isGM) {
      mergeObject(buttons, {
        cheat: {
          label: game.i18n.localize("DIALOG.CHEAT"),
          callback: (html) => console.log(html.find('[name="Modifier"]').val())
        }
      })
    }
    return new DialogWeapon({
      title: checkData.name + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }
}