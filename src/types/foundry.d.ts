type foundryAny = any

declare const foundry: IFoundry
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

  public _prepareContext(options: foundryAny): foundryAny
  public render(options: foundryAny): void
  public _onDropItem(event: foundryAny, data: foundryAny): foundryAny;
}

// Classes{
declare class Dialog {
  constructor(options: foundryAny)
  static defaultOptions: foundryAny

  render(arg: foundryAny): foundryAny
}

declare class DialogV2 extends FoundryHandlebarsApplication {
  constructor(options: foundryAny)
  render(options?: foundryAny): Promise<DialogV2>
}

declare class Hooks {
  static on(id: string, callback: Function): boolean;
}

// Functions
declare function getDocumentClass(x: string): foundryAny

// Mixins
declare class HandlebarsApplicationMixinPartial {
  public _prepareTabs(tab: string);
}
declare function HandlebarsApplicationMixin<T extends Constructor>(x: T):
  T & Constructor<HandlebarsApplicationMixinPartial>;

// Foundry Interface
interface IFoundry {
  applications: {
    api: {
      DialogV2: typeof DialogV2;
      HandlebarsApplicationMixin: typeof HandlebarsApplicationMixin;
    };
    handlebars: foundryAny;
    sheets: {
      ActorSheetV2: typeof ActorSheetV2;
    }
  };
}