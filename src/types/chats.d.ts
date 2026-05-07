interface IDetailsWeaponCheck extends IAttackRollQuery, IAttackRollResult {
  isMelee: boolean
  modifier: number
  name: string
  precision?: string
  strain?: number
  vantage: TVantage
}