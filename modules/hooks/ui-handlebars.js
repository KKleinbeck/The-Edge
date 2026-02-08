import LocalisationServer from "../system/localisation_server.js";

export default function() {
  const definitions = {
    progressBar: {
      armour: ["#4d0080", "#9900ff", "#cb69e9ff"],
      counter: ["#af9308", "#d6b40a", "#ddbd1dff"],
      default: ["#6366f1", "#3b82f6", "#00f5ff"],
      health: ["#2e7d32", "#4caf50", "#53c24fff"],
      heartRate: ["#0096c7", "#03045e", "#0e023bff"],
    }
  }

  Handlebars.registerHelper({
    progressBarColour: (i, a = undefined) => {
      if (a in definitions.progressBar) return definitions.progressBar[a][i];
      return definitions.progressBar.default[i]
    },
    getWoundHTML: (wound, longTooltip = false) => {
      const colour = wound.system.bleeding > 0 ? "red" : "orange";
      let icon = undefined;
      switch (wound.system.status) {
        case "treatable":
          icon = "fa-regular fa-droplet";
          break;
        // case "coagulated":
        //   icon = "fa-regular fa-droplet-slash";
        //   break;
        case "treated":
          icon = "fa-light fa-bandage";
          break;
      }
      let tooltip = "";
      if (longTooltip) {
        tooltip = wound.name + " - " +
          LocalisationServer.localise(wound.system.status, "item") + " - " +
          `${wound.system.damage} ` + LocalisationServer.localise("Damage") +
          ` - ${wound.system.bleeding}` + LocalisationServer.localise("Bleeding")
      } else {
        tooltip = LocalisationServer.localise(wound.system.status, "item");
      }
      const coords = wound.system.coordinates;
      return `
        <div class="${colour}-dot" style="left: ${coords[0]}%; top: ${coords[1]}%;"></div>
        <div class="dot-label" data-tooltip aria-label="${tooltip}"
          style="left: ${coords[0]}%; top: ${coords[1]}%; will-change: transform;">
          <i class="${icon}"></i>
        </div>
      `;
    },
  })
}