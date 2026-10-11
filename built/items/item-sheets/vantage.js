import LocalisationServer from "../../system/localisation_server.js";
import { ItemSheetGear } from "./gear.js";
export class ItemSheetVantage extends ItemSheetGear {
    // Inherit Gear as a minimal interface
    async getCustomFooterBar() {
        return `
      <div style="display: flex; gap: 5px; align-items: center; white-space: nowrap">
        <input class="item-footer-input" type="number" name="system.AP" value="${this.item.system.AP}" data-dtype="Number" id="AP"/>
        <label for="AP" data-tooltip aria-label="${LocalisationServer.localise("AdvantagePoints")}"
          style="margin-right: 5px;">
          AP
        </label>
        <input class="item-footer-input" type="number" name="system.level" value="${this.item.system.level}" data-dtype="Number"/>
        <input class="item-footer-input" type="number" name="system.maxLevel" value="${this.item.system.maxLevel}" data-dtype="Number"/>
        ${LocalisationServer.localise("Level")}
      </div>`;
    }
}
