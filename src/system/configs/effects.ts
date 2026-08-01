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
    const header = "// Your macro needs to define a function `onEvent` with\n" +
      "// two arguments `details` and `id` (== id of this item).\n" +
      "// This is the entry point of the event.\n\n"
    
    switch(field) {
      case "rollAttackCheck-Posterior":
        return header + "function onEvent(details, id) {\n" +
          "  // Prevents triggering on other weapons\n" +
          "  if (details.weaponId === id) {\n" +
          "    console.log(details)\n" +
          "    // details.actor = ...\n" +
          "    // details.attackOutcome = ...\n" +
          "    // details.diceServerConfig = ...\n" +
          "    // details.prompt = ...\n" +
          "  }\n}";
      case "rollAttackCheck-Prior":
        return header + "function onEvent(details, id) {\n" +
          "  // Prevents triggering on other weapons\n" +
          "  if (details.weaponId === id) {\n" +
          "    console.log(details)\n" +
          "    // details.actor = ...\n" +
          "    // details.diceServerConfig = ...\n" +
          "    // details.prompt = ...\n" +
          "  }\n}";
    }
  }
}