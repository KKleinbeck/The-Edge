import DiceServer from "../system/dice_server.js";
import THE_EDGE from "../system/config-the-edge.js";

export default class DialogWeapon extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    let distance = this.getDistance(checkData.actorID, checkData.targetIDs, checkData.sceneID)
    let smallestSize =  this.getSmallestSize(checkData.targetIDs, checkData.sceneID)
    checkData = mergeObject(checkData, {
      sizes: THE_EDGE.sizes, movements: THE_EDGE.movements,
      distance: distance, smallestSize: smallestSize
    })
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
          if (distance) {
            if (distance < 2) range = "less_2m";
            else if (distance < 20) range = "less_20m";
            else if (distance < 200) range = "less_200m";
            else if (distance < 1000) range = "less_1km";
            else range = "more_1km";
          }
          let size = html.find('[name="SizeSelector"]').val();
          if (smallestSize) size = smallestSize;
          let movement = html.find('[name="MovementSelector"]').val();
          let fireMode = html.find('[name="FireSelector"]').val();

          let threshold = checkData.threshold + tempModificator +
            checkData.rangeChart[range][pIndex] + THE_EDGE.sizes[size][pIndex] +
            THE_EDGE.movements[movement][pIndex] + checkData.fireModes[fireMode].mali[pIndex];
          
          this.getDistance(checkData.actorID, checkData.targetIDs, checkData.sceneID)

          let check = {
            name: checkData.name,
            threshold: threshold,
            sceneID: checkData.sceneID,
            targetIDs: checkData.targetIDs
          };
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

  static getDistance(actorID, targetIDs, sceneID) {
    // get the scene
    let scene = undefined;
    for (const _scene of game.scenes) {
      if (_scene.id == sceneID) {
        scene = _scene;
        break;
      }
    }
    if (scene === undefined) return undefined;

    // get the involved actors
    const actorPos = []
    const targetPos = []
    for (const token of scene.tokens) {
      if (token.actorId == actorID) {
        actorPos.push(token.x, token.y)
      }
      if (targetIDs.includes(token._id.toUpperCase())) {
        targetPos.push([token.x, token.y])
      }
    }
    if (actorPos.length == 0 || targetPos.length == 0) return undefined;

    // determine distance
    let factor = scene.grid.distance / scene.grid.size
    let distances = []
    for (const tp of targetPos) {
      distances.push(factor * Math.hypot(actorPos[0] - tp[0], actorPos[1] - tp[1]))
    }

    return Math.max(...distances)
  }

  static getSmallestSize(targetIDs, sceneID) {
    // get the scene
    let scene = undefined;
    for (const _scene of game.scenes) {
      if (_scene.id == sceneID) {
        scene = _scene;
        break;
      }
    }
    if (scene === undefined) return undefined;

    // get the involved actors
    let smallest = Infinity
    for (const token of scene.tokens) {
      if (targetIDs.includes(token._id.toUpperCase())) {
        smallest = Math.min(smallest, THE_EDGE.sizes[token.actor.system.size][0])
      }
    }
    if (smallest === Infinity) return undefined;
    return Object.keys(THE_EDGE.sizes).find(key => THE_EDGE.sizes[key][0] === smallest)
  }
}