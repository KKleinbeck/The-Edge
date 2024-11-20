const THE_EDGE = {}

// IMPORTANT: Multiple config entries are dynamically generated from the template.json.
//   This happens in the Hooks.on("init").

THE_EDGE.sizes = {"tiny": [-8, -4], "small": [-4, -2], "normal": [0, 0], "large": [2, 4], "giant": [4, 8]}
THE_EDGE.movements = {"stationary": [0, 0], "moderate": [-1, -1], "fast": [-2, -2], "erradic": [-4, -4]}
THE_EDGE.body_parts = ["Torso", "Arms", "Legs", "Below_Neck", "Head", "Entire"]

THE_EDGE.effect_map = {
  attributes: {
    physical: ["end", "str", "spd", "crd"],
    social: ["cha", "emp"],
    mental: ["foc", "res", "int"]
  },
  proficiencies: {all: []},
  weapons: {all: []}
}

export default THE_EDGE