import LocalisationServer from "../system/localisation_server.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

type TMappedWounds = Record<number, IWound>;

interface IOptions {
  position: Record<string, number>;
  window: Record<string, any>;
  content: string;
  ok: any;
  close: any;
  mappedWounds: TMappedWounds;
}

export default class DialogMedicine extends DialogV2 {
  declare selectedWound: IDialogMedicineResult;
  declare mappedWounds: TMappedWounds;

  constructor(options: IOptions) {
    super(options);
    
    this.selectedWound = {woundIndex: -1, source: ""};
    this.mappedWounds = options.mappedWounds;
  }

  static get DEFAULT_CONFIG() {
    return {
      position: { width: 270 },
      window: { title: LocalisationServer.localise("Select wound", "dialog") }
    };
  }

  static async prompt(details: IDialogMedicineDetails, config: foundryAny = {}): Promise<IDialogMedicineResult> {
    const mappedWounds = {};
    details.wounds.forEach((x: IWound, index: number) => mappedWounds[index] = x);

    config.content = await DialogMedicine._setupContent(mappedWounds);
    config.ok = DialogMedicine._setupCallback();
    config.close = (): IDialogMedicineResult => { return {woundIndex: -1, source: ""} };
    config.mappedWounds = mappedWounds;
    return await super.prompt(
      foundry.utils.mergeObject(this.DEFAULT_CONFIG, config),
    );
  }

  static async _setupContent(mappedWounds: TMappedWounds): Promise<string> {
    const template = "systems/the_edge/templates/dialogs/medicine.hbs";
    return await renderTemplate(template, {mappedWounds});
  }

  static _setupCallback() {
    return {
      label: LocalisationServer.localise("Select", "dialog"),
      callback: (_event, _button, dialog: DialogMedicine): Partial<IDialogMedicineResult> => {
        return dialog.selectedWound;
      },
    };
  }

  async render(options?: foundryAny): Promise<DialogV2> {
    const dialog = await super.render(options) as DialogMedicine;

    dialog.#attachWoundSelectionHooks();

    const bodyPartSelector = this.element.querySelector("#bodyPartSelector")
    if (bodyPartSelector instanceof HTMLSelectElement) {
      bodyPartSelector?.addEventListener("change", async () => {
        const woundOverview = dialog.element.querySelector(".wound-overview-hook");
        if (!(woundOverview instanceof HTMLDivElement)) return;

        if (bodyPartSelector.value == "all") {
          woundOverview.outerHTML = await dialog.#renderWoundOverview(dialog.mappedWounds);
        } else {
          const selectedWounds: TMappedWounds = {};
          for (const [index, wound] of Object.entries(dialog.mappedWounds)) {
            if (wound.bodyPart.includes(bodyPartSelector.value)) {
              selectedWounds[index] = wound;
            }
          }
          woundOverview.outerHTML = await dialog.#renderWoundOverview(selectedWounds);
        }

        dialog.#attachWoundSelectionHooks();
      });
    }

    return dialog;
  }

  #attachWoundSelectionHooks() {
    this.element.querySelectorAll(".wound-selection-hook").forEach((x: Element) => {
      x.addEventListener("click", () => {
        if (!(x instanceof HTMLElement)) return;

        this.selectedWound = {
          woundIndex: +(x.dataset.index ?? -1),
          source: x.dataset.source ?? LocalisationServer.localise("Unknown Wound", "dialog")
        };

        const selectedWoundElement = this.element.querySelector(".selected-wound-hook");
        if (!(selectedWoundElement instanceof HTMLElement)) return;
        selectedWoundElement.innerHTML = this.selectedWound.source;
      });
    });
  }

  async #renderWoundOverview(mappedWounds: TMappedWounds) {
    const template = "systems/the_edge/templates/dialogs/medicine-wound-overview.hbs";
    return await renderTemplate(template, {mappedWounds});
  }
}
