type foundryAny = any

declare const foundry: foundryAny
declare const game: foundryAny
declare const ui: foundryAny

// Applications
declare class FoundryHandlebarsApplication {
  _onRender(context: any, options: any): void

  public element: Element
}

// Documents
declare class Item {
  static implementation: foundryAny
}

// Sheets
interface IDEFAULT_OPTIONS {
  actions: any
}

declare class ActorSheetV2 extends FoundryHandlebarsApplication {
  constructor(args: foundryAny)
  static DEFAULT_OPTIONS: IDEFAULT_OPTIONS
  public actor: foundryAny
  public token: foundryAny
}

// Classes
declare class Dialog {
  constructor(options: foundryAny)
  static defaultOptions: foundryAny

  render(arg: foundryAny): foundryAny
}

// Functions
declare function getDocumentClass(x: string): foundryAny

// Mixins
declare function HandlebarsApplicationMixin<T>(x: T): T