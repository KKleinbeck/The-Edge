type foundryAny = any

declare const canvas: ICanvas
declare const foundry: IFoundry
declare const game: foundryAny
declare const ui: foundryAny

interface TPosition {x: number, y: number}

interface FoundryContainer<T> {
  get(id: string): T;
  reduce(reduceFn: Function, initial: any): any;
  filter(filterFn: Function): FoundryContainer<T>;
  length: number
  
  // Iterator Protocol
  [Symbol.iterator](): Iterator<T>
  next(): T
}

// Documents
declare class FoundryDocument {
  static implementation: foundryAny

  id: string
  name: string
  parent: foundryAny | undefined
  type: string

  delete()
  update(data: any, operation?: any): Promise<FoundryDocument>
  static updateDocuments(updates?: foundryAny[], operation?: foundryAny): Promise<any>
}

declare class Actor extends FoundryDocument {
  getFlag(a: string, b: string): boolean
  items: Items
  itemTypes: Record<string, Items>
  system: {
    attributes: ATTRIBUTES
    combaticsDamage: string
    combaticsPL: number
    counters: ICounter[]
    credits: { chids: number, digital: number }
    effects: IEffect[]
    overloadLevel: number
    statusEffects: IStatusEffect[]
    weapons: {
      energy: IWeaponsEnergy
      general: IWeaponsGeneral
      kinetic: IWeaponsKinetic
    }
    weightTillNextOverload: number
    wounds: IWound[]
    AdvantagePoints: {used: number, max: number}
    PracticeHours: foundryAny
    advanceAttr(name: string, type: string)
    applyStrain(change: number): Promise<number>
    deleteWound(index: number)
    editWound(index: number, details: Partial<IWoundDetails>)
    getWeaponPlOfWeapon(weaponId: string): number
    onUpdate(data: any): void
    regenerateHeroToken()
    rollAttackCheck(prompt: IAttackRollPrompt): Promise<IAttackRollResult>
    useHeroToken()
  }
  addOrCreateVantage(item: Item)
  findItem(item: Item): Item | undefined
  learnSkill(item: Item)
}


interface Actors extends FoundryContainer<Actor> {}

declare class Combat extends FoundryDocument {
  nextRound(): Promise<Combat>
  nextTurn(): Promise<Combat>
  combatant: Combatant
  combatants: FoundryContainer<Combatant>
  nextCombatant: Combatant
}

interface IActionLogEntry {
  name: string
  actionCost: number
}

interface IMovementOption {
  actions: number
  pattern: number[]
  strainCost: number
}

declare class Combatant extends FoundryDocument {
  constructor(data: foundryAny, options: foundryAny)
  defineSchema(): Record<string, foundryAny>
  getInitiativeRoll(formula: string): Roll

  actor: foundryAny
  initiative: number
  system: {
    baseInitiative: number
    movementIndex: number
    strainInitiative: number
    actionLog: IActionLogEntry[]
  }
  token: foundryAny
}

declare class Item extends FoundryDocument {
  img: string
  isOwner: boolean
  system: foundryAny

  static create(data: foundryAny, options: foundryAny): foundryAny
  getFlag(a: string, b: string)
}

interface Items extends FoundryContainer<Item> {}

declare class TokenDocument {
  static getTrackedAttributes(data: foundryAny, _path: string[]): foundryAny

  getBarAttribute(barName: string, options: {alternative?: string}): foundryAny
  actor: Actor
  id: string
}

// Hooks
declare namespace Hooks {
  function on(id: string, callback: Function): boolean;
  function call(event: string, ...args: unknown[]): boolean;
}


// Sheets
interface IDEFAULT_OPTIONS {
  actions: any
}

declare class ActorSheetV2 {
  constructor(args: foundryAny)
  static DEFAULT_OPTIONS: IDEFAULT_OPTIONS
  public actor: Actor
  public token: TokenDocument

  public _prepareContext(options: foundryAny): foundryAny
  public render(options: foundryAny): void
  public _onDropItem(event: foundryAny, data: foundryAny): foundryAny;
}


declare class ItemSheetV2 {
  constructor(args: foundryAny)
  public document: Item
  public item: Item

  protected _attachFrameListeners(): void // Check whether this is ever called
  protected _prepareContext(options: any): Promise<foundryAny>
  protected _renderFrame(options: any): Promise<HTMLElement>
  public maximize(): Promise<void>
  public minimize(): Promise<void>
  public render(options?: foundryAny, _options?: foundryAny): Promise<ItemSheetV2>
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

declare class DialogV2 extends HandlebarsApplication {
  constructor(options: foundryAny)
  render(options?: foundryAny): Promise<DialogV2>
  static prompt(config?: foundryAny): Promise<any>
}

declare class Roll {
  constructor(arg: foundryAny)
  evaluate(): foundryAny
  static parse(formula: string, data: object): foundryAny[]
  static validate(roll: string): boolean

  get total(): number
}

// Functions
declare function getDocumentClass(x: string): foundryAny

// Mixins
declare class HandlebarsApplication {
  public element: Element

  public _onRender(context: any, options: any): void
  public _prepareTabs(tab: string): undefined;
}
declare function HandlebarsApplicationMixin<T extends Constructor>(x: T):
  T & Constructor<HandlebarsApplication>;

// Canvas Interface
interface ICanvas {
  app: {
    view: foundryAny
  }
  mousePosition: TPosition
  scene: {
    grid: {
      distance: number
      size: number
    }
    id: string
    tokens: FoundryContainer<foundryAny>
  }
}

// Foundry Interface
interface IFoundry {
  abstract: {
    TypeDataModel: foundryAny
  };
  applications: {
    api: {
      ApplicationV2: foundryAny
      DialogV2: typeof DialogV2;
      HandlebarsApplicationMixin: typeof HandlebarsApplicationMixin;
    };
    elements: {
      HTMLCodeMirrorElement: foundryAny
    }
    handlebars: foundryAny;
    sheets: {
      ActorSheetV2: typeof ActorSheetV2;
      ItemSheetV2: typeof ItemSheetV2
    };
    sidebar: {
      tabs: {CombatTracker: foundryAny}
    }
    ux: {
      ContextMenu: foundryAny
      TextEditor: foundryAny
    }
  }
  appv1: {
    sheets: {
      ItemSheet: foundryAny
    }
  }
  canvas: {
    placeables: {
      Token: foundryAny
    }
  }
  data: {
    fields: {
      ArrayField: foundryAny
      BooleanField: foundryAny
      NumberField: foundryAny
      ObjectField: foundryAny
      SchemaField: foundryAny
      StringField: foundryAny 
    }
  }
  documents: {
    collections: {
      Items: foundryAny
    }
  }
  utils: {
    flattenObject(obj: object, _d?: number): object
    getProperty(a: foundryAny, path: string): foundryAny
    mergeObject<T, U>(a: T, b: U): T & U;
  };
}

declare class CONFIG {
  static Combat: {
    initiative: foundryAny
  }
}


// Third Party
declare class Handlebars {
  static registerHelper(obj: Record<string, any>)
}