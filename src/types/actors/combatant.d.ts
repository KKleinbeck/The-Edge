interface IFApplyDamage {
  crit: boolean
  damage: number
  damageType: TDamageTypes
  givenLocation?: TBodyPartCoarse
  name: string
  penetration: number
}