import LocalisationServer from "../system/localisation_server.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

export default class DialogRest extends DialogV2 {
  static get DEFAULT_CONFIG() {
    return {
      position: { width: 300, height: 100 },
    };
  }

  static async prompt(details: IDialogRestDetails, config: foundryAny = {}): Promise<IDialogRestResult> {
    config.content = ""
    config.ok = {
      callback: (): IDialogRestResult => { return {confirm: true} },
      label: LocalisationServer.localise("rest", "dialog")
    };
    config.close = (): IDialogRestResult => { return {confirm: false} };
    config.window = { title: LocalisationServer.localise(details.type) };
    return await super.prompt(
      foundry.utils.mergeObject(this.DEFAULT_CONFIG, config),
    );
  }
}
