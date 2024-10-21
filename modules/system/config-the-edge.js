const THE_EDGE = {}

THE_EDGE.attrs = ["End", "Str", "Spd", "Crd", "Cha", "Emp", "Foc", "Res", "Int"]
THE_EDGE.weapon_types = [
  "Blaster Pistols", "Assault Blasters", "SABs", "Blaster Shockguns", "Blaster Rifles",
  "Kinetic Pistols", "Slug Throwers", "LMGs", "Shotguns", "Projectile Rifle",
  "Combatics", "Recoilless Rifles"
]
THE_EDGE.sizes = {"tiny": [-8, -4], "small": [-4, -2], "normal": [0, 0], "large": [2, 4], "giant": [4, 8]}
THE_EDGE.movements = {"stationary": [0, 0], "moderate": [-1, -1], "fast": [-2, -2], "erradic": [-4, -4]}

export default THE_EDGE