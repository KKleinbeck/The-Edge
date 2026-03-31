declare class EffectModifier {
  getModifiers(_target: Element): IModifiersAndContext
}

interface IEffectOverview {
  name: string,
  value: number | string
}

interface IEffectModifier {
  group?: string
  field?: string
  value?: number | string
}

type EffectModifierMixinContext = any

interface IModifiersAndContext {
  modifiers: IEffectModifier[]
  context: EffectModifierMixinContext
}
