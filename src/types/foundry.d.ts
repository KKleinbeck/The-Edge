type foundryAny = any

declare const foundry: IFoundry
declare const game: foundryAny
declare const ui: foundryAny

interface FoundryContainer<T> {
  get(id: string): T;
  reduce(reduceFn: Function, initial: any): any;
  filter(filterFn: Function): FoundryContainer<T>;
  length: number
  
  // Iterator Protocol
  [Symbol.iterator](): Iterator<T>
  next(): T
}

// Applications
declare class FoundryHandlebarsApplication {
  _onRender(context: any, options: any): void

  public element: Element
}

// Documents
declare class FoundryDocument {
  static implementation: foundryAny

  id: string
  name: string
  type: string
}

declare class Actor extends FoundryDocument {
  getFlag(a: string, b: string): boolean
  items: Items
  itemTypes: Record<string, Items>
  system: {
    attributes: ATTRIBUTES
    AdvantagePoints: {used: number, max: number}
    PracticeHours: foundryAny
    onUpdate(data: any): void
  }
  update(data: any, operation?: any): Promise<any>
}

interface Actors extends FoundryContainer<Actor> {}

declare class Item extends FoundryDocument {
  system: foundryAny

  update(data: foundryAny, options?: foundryAny): Promise<void>
  delete()
}

interface Items extends FoundryContainer<Item> {}

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

// Classes
interface ChatSpeakerData {
  actor?: string;
  alias?: string;
  scene?: string;
  token?: string;
}

interface ChatMessageData {
  _id: string | null;
  _stats: foundryAny;
  blind?: boolean;
  content: string;
  emote?: boolean;
  flags: foundryAny;
  flavor?: string;
  rolls?: string[];
  sound?: string;
  speaker: ChatSpeakerData;
  style?: foundryAny;
  system: IChatSystem;
  timestamp: number | null;
  title?: string;
  type: string;
  user: string;
  whisper: string[];
}

declare class ChatMessage {
  constructor(data: Partial<ChatMessageData>, operation?: foundryAny)
  static applyRollMode(data: Partial<ChatMessageData>, rollMode: string)
  static getWhisperRecipients()
  static create(data?: Partial<ChatMessageData>, operation?: foundryAny): Promise<foundryAny>
}

declare class Dialog {
  constructor(options: foundryAny)
  static defaultOptions: foundryAny

  render(arg: foundryAny): foundryAny
}

declare class DialogV2 extends FoundryHandlebarsApplication {
  constructor(options: foundryAny)
  render(options?: foundryAny): Promise<DialogV2>
  static prompt(config?: foundryAny): Promise<any>
}

declare class Hooks {
  static on(id: string, callback: Function): boolean;
}

declare class Roll {
  constructor(arg: foundryAny)
  evaluate(): foundryAny
  static parse(formula: string, data: object): foundryAny[]
  static validate(roll: string): boolean
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
  abstract: {
    TypeDataModel: foundryAny
  };
  applications: {
    api: {
      DialogV2: typeof DialogV2;
      HandlebarsApplicationMixin: typeof HandlebarsApplicationMixin;
    };
    handlebars: foundryAny;
    sheets: {
      ActorSheetV2: typeof ActorSheetV2;
    };
    ux: {
      ContextMenu: foundryAny
    }
  };
  data: {
    fields: {
      ArrayField: foundryAny
      NumberField: foundryAny
      ObjectField: foundryAny
      SchemaField: foundryAny
      StringField: foundryAny 
    }
  }
  utils: {
    flattenObject(obj: object, _d?: number): object
    mergeObject<T, U>(a: T, b: U): T & U;
  };
}

declare class CONFIG {
  static Combat: {
    initiative: foundryAny
  }
}