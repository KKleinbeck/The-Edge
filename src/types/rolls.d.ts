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

interface _IRollActor {
  actor: foundryAny
  actorId: string
  tokenId?: string
  sceneId: string
}

// Attributes and Proficiencies
interface IAttributeRollQuery extends _IRollActor {
  attribute: string
}

interface IAttributePromptResult extends IAttributeRollQuery, IRollPromptResult {}

interface IProficiencyRollQuery extends _IRollActor{
  proficiency: string
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

interface IAttackRollQuery extends _IRollActor {
  damageRoll: string
  name: string
  targetId?: string
  threshold: number
  token: foundryAny
}

interface IAttackDiceParameters {
  critDice: number[]
  critFailDice: number[]
  critFailCheckThreshold: number
}

interface IDiceServerAttackConfig extends IAttackRollPrompt, IAttackDiceParameters {}