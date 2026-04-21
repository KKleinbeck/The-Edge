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

interface STRAIN {
  value: foundryAny
  max: foundryAny
  statusThreshold: foundryAny
  maxUseReduction: foundryAny
}

interface IWound {
  bodyPart: TBodyPart
  damage: number
}

// Helpers
interface IDamageBodyParts {
  arms: number
  legs: number
  torso: number
  head: number
}

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