import GrenadePicker from "../applications/grenades-picker.js";

export class SocketHandler {
    constructor() {
    this.identifier = "system.the_edge";
    this.registerSocketHandlers();
  }

  registerSocketHandlers() {
    game.socket.on(this.identifier, ({ type, payload }) => {
      switch (type) {
        // Combat Log related
        case "ADD_TO_COMBAT_LOG":
          this.#addToCombatLog(payload);
          break;
        case "ADD_DISTANCE_TRAVELLED":
          this.#addDistanceTravelled(payload);
          break;
        case "CHANGE_DISTANCE_TRAVELLED":
          this.#changeDistanceTravelled(payload);
          break;
        case "CHANGE_MOVEMENT_INDEX":
          this.#changeMovementIndex(payload);
          break;
        case "END_TURN":
          this.#endTurn();
          break;
        case "UNDO_ACTION":
          this.#undoAction(payload);
          break;
        
        // Grenade related
        case "CREATE_GRENADE_TILE":
          GrenadePicker.createGrenadeTile(
            payload.proficiencyRoll, payload.rollOutcome, payload.token,
            payload.checkData, payload.targetPosition
          );
          break;
        
        // Other actions
        default:
          throw new Error('unknown type: ' + type);
      }
    })
  }

  emit(type, payload) {
    return game.socket.emit(this.identifier, { type, payload })
  }

  #addToCombatLog(entry) {
    game.the_edge.combatLog.strainLog.push(entry);
    game.the_edge.combatLog.render();
  }

  #addDistanceTravelled(distance) {
    game.the_edge.combatLog.distance += distance;
    game.the_edge.combatLog.render();
  }

  #changeDistanceTravelled(distance) {
    game.the_edge.combatLog.distance = distance;
    game.the_edge.combatLog.render();
  }

  #changeMovementIndex(movementIndex) {
    game.the_edge.combatLog.movementIndex = movementIndex;
    game.the_edge.combatLog.render();
  }

  #endTurn() {
    game.the_edge.combatLog.distance = 0;
    game.the_edge.combatLog.movementIndex = 0;
    game.the_edge.combatLog.strainLog = [];
  }

  #undoAction(index) {
    game.the_edge.combatLog.strainLog.splice(index, 1);
    game.the_edge.combatLog.render();
  }
}