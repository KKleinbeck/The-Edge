const THE_EDGE = {}

THE_EDGE.attrs = ["End", "Str", "Spd", "Crd", "Cha", "Emp", "Foc", "Res", "Int"]
THE_EDGE.weapon_types = [
  "Blaster Pistols", "Pulse Rifle", "SABs", "Blaster Shockguns", "Blaster Rifles",
  "Kinetic Pistols", "Slug Throwers", "LMGs", "Shotguns", "Projectile Rifle",
  "Combatics", "Recoilless Rifles"
]
THE_EDGE.sizes = {"tiny": [-8, -4], "small": [-4, -2], "normal": [0, 0], "large": [2, 4], "giant": [4, 8]}
THE_EDGE.movements = {"stationary": [0, 0], "moderate": [-1, -1], "fast": [-2, -2], "erradic": [-4, -4]}
THE_EDGE.body_parts = ["Torso", "Arms", "Legs", "Below_Neck", "Head", "Entire"]
THE_EDGE.languages = ["Standard", "Digita", "Kublar", "Shii"]

export default THE_EDGE