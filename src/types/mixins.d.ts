// ----------------------------------------
// Effect Modifier
declare class EffectModifier {
  getModifiers(_target: Element): IModifiersAndContext
  updateModifiers(modifiers: IModifier[], context: EffectModifierMixinContext): Promise<void>;
}

interface EffectModifierStatics {
  _createModifier(event: Event, target: Element): void
  _deleteModifier(event: Event, target: Element): void
}

interface IEffectOverview {
  name: string,
  value: number | string
}

type EffectModifierMixinContext = any

interface IModifiersAndContext {
  modifiers: IModifier[]
  context: EffectModifierMixinContext
}

// ----------------------------------------
// Icon Selector
declare class IconSelector {
  updateIcons(iconType: string, details: Record<string, IIconSelected>, dynamicValue: string)
}

interface IIconSelected {
  selected: boolean
}

// ----------------------------------------
// Range Chart Selector
declare class RangeChartSelector {
  static _selectRange(event: Event, target: Element)
}

// ----------------------------------------
// Slider Modifier
interface SliderInstance {
  getSliderValues(): Record<string, number>
}
interface SliderStatic {
  getSliderValuesFromElement(element: Element): Record<string, number | string>
}

interface ISliderContext {
  id: string
  max: number
  min: number
  title: string
  value: number
  isDynamic: boolean | number

  _orig_min: number
  _orig_max: number
}