import LocalisationServer from "../system/localisation_server.js";

export default function () {
  const definitions = {
    progressBar: {
      armour: ["#4d0080", "#9900ff", "#cb69e9ff"],
      counter: ["#af9308", "#d6b40a", "#ddbd1dff"],
      default: ["#6366f1", "#3b82f6", "#00f5ff"],
      health: ["#2e7d32", "#4caf50", "#53c24fff"],
      strain: ["#fc8414", "#c7411f", "rgb(160, 17, 17)"],
    },
  };

  Handlebars.registerHelper({
    progressBarColour: (i: number, a: string | undefined = undefined) => {
      if ((a as string) in definitions.progressBar)
        return definitions.progressBar[a as string][i];
      return definitions.progressBar.default[i];
    },
    getWoundIcon: (status: string) => {
      switch (status) {
        case "treatable":
          return "fa-droplet";
        // case "coagulated":
        //   return "fa-droplet-slash";
        case "treated":
          return "fa-bandage";
      }
    },
    getWoundHTML: (wound: IWound, longTooltip: boolean = false) => {
      const colour = wound.bleeding > 0 ? "red" : "orange";
      let icon: string = "";
      switch (wound.status) {
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
        tooltip =
          wound.source +
          " - " +
          LocalisationServer.localise(wound.status, "item") +
          " - " +
          `${wound.damage} ` +
          LocalisationServer.localise("Damage") +
          ` - ${wound.bleeding} ` +
          LocalisationServer.localise("Bleeding");
      } else {
        tooltip = wound.source + " &mdash; " + LocalisationServer.localise(wound.type, "combat") +
          " &mdash; " + LocalisationServer.localise(wound.status, "item");
      }
      return `
        <div class="${colour}-dot"></div>
        <div class="dot-label" data-tooltip aria-label="${tooltip}" style="will-change: transform;">
          <i class="${icon}" style="color: ${colour}"></i>
        </div>
      `;
    },
    getWoundAnnotationHTML: (wound: IWound, index: number): string => {
      const rightOffset = wound.bodyPart == "Head" ? 36 : 18;
      const topOffset = wound.coordinates[1];
      const colour = wound.bleeding > 0 ? "red" : "orange";
      const tooltip = wound.source + " &mdash; " + LocalisationServer.localise(wound.type, "combat") +
        " &mdash; " + LocalisationServer.localise(wound.status, "item");

      return `
        <div class="wound-hook wound-annotation" style="right: ${rightOffset}%; top: ${topOffset}%; color: ${colour}"
          data-tooltip aria-label="${tooltip}" data-action="woundControl" data-subaction="edit" data-index="${index}">
          D&thinsp;${wound.damage} &ndash; B&thinsp;${wound.bleeding}
          <a title="${LocalisationServer.localise("Delete", "item")}" data-action="woundControl" data-subaction="delete">
            <i class="fas fa-trash"></i>
          </a>
        </div>
      `;
    },
    getWoundDialogHTML: (wound: IWound, index: string, selectedIndex: number): string => {
      const topOffset = wound.coordinates[1];
      const colour = wound.bleeding > 0 ? "red" : "orange";
      const tooltip = wound.source + " &mdash; " + LocalisationServer.localise(wound.type, "combat") +
        " &mdash; " + LocalisationServer.localise(wound.status, "item");
      
      const selected = index == String(selectedIndex) ? "selected" : "";

      return `
        <div class="wound-selection-hook wound-annotation ${selected}"
          style="right: 0%; top: ${topOffset}%; color: ${colour}"
          data-tooltip aria-label="${tooltip}"  data-index="${index}" data-source="${wound.source}">
          D&thinsp;${wound.damage} &ndash; B&thinsp;${wound.bleeding}
        </div>
      `;
    },
    uiConsumablesHeaderHeight: (type: string): number => {
      // if (type === "drugs" || type === "food" || type === "generic") return 29;
      if (type === "medicine") return 80;
      return 29;
    }
  });
}
