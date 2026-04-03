// ----------------------------------------
// Effect Modifier
declare class EffectModifier {
  getModifiers(_target: Element): IModifiersAndContext
  updateModifiers(modifiers: IEffectModifier[], context: EffectModifierMixinContext): Promise<void>;
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

// ----------------------------------------
// Slider Modifier
declare class Slider {

}