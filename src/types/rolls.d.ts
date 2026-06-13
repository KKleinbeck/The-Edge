// Generics
type TVantage = "Advantage" | "Disadvantage" | "Nothing"

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
  vantage: TVantage
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
  vantage: TVantage
  roll?: rollType
}

interface _IRollMeta {
  actor: foundryAny
  actorId: string
  tokenId?: string
  sceneId: string
  transmit?: boolean
}

// Attributes and Proficiencies
interface IAttributeRollQuery extends _IRollMeta {
  attribute: string
  modifier?: number
}

interface IAttributePromptResult extends _IRollMeta, IRollPromptResult {
  attribute: string
}

interface IProficiencyRollQuery extends _IRollMeta {
  proficiency: string
  modifier?: number
}

interface IProficiencyPromptResult extends _IRollMeta, IRollPromptResult {
  proficiency: string
}

// Combat
interface IAttackRoll {
  crit: boolean
  dieResult: number
  hit: boolean
}

interface IAttackRollResult {
  rolls: IAttackRoll[]
  damage: number[]
  failEvent: string
}

interface IAttackRollPrompt {
  damageRoll: string
  nRolls: number
  threshold: number
  vantage: TVantage
}

interface IAttackRollQuery extends _IRollMeta {
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