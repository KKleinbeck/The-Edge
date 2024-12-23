import DiceServer from "../system/dice_server.js";
import ChatServer from "../system/chat_server.js";
import THE_EDGE from "../system/config-the-edge.js";
import Aux from "../system/auxilliaries.js";

export default class DialogWeapon extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    let distance = this.getDistance(checkData.actor.id, checkData.targetIDs, checkData.sceneID)
    let smallestSize =  this.getSmallestSize(checkData.targetIDs, checkData.sceneID)
    checkData = foundry.utils.mergeObject(checkData, {
      sizes: THE_EDGE.sizes, movements: THE_EDGE.movements,
      distance: distance, smallestSize: smallestSize, cover: THE_EDGE.cover
    })
    const template = "systems/the_edge/templates/dialogs/weapon.html";
    let html = await renderTemplate(template, checkData);
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: async (html) => {
          let modificators = this.parseSheet(html, checkData)

          // Subtract ammunition and determine effective dices
          let ammuCapa = checkData.ammunition.system.capacity
          let dices = Math.min(
            checkData.fireModes[modificators.fireMode].dices,
            ammuCapa.max - ammuCapa.used
          )
          checkData.ammunition.update({"system.capacity.used": ammuCapa.used + dices})

          // Roll the attack
          let scene = Aux.getScene(checkData.sceneID)
          let targets = Aux.getTargets(scene, checkData.targetIDs)
          foundry.utils.mergeObject(modificators, {dicesEff: dices})
          let [crits, damage, diceRes, hits] = await DiceServer.attackCheck(modificators);

          // Apply the damage
          let details = {
            name: checkData.name, rolls: [], damage: damage, actorId: checkData.actorId,
            damageRoll: modificators.fireModeModifier.damage, damageType: checkData.damageType
          };
          for (let i = 0; i < modificators.dicesEff; ++i) {
            details.rolls.push({res: diceRes[i], hit: hits[i]})
          }
          foundry.utils.mergeObject(details, modificators)
          for (const target of targets) {
            details["targetId"] = target.id
            for (let i = 0; i < damage.length; ++i){
              await target.applyDamage(damage[i], crits[i], checkData.damageType, checkData.name)
            }
          }
          ChatServer.transmitEvent("WeaponCheck", details);
        }
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

  static parseSheet(html, checkData) {
    let precision =  html.find('[name="PrecisionSelector"]').val();
    let pIndex = precision == "aimed" ? 1 : 0;
    let tempModificator = parseInt(html.find('[name="Modifier"]').val()); 
    let range = html.find('[name="RangeSelector"]').val();
    if (checkData.distance) {
      if (checkData.distance < 2) range = "less_2m";
      else if (checkData.distance < 20) range = "less_20m";
      else if (checkData.distance < 200) range = "less_200m";
      else if (checkData.distance < 1000) range = "less_1km";
      else range = "more_1km";
    }
    let size = html.find('[name="SizeSelector"]').val();
    if (checkData.smallestSize) size = checkData.smallestSize;
    let movement = html.find('[name="MovementSelector"]').val();
    let cover = html.find('[name="CoverSelector"]').val();
    let fireMode = html.find('[name="FireSelector"]').val();

    let threshold = Math.max(1, checkData.threshold + tempModificator +
      checkData.rangeChart[range][pIndex] + THE_EDGE.sizes[size][pIndex] +
      THE_EDGE.movements[movement][pIndex] + THE_EDGE.cover[cover] +
      checkData.fireModes[fireMode].mali[pIndex]);
    
    return {
      threshold: threshold, precision: precision, pIndex: pIndex,
      tempModificator: tempModificator, range: range, size: size,
      movement: movement, cover: cover, fireMode: fireMode,
      advantage: html.find('[name="AdvantageSelector"]').val(),
      rangeModifier: checkData.rangeChart[range][pIndex],
      sizeModifier: THE_EDGE.sizes[size][pIndex],
      movementModifier: THE_EDGE.movements[movement][pIndex],
      coverModifier: THE_EDGE.cover[cover],
      fireModeModifier: checkData.fireModes[fireMode],
    }
  }
}