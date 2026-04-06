// Generics
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
  vantage: "Advantage" | "Disadvantage" | "Nothing"
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
  threshold: number
  total?: number
}

interface IRollPromptResult {
  strain: number
  modifier: number
  vantage: "Advantage" | "Disadvantage" | "Nothing"
  roll?: "public" | "blind" | "whisper"
}

// Attributes and Proficiencies
interface IAttributeRollQuery {
  attribute: attribute
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string // TODO: Scene IDs needed?
}

interface IProficiencyRollQuery {
  proficiency: string
  actor: foundryAny
  actorId: string
  tokenId: string
  sceneId: string // TODO: Scene IDs needed?
}

interface IProficiencyPromptResult extends IProficiencyRollQuery, IRollPromptResult {}
interface IProficiencyRollResult extends IProficiencyPromptResult, IRollResult {}