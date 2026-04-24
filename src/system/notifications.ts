import LocalisationServer from "./localisation_server.js";

export default class NotificationServer {
  static notify(id: string, details: Record<string, any> = {}) {
    const msg = LocalisationServer.parsedLocalisation(
      id, "Notifications", details
    );
    ui.notifications.notify(msg);
  }
}