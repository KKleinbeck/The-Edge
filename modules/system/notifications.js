import LocalisationServer from "./localisation_server.js";

export default class NotificationServer {
  static notify(id, details = {}) {
    switch(id) {
      case "Requires GM":
        const msg = LocalisationServer.parsedLocalisation(
          "Requires GM", "Notifications", details
        )
        ui.notifications.notify(msg)
        break;
    }
  }
}