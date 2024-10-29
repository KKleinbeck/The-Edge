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
}