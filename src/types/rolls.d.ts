interface IRollPromptResult {
  strain: number
  modifier: number
  vantage: "Advantage" | "Disadvantage" | "Nothing"
  roll?: "public" | "blind" | "whisper"
}

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