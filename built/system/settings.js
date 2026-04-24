import LocalisationServer from "./localisation_server.js";
export default function setupGameSettings() {
    // Register system settings
    game.settings.register("the_edge", "macroShorthand", {
        name: "SETTINGS.SimpleMacroShorthandN",
        hint: "SETTINGS.SimpleMacroShorthandL",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });
    // Register initiative setting.
    game.settings.register("the_edge", "initFormula", {
        name: "SETTINGS.SimpleInitFormulaN",
        hint: "SETTINGS.SimpleInitFormulaL",
        scope: "world",
        type: String,
        default: "1d20 + 1d@spd + 1d@foc - 2",
        config: true,
        onChange: formula => _simpleUpdateInit(formula, true)
    });
    const initFormula = game.settings.get("the_edge", "initFormula");
    _simpleUpdateInit(initFormula);
    // Show a licence Dialog
    LicenceDialog.prepareContent();
    game.settings.registerMenu("the_edge", "licences", {
        name: "SETTINGS.LICENCES",
        label: "SETTINGS.LICENCES_SHOW",
        hint: "A description of what will occur in the submenu dialog.",
        icon: "fa-solid fa-bars",
        type: LicenceDialog,
        restricted: false
    });
}
function _simpleUpdateInit(formula, notify = false) {
    const isValid = Roll.validate(formula);
    if (!isValid) {
        if (notify) {
            ui.notifications.error(`${game.i18n.localize("SIMPLE.NotifyInitFormulaInvalid")}: ${formula}`);
        }
        return;
    }
    CONFIG.Combat.initiative.formula = formula;
}
class LicenceDialog extends foundry.applications.api.DialogV2 {
    CONTENT = "";
    constructor() {
        super({
            window: { title: LocalisationServer.localise("licences", "settings") },
            position: { width: 640, height: 400 },
            content: LicenceDialog.CONTENT,
            buttons: [{ label: LocalisationServer.localise("close") }]
        });
    }
    static async prepareContent() {
        const licences = {
            "Lucius Cipher": await LicenceDialog.readLocalFile("fonts/LicenseLucius.txt"),
            "Titlillium Web": await LicenceDialog.readLocalFile("fonts/OFL.txt")
        };
        LicenceDialog.CONTENT = `<div style="max-height: 280px; overflow-y: scroll">`;
        for (const [name, licence] of Object.entries(licences)) {
            LicenceDialog.CONTENT += `<h3>${name}</h3>`;
            LicenceDialog.CONTENT += this.scrollableBox(licence);
        }
        LicenceDialog.CONTENT += `</div>`;
    }
    static async readLocalFile(localPath) {
        const path = "../../systems/the_edge/" + localPath;
        return await fetch(path).then((res) => res.text());
    }
    static scrollableBox(text) {
        let scrollableElement = `
      <div style="height: 100px; overflow-y: scroll; border: 3px solid black;
        border-radius: 8px; padding: 4px;"
      >
      ${text.replaceAll("\n", "</br>")}
      </div>
    `;
        return scrollableElement;
    }
}
