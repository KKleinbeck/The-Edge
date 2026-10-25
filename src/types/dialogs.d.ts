interface IDialogMedicineDetails {
  wounds: IWound[];
}
interface IDialogMedicineResult {
  woundIndex: number
}

interface IDialogRestDetails {
  type: "long rest" | "short rest"
}
interface IDialogRestResult {
  confirm: boolean
}

interface IDialogWeaponData {
  actor: Actor;
  effects: IEffectOverview[];
  sceneId: string;
  token: TokenDocument;
  targetIds: string[];
  weapon: Item;
}

interface IDialogWeaponDataExtended extends IDialogWeaponData {
  distance?: number;
  smallestSize?: TSize;
  sizeModifiers: Record<TSize, number[]>;
  movementModifiers: Record<TMovement, number[]>;
  coverModifiers: Record<TCover, number[]>;
}
