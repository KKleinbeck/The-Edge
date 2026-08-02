type Constructor<T = {}> = new (...args: any[]) => T;

type attribute = "end" | "str" | "spd" | "crd" | "cha" | "emp" | "foc" | "res" | "int"

type TBodyPart = "Torso" | "Head" | "LegsLeft" | "LegsRight" | "ArmsLeft" | "ArmsRight"
type TBodyPartCoarse = "Torso" | "Head" | "Legs" | "Arms"

type TCoordinate = [number, number]

type TCover = "no cover" | "half cover" | "three quarters" | "full cover"

type TDistance = ("less_2m" | "less_20m" | "less_200m" | "less_1km" | "more_1km")

type TEventNames = (
  "rollAttackCheck-Prior" | "rollAttackCheck-Posterior" |
  "rollAttributeCheck-Prior" | "rollAttributeCheck-Posterior" |
  "rollMeleeCheck-Prior" | "rollMeleeCheck-Posterior" |
  "rollProficiencyCheck-Prior" | "rollProficiencyCheck-Posterior" |
  "onRest"
)

type TMovement = "stationary" | "moderate" | "fast" | "erradic"

type TPrecision = "aimed" | "unaimed"

type TSize = "tiny" | "small" | "normal" | "large" | "giant"

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

interface IEffect {
  name: string
  modifiers: IModifier[]
  active?: boolean
}

interface IModifier {
  group: string
  field: string
  value: number | string
}

// Helpers
type WithOptionals<T> = T & Record<string, any>

// Hooks
type TTheEdgeActionType = "attribute check" | "combatics" | "equip" | "proficiency check" | "reload" | "skill" |
  "unequip" | "weapon check" | "weapon check aimed"

interface ITheEdgeActionPayload {
  action?: string
  actionCost: number
  actionType: TTheEdgeActionType
  actor: Actor
  strainCost?: number
  details?: any
}