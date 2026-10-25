import LocalisationServer from "../system/localisation_server.js";


const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

export default class DialogMedicine extends DialogV2 {
  static get DEFAULT_CONFIG() {
    return {
      position: { width: 350, height: 160 },
      window: { title: LocalisationServer.localise("Select wound", "dialog") }
    };
  }

  static async prompt(details: IDialogMedicineDetails, config: foundryAny = {}): Promise<IDialogMedicineResult> {
    config.content = await DialogMedicine._setupContent(details);
    config.ok = DialogMedicine._setupCallback();
    config.close = (): IDialogMedicineResult => { return {woundIndex: -1} };
    return await super.prompt(
      foundry.utils.mergeObject(this.DEFAULT_CONFIG, config),
    );
  }

  static async _setupContent(details: IDialogMedicineDetails): Promise<string> {
    const template = "systems/the_edge/templates/dialogs/medicine.hbs";
    return await renderTemplate(template, details);
  }

  static _setupCallback() {
    return {
      label: LocalisationServer.localise("Select", "dialog"),
      callback: (_event, _button, dialog: DialogMedicine): Partial<IDialogMedicineResult> => {
        const woundElement = dialog.element.querySelector("#woundSelector");
        if (!(woundElement instanceof HTMLSelectElement)) return {woundIndex: -1};

        return {woundIndex: +woundElement.value};
      },
    };
  }
}
