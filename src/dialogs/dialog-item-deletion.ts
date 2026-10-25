import LocalisationServer from "../system/localisation_server.js";

const { DialogV2 } = foundry.applications.api;

interface IItemDeletionDetails {name: string}
interface IItemDeletionResult {delete: boolean}

export default class DialogItemDeletion extends DialogV2 {
  static get DEFAULT_CONFIG() {
    return {
      position: { width: 200, height: 100 },
    };
  }

  static async wait(details: IItemDeletionDetails, config: Record<string, any> = {}): Promise<IItemDeletionResult> {
    config.buttons = [
      {
        action: "yes",
        callback: (): IItemDeletionResult => {return {delete: true}},
        label: LocalisationServer.localise("Yes", "Dialog"),
      },
      {
        action: "cancel",
        callback: (): IItemDeletionResult => { return {delete: false} },
        label: LocalisationServer.localise("Cancel", "Dialog"),
      }
    ]
    config.close = (): IItemDeletionResult => { return {delete: false} };
    config.window = { title: LocalisationServer.parsedLocalisation("Delete Item", "dialog", details) };

    return await super.wait(
      foundry.utils.mergeObject(this.DEFAULT_CONFIG, config),
    );
  }
}
