type Constructor<T = {}> = new (...args: any[]) => T;

type attribute = "end" | "str" | "spd" | "crd" | "cha" | "emp" | "foc" | "res" | "int"

interface Array<T> {
  random(): T;
  last(): T;
  sum(): T;
  variance(): T;
}