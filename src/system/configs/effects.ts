export const EVENT_NAMES = [
  "rollAttributeCheck-Prior", "rollAttributeCheck-Posterior",
  "rollProficiencyCheck-Prior", "rollProficiencyCheck-Posterior",
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
    const general: Partial<TEventNames>[] = ["rollAttributeCheck-Prior", "rollAttributeCheck-Posterior"];
    const proficiency: Partial<TEventNames>[] = ["rollProficiencyCheck-Prior", "rollProficiencyCheck-Posterior"];
    const weapon: Partial<TEventNames>[] = ["rollAttackCheck-Prior", "rollAttackCheck-Posterior"];
    switch(type) {
      case "Skill":
      case "Weapon":
        return [...general, ...proficiency, ...weapon]
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
      case "rollAttributeCheck-Posterior":
      case "rollAttributeCheck-Prior":
      case "rollProficiencyCheck-Posterior":
      case "rollProficiencyCheck-Prior":
        return header + "function onEvent(details, id) {\n" +
          "  console.log(details)\n" +
          "  // details.actor = ... \n" +
          "  // details.promptResult = ... \n" +
          (field.includes("Posterior") ? "  // details.rollResult = ... \n" : "") +
          "}";
        
      case "rollAttackCheck-Posterior":
      case "rollAttackCheck-Prior":
        return header + "function onEvent(details, id) {\n" +
          "  // Prevents triggering on other weapons\n" +
          "  if (details.weaponId === id) {\n" +
          "    console.log(details)\n" +
          "    // details.actor = ...\n" +
          (field.includes("Posterior") ? "    // details.attackOutcome = ...\n" : "") +
          "    // details.diceServerConfig = ...\n" +
          "    // details.prompt = ...\n" +
          "  }\n}";
    }
  }
}