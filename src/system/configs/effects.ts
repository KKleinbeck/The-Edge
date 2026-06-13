export const EVENT_NAMES = [
  "rollAttackCheck-Prior", "rollAttackCheck-Posterior"
] as const satisfies TEventNames[];

export const EFFECTS = {
  effectMap: {
    attributes: {all: []},
    proficiencies: {all: []},
    weapons: {all: []},
    generalModifiers: {}
  },

  dynamicModifiers: (type: string): TEventNames[] | void => {
    switch(type) {
      case "Weapon":
        return ["rollAttackCheck-Prior", "rollAttackCheck-Posterior"]
    }
    
    return undefined;
  },

  isDynamicModifier: (field: string): field is TEventNames => {
    return (EVENT_NAMES as readonly string[]).includes(field);
  },

  dynamicModifierDefaults: (field: TEventNames): string => {
    switch(field) {
      case "rollAttackCheck-Posterior":
      case "rollAttackCheck-Prior":
        return "function onEvent(checkData) {\n" +
          "  console.log(checkData)\n" +
          "  return checkData;\n}"
    }
  }
}