import LocalisationServer from "./localisation_server.js";

interface INotificationOptions {
  id: string;
  group?: string;
  details?: Record<string, any>;
}

export default class NotificationServer {
  static notify(options: INotificationOptions) {
    const msg = LocalisationServer.parsedLocalisation(
      options.id,
      options.group ?? "Notifications",
      options.details ?? {},
    );
    ui.notifications.notify(msg);
  }

  static error(options: INotificationOptions) {
    const msg = LocalisationServer.parsedLocalisation(
      options.id,
      options.group ?? "Notifications",
      options.details ?? {},
    );
    ui.notifications.error(msg);
  }
}
