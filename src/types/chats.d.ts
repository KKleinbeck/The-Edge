interface IDetailsWeaponCheck extends IAttackRollQuery, IAttackRollResult {
  damageType: TDamageTypes
  isMelee: boolean
  modifier: number
  name: string
  precision?: string
  strain?: number
  vantage: TVantage
}