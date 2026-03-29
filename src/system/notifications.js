import LocalisationServer from "./localisation_server.js";

export default class NotificationServer {
  static notify(id, details = {}) {
    const msg = LocalisationServer.parsedLocalisation(
      id, "Notifications", details
    )
    ui.notifications.notify(msg)
  }
}