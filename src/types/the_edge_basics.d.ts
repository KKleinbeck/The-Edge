type Constructor<T = {}> = new (...args: any[]) => T;

type attribute = "end" | "str" | "spd" | "crd" | "cha" | "emp" | "foc" | "res" | "int"

type TBodyPart = "Torso" | "Head" | "LegsLeft" | "LegsRight" | "ArmsLeft" | "ArmsRight"
type TBodyPartCoarse = "Torso" | "Head" | "Legs" | "Arms"

type TCoordinate = [number, number]

type TWeapon = (
  "Blaster Pistols" | "Pulse Rifle" | "SABs" | "Blaster Shockguns" | "Blaster Snipers" |
  "General weapon proficiency" | "Hand-to-Hand combat" | "Recoilless Rifles" |
  "Kinetic Pistols" | "Slug Throwers" | "LMGs" | "Shotguns" | "Projectile Snipers"
)

type TWeaponType = "energy" | "general" | "kinetic"

interface Array<T> {
  random(): T;
  last(): T;
  sum(): T;
  variance(): T;
}

interface IModifier {
  group: string
  field: string
  value: number
}

// Helpers
type WithOptionals<T> = T & Record<string, any>