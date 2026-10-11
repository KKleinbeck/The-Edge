import LocalisationServer from "../../system/localisation_server.js";

import { ItemSheetGear } from "./gear.js";

export class ItemSheetLanguage extends ItemSheetGear {
  // Inherit Gear as a minimal interface
  async getCustomFooterBar() {
    return `<div style="display: flex; gap: 5px; align-items: center; white-space: nowrap">
      <label for="hasLevels">${LocalisationServer.localise("human spoken", "item")}</label>
        <input type="checkbox" id="hasLevels" name="system.humanSpoken"
          ${this.item.system.humanSpoken ? "checked" : ""} />
      </div>`;
  }
}