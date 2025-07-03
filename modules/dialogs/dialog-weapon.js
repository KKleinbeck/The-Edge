import ChatServer from "../system/chat_server.js";
import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";

export default class DialogWeapon extends Dialog{
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300
    })
  }

  static async start(checkData) {
    checkData["distance"] = this.getDistance(checkData.token, checkData.targetIds, checkData.sceneId);
    checkData["smallestSize"] =  this.getSmallestSize(checkData.targetIds, checkData.sceneId);
    const templateParams = foundry.utils.mergeObject(
      {sizeModifiers: THE_EDGE.sizeModifiers, movements: THE_EDGE.movements, cover: THE_EDGE.cover},
      checkData
    );
    const template = "systems/the_edge/templates/dialogs/weapon.html";
    let html = await renderTemplate(template, templateParams);
    const buttons = {
      roll: {
        label: game.i18n.localize("DIALOG.ROLL"),
        callback: async (html) => {
          const modificators = this.parseSheet(html, checkData)
          foundry.utils.mergeObject(checkData, modificators)

          // Subtract ammunition and determine effective dices
          const ammuCapa = checkData.ammunition.system.capacity;
          if (ammuCapa.max <= ammuCapa.used) {
            ChatServer.transmitEvent("Firing empty weapon", {name: checkData.actor.name});
            return;
          }

          const ammuCost = Math.min(
            modificators.fireModeModifier.cost,
            ammuCapa.max - ammuCapa.used
          );
          const dices = Math.floor(
            (ammuCost + 0.1) * 
            modificators.fireModeModifier.dices /
            modificators.fireModeModifier.cost
          );
          checkData.ammunition.update({"system.capacity.used": ammuCapa.used + ammuCost});

          // Roll the attack
          foundry.utils.mergeObject(modificators, {dicesEff: dices})
          const [crits, damage, diceRes, hits, failEvents] = await checkData.actor.rollAttackCheck(
            dices, modificators.threshold, modificators.vantage, modificators.fireModeModifier.damage,
            checkData.damageType
          );
          foundry.utils.mergeObject(checkData, {
            damage: damage, crits: crits, damageRoll: modificators.fireModeModifier.damage
          })

          // Apply the damage
          checkData.rolls = []
          for (let i = 0; i < modificators.dicesEff; ++i) {
            checkData.rolls.push({res: diceRes[i], hit: hits[i]})
          }
          for (const id of checkData.targetIds) {
            checkData["targetId"] = id;
            ChatServer.transmitEvent("WeaponCheck", checkData);
          }
          if (checkData.targetIds.length == 0) { ChatServer.transmitEvent("WeaponCheck", checkData) }
          
          for (const event of failEvents) {
            ChatServer.transmitEvent("Crit Fail Event", {event: event, check: "Combat check"})
          }

          // Append to strain_log
          const hrChange = checkData.actor.getHrChangeFromStrain(1);
          game.the_edge.combat_log.addAction(
            LocalisationServer.localise("Weapon attack"),
            hrChange
          );
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
    return new DialogWeapon({
      title: checkData.name + " " + game.i18n.localize("CHECK"),
      content: html,
      buttons: buttons,
      default: "roll"
    }).render(true)
  }

  static getDistance(aggressor, targetIds, sceneId) {
    // get the scene
    const scene = game.scenes.get(sceneId);
    if (scene === undefined) return undefined;

    const targetPos = targetIds.map(id => {
      const token = scene.tokens.get(id);
      return [token.x, token.y];
    })
    const aggressorPos = [aggressor.x, aggressor.y];
    if (targetPos.length == 0) return undefined;

    // determine distance
    const factor = scene.grid.distance / scene.grid.size
    const distances = []
    for (const tp of targetPos) {
      distances.push(factor * Math.hypot(aggressorPos[0] - tp[0], aggressorPos[1] - tp[1]))
    }

    return Math.max(...distances)
  }

  static getSmallestSize(targetIds, sceneId) {
    // get the scene
    let scene = game.scenes.get(sceneId);

    // get the involved actors
    let smallest = Infinity;
    let targets = targetIds.map(id => scene.tokens.get(id));
    for (const target of targets) {
      smallest = Math.min(smallest, target.actor.system.height)
    }
    if (smallest === Infinity) return undefined;
    return Object.entries(THE_EDGE.sizes).find(([_, value]) => value > smallest)[0];
  }

  static parseSheet(html, checkData) {
    const precision =  html.find('[name="PrecisionSelector"]').val();
    const pIndex = precision == "aimed" ? 1 : 0;
    const tempModificator = parseInt(html.find('[name="Modifier"]').val()); 
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
    const movement = html.find('[name="MovementSelector"]').val();
    const cover = html.find('[name="CoverSelector"]').val();
    let fireMode = html.find('[name="FireSelector"]').val();
    if (fireMode === undefined && checkData.fireModes.length === 1) { // When we do not offer a drop down menu
      fireMode = checkData.fireModes[0].name;
    }
    let fireModeIndex = checkData.fireModes.findIndex((x) => x.name === fireMode);

    let threshold = Math.max(1, checkData.threshold + tempModificator +
      checkData.rangeChart[range][pIndex] + THE_EDGE.sizeModifiers[size][pIndex] +
      THE_EDGE.movements[movement][pIndex] + THE_EDGE.cover[cover] +
      checkData.fireModes[fireModeIndex].precisionPenalty[pIndex]);
    
    return {
      threshold: threshold, precision: precision, pIndex: pIndex,
      tempModificator: tempModificator, range: range, size: size,
      movement: movement, cover: cover, fireMode: fireMode,
      vantage: html.find('[name="VantageSelector"]').val(),
      rangeModifier: checkData.rangeChart[range][pIndex],
      sizeModifier: THE_EDGE.sizeModifiers[size][pIndex],
      movementModifier: THE_EDGE.movements[movement][pIndex],
      coverModifier: THE_EDGE.cover[cover],
      fireModeModifier: checkData.fireModes[fireModeIndex],
    }
  }
}