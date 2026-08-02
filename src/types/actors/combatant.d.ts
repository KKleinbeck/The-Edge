interface IFApplyDamage {
  crit: boolean
  damage: number
  damageType: TDamageTypes
  givenLocation?: TBodyPartCoarse
  name: string
  penetration: number
}

interface IRestDescription {
  coagulationDice: string
  healingDice: string
  type: "short rest" | "long rest"
}