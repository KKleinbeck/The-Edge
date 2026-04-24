type Constructor<T = {}> = new (...args: any[]) => T;

type attribute = "end" | "str" | "spd" | "crd" | "cha" | "emp" | "foc" | "res" | "int"

type TBodyPart = "Torso" | "Head" | "LegsLeft" | "LegsRight" | "ArmsLeft" | "ArmsRight"

interface Array<T> {
  random(): T;
  last(): T;
  sum(): T;
  variance(): T;
}

interface IModifier {
  group: string
  field: string
  value: number
}

// Helpers
type WithOptionals<T> = T & Record<string, any>