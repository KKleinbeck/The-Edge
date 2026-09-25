import LocalisationServer from "./localisation_server.js";
export default class NotificationServer {
    static notify(options) {
        const msg = LocalisationServer.parsedLocalisation(options.id, options.group ?? "Notifications", options.details ?? {});
        ui.notifications.notify(msg);
    }
    static error(options) {
        const msg = LocalisationServer.parsedLocalisation(options.id, options.group ?? "Notifications", options.details ?? {});
        ui.notifications.error(msg);
    }
}
