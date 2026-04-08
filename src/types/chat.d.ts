type rollType = "public" | "blind" | "whisper"

interface IChatServerConfig {
  roll?: rollType
  speaker?: ChatSpeakerData
}

interface IChatSystem {
  details: Record<string, any>
  config: IChatServerConfig
}

// Specifics
interface IDiceThreshold {
  name: string
  threshold: number
}

interface IAttributeRollMessage extends IRollResult, IRollPromptResult {
  attributeValue: number
  attribute: string
  diceServerConfig: IDiceServerConfig
}

interface IProficiencyRollInterpretationBase {
  description: string
}
type IProficiencyRollInterpretation = WithOptionals<IProficiencyRollInterpretationBase>

interface IProficiencyRollMessage extends IRollResult, IRollPromptResult {
  dice: IDiceThreshold[]
  proficiency: string
  strain: number
  diceServerConfig: IDiceServerConfig
  interpretation?: IProficiencyRollInterpretation
}

// Hooks
interface IContextMenuHookConfig {
  actor: foundryAny
  chatMsgCls: foundryAny
  html: string
  system: IChatSystem
}