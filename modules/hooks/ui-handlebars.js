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
  })
}