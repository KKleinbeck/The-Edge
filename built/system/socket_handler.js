import GrenadePicker from "../applications/grenades-picker.js";
import { TheEdgeStoreSheet } from "../actors/store-sheet.js";
export class SocketHandler {
    constructor() {
        this.identifier = "system.the_edge";
        this.registerSocketHandlers();
    }
    registerSocketHandlers() {
        game.socket.on(this.identifier, ({ type, payload }) => {
            console.log(type, payload);
            switch (type) {
                case "COMBAT_LOG_ADD_ACTION":
                    this.#addAction(payload);
                    break;
                case "COMBAT_LOG_CHANGE_MOVEMENT_INDEX":
                    this.#changeMovementIndex(payload);
                    break;
                case "COMBAT_LOG_UNDO_ACTION":
                    this.#undoAction(payload);
                    break;
                // Grenade related
                case "CREATE_GRENADE_TILE":
                    if (game.user.isGM)
                        GrenadePicker.createGrenadeTile(payload);
                    break;
                // Store related
                case "BUY_OR_RETRIEVE":
                    if (game.user.isGM)
                        TheEdgeStoreSheet.handleBuyOrRetrieve(payload);
                    break;
                case "SELL_OR_STORE":
                    if (game.user.isGM)
                        TheEdgeStoreSheet.handleSellOrStore(payload);
                    break;
                case "ITEM_SOLD_OR_STORED":
                    const scene = game.scenes.get(payload.sceneId);
                    const store = scene.tokens.get(payload.storeId)?.actor ?? game.actors.get(payload.storeId);
                    const actor = scene.tokens.get(payload.tokenId).actor;
                    if (actor.isOwner)
                        store.render(true);
                    break;
                // Other actions
                default:
                    throw new Error('unknown type: ' + type);
            }
        });
    }
    emit(type, payload) {
        return game.socket.emit(this.identifier, { type, payload });
    }
    #addAction(payload) {
        game.the_edge.combatLog.addAction(payload);
        ui.combat.render();
    }
    #changeMovementIndex(movementIndex) {
        game.the_edge.combatLog.movementIndex = movementIndex;
        ui.combat.render();
    }
    #undoAction(index) {
        game.the_edge.combatLog.strainLog.splice(index, 1);
    }
}
