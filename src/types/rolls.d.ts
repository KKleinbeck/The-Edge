// Generics
type vantageType = "Advantage" | "Disadvantage" | "Nothing"

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
  vantage: vantageType
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
  vantage: vantageType
  roll?: rollType
}

// Attributes and Proficiencies
interface IAttributeRollQuery {
  attribute: string
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string // TODO: Scene IDs needed?
}

interface IAttributePromptResult extends IAttributeRollQuery, IRollPromptResult {}

interface IProficiencyRollQuery {
  proficiency: string
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string // TODO: Scene IDs needed?
}

interface IProficiencyPromptResult extends IProficiencyRollQuery, IRollPromptResult {}