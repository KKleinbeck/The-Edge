export default function() {
  const definitions = {
    progressBar: {
      default: ["#4d0080", "#9900ff"],
      health: ["#2e7d32", "#4caf50"],
      heartRate: ["#0096c7", "#03045e"],
    }
  }

  Handlebars.registerHelper({
    progressBarColour: (i, a = undefined) => {
      if (a in definitions.progressBar) return definitions.progressBar[a][i];
      return definitions.progressBar.default[i]
    },
  })
}