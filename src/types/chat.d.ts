type rollType = "public" | "blind" | "whisper"

interface ChatServerConfig {
  roll?: rollType
  speaker?: ChatSpeakerData
}

// Specifics
interface IProficiencyRollMessage extends IRollResult, IRollPromptResult {
  dice: Record<string, number | string>[]
  proficiency: string
  strain: number
}