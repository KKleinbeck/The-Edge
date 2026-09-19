interface IDialogMedicineData {
  medicineItem: foundryAny;
  wounds: IWound[];
  actor: foundryAny;
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
