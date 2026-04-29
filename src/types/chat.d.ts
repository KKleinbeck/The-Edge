type rollType = "public" | "blind" | "whisper"

type ChatId = (
  "ATTRIBUTE CHECK" | "CRIT FAIL EVENT" | "FALL" | "FIRING EMPTY WEAPON" |  "FOOD CONSUME" |
  "GENERIC DAMAGE" | "GRENADE SHEET BASED" | "GRENADE CONTEXT BASED" | "HERO TOKEN" |
  "IMPACT" | "MEDICINE" | "POST ITEM" | "POST SKILL" | "PROFICIENCY CHECK" | "RELOAD" |
  "REROLL" | "SHORT REST" | "LONG REST" | "SKILL USED" | "WEAPON CHECK"
)

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