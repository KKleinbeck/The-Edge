const THE_EDGE = {}

// IMPORTANT: Multiple config entries are dynamically generated from the template.json.
//   This happens in the Hooks.on("init").

THE_EDGE.sizes = {"normal": [0, 0], "tiny": [-8, -4], "small": [-4, -2],  "large": [2, 4], "giant": [4, 8]}
THE_EDGE.movements = {"stationary": [0, 0], "moderate": [-1, -1], "fast": [-2, -2], "erradic": [-4, -4]}
THE_EDGE.cover = {"no cover": 0, "half cover": -2, "three quarters": -4, "full cover": -20}
THE_EDGE.body_parts = ["Torso", "Arms", "Legs", "Below_Neck", "Head", "Entire"]
THE_EDGE.consumables_subtypes = ["Food", "Grenade", "SkinPack", "FleshPack", "Drugs", "Generic"]
THE_EDGE.wounds_pixel_coords = {
  "female": {
    "Head":      {"coords": [[47.0, 8.0], [47.0, 8.0]], "radius":  5},
    "Torso":     {"coords": [[47.0,22.0], [47.0,45.0]], "radius": 10},
    "ArmsLeft":  {"coords": [[23.5,23.0], [14.5,46.0]], "radius":  1},
    "ArmsRight": {"coords": [[71.0,23.0], [80.0,46.0]], "radius":  1},
    "LegsLeft":  {"coords": [[33.5,57.0], [32.5,84.0]], "radius":  1},
    "LegsRight": {"coords": [[62.0,57.0], [63.0,84.0]], "radius":  1}
  },
  "male": {
    "Head":      {"coords": [[47.0, 8.0], [47.0, 8.0]], "radius":  5},
    "Torso":     {"coords": [[47.0,22.0], [47.0,45.0]], "radius": 15},
    "ArmsLeft":  {"coords": [[21.5,23.0], [12.5,46.0]], "radius":  1},
    "ArmsRight": {"coords": [[73.0,23.0], [82.0,46.0]], "radius":  1},
    "LegsLeft":  {"coords": [[30.5,57.0], [28.5,84.0]], "radius":  1},
    "LegsRight": {"coords": [[65.0,57.0], [67.0,84.0]], "radius":  1}
  }
}
THE_EDGE.bleeding_threshold = {
  "energy": 25, "kinetic": 10, "elemental": 50, "fall": 15, "impact": 15, "HandToHand": 25
}
THE_EDGE.medicine_effects = ["heals", "treats"]
THE_EDGE.wound_status = ["treatable", "treated"]
THE_EDGE.injury_map = {"torso": "end", "head": "foc", "arms": "crd", "legs": "spd"}

// Entries below are primarily implemented in the_edge.js
THE_EDGE.core_value_map = {attributes: {}, proficiencies: {}, weapons: {}}
THE_EDGE.effect_map = {
  attributes: {all: []}, proficiencies: {all: []}, weapons: {all: []}, statusEffects: {}, others: {}
}

export default THE_EDGE