interface ATTRIBUTES {
  end: foundryAny
  str: foundryAny
  spd: foundryAny
  crd: foundryAny
  cha: foundryAny
  emp: foundryAny
  foc: foundryAny
  res: foundryAny
  int: foundryAny
}

interface GENERAL_MODIFIERS {
  painThreshold: foundryAny
  overloadThreshold: foundryAny
}

interface HEALTH {
  value: foundryAny
  max: foundryAny
}

interface PROFICIENCIES {
  environmental: foundryAny
  knowledge: foundryAny
  mental: foundryAny
  physical: foundryAny
  social: foundryAny
  technical: foundryAny
}

type TSex = "female" | "male" | "other"

interface STRAIN {
  value: foundryAny
  max: foundryAny
  statusThreshold: foundryAny
  maxUseReduction: foundryAny
}

interface IWeapons {
  energy: IWeaponsEnergy
  general: IWeaponsGeneral
  kinetic: IWeaponsKinetic
}

interface IWeaponsEnergy {
  "Blaster Pistols": foundryAny
  "Pulse Rifle": foundryAny
  "SABs": foundryAny
  "Blaster Shockguns": foundryAny
  "Blaster Snipers": foundryAny
}

interface IWeaponsGeneral {
  "General weapon proficiency": foundryAny
  "Hand-to-Hand combat": foundryAny
  "Recoilless Rifles": foundryAny
}

interface IWeaponsKinetic {
  "Kinetic Pistols": foundryAny
  "Slug Throwers": foundryAny
  "LMGs": foundryAny
  "Shotguns": foundryAny
  "Projectile Snipers": foundryAny
}

interface IWound {
  bleeding: number
  bodyPart: TBodyPart
  coordinates: TCoordinate
  damage: number
  status: TWoundStatus
  type: TWoundType
}

type TWoundStatus = "treatable" | "treated"
type TWoundType = "abrasion" | "fracture" | "laceration" | "light burn" | "strong burn"

// Helpers
interface IDamageBodyParts {
  arms: number
  legs: number
  torso: number
  head: number
}

type TDamageTypes = "energy" | "elemental" | "fall" | "HandToHand" | "impact" | "kinetic"

interface IStatusEffectTemplate {
  nameID: string
  isActive: boolean | number
  modFunction: Function
}

interface IStatusEffect {
  name: string
  level: number | undefined
  modifiers: IModifier[]
}

interface IWoundDetails {
  bleeding: number
  bodyPart: TBodyPart
  coordinates: TCoordinate
  damage: number
  damageType: TDamageTypes
  source: string
}