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

interface IProficiencyRollResult extends IProficiencyRollQuery{
  temporaryMod: number
  vantage: "Advantage" | "Disadvantage" | "Nothing"
}