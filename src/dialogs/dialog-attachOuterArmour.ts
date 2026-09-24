import LocalisationServer from "../system/localisation_server.js";

const { renderTemplate } = foundry.applications.handlebars;

const { DialogV2 } = foundry.applications.api;
export default class DialogArmourAttachment extends DialogV2 {
  static async start(checkData) {
    const template =
      "systems/the_edge/templates/dialogs/armour-attachment.hbs";
    let html = await renderTemplate(template, checkData);

    return await this.input({
      window: { title: LocalisationServer.localise("target armour", "dialog") },
      content: html,
      ok: { label: LocalisationServer.localise("select", "dialog") }
    });
  }
}
