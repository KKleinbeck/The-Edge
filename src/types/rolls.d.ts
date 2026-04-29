// Generics
type VantageType = "Advantage" | "Disadvantage" | "Nothing"

interface IDiceParameters {
  critDice: number[]
  critBonus: number
  critDieBonus: number

  critFailDice: number[]
  critFailMalus: number
  critFailDieMalus: number
  critFailEvents: ICritFailEvent[]

  qualityStep: number
}

interface IDiceServerConfig extends IDiceParameters {
  modifier: number
  threshold: number
  vantage: VantageType
}

interface ICritFailEvent {
  name: string
  frequency: number
}

interface IRollResult {
  critFailEvent?: string
  outcome: "CritSuccess" | "CritFailure" | "Success" | "Failure"
  quality: number
  rolls: number[]
  effectiveThreshold: number
  total?: number
}

interface IRollPromptResult {
  strain: number
  modifier: number
  vantage: VantageType
  roll?: rollType
}

// Attributes and Proficiencies
interface IAttributeRollQuery {
  attribute: string
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string
}

interface IAttributePromptResult extends IAttributeRollQuery, IRollPromptResult {}

interface IProficiencyRollQuery {
  proficiency: string
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string
}

interface IProficiencyPromptResult extends IProficiencyRollQuery, IRollPromptResult {}

// Combat
interface IAttackRollPreResult {
  crits: boolean[]
  diceResults: number[]
  hits: boolean[]
}

interface IAttackRollResult extends IAttackRollPreResult {
  damage: number[]
  failEvent: string
}

interface IAttackRollPrompt {
  damageRoll: string
  nRolls: number
  threshold: number
  vantage: VantageType
}

interface IDiceServerAttackConfig extends IAttackRollPrompt {
  critDice: number[]
  critFailDice: number[]
  critFailCheckThreshold: number
}