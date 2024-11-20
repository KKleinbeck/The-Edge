import THE_EDGE from "./config-the-edge.js"

export default class Aux {
  static getScene(sceneID) {
      for (const _scene of game.scenes) {
          if (_scene._id === sceneID) return _scene
      }
      return undefined
  }

  static getTargets(scene, targetIDs) {
      const targets = []
      for (const token of scene.tokens) {
          if (targetIDs.includes(token.id.toUpperCase())) {
              targets.push(token.actor)
          }
      }
      return targets
  }

  static getProficiencyGroup(profName) {
    let map = THE_EDGE.effect_map["proficiencies"]
    for (const group of Object.keys(map)) {
        if (group === "all") continue;
        if (map[group].includes(profName)) return group;
    }
    return undefined;
  }

  static getWeaponGroup(weaponName) {
    let map = THE_EDGE.effect_map["weapons"]
    for (const group of Object.keys(map)) {
        if (group === "all") continue;
        if (map[group].includes(weaponName)) return group;
    }
    return undefined;
  }
}