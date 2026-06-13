export const EVENT_NAMES = [
    "rollAttackCheck-Prior", "rollAttackCheck-Posterior"
];
export const EFFECTS = {
    effectMap: {
        attributes: { all: [] },
        proficiencies: { all: [] },
        weapons: { all: [] },
        generalModifiers: {}
    },
    dynamicModifiers: (type) => {
        switch (type) {
            case "Weapon":
                return ["rollAttackCheck-Prior", "rollAttackCheck-Posterior"];
        }
        return undefined;
    },
    isDynamicModifier: (field) => {
        return EVENT_NAMES.includes(field);
    },
    dynamicModifierDefaults: (field) => {
        const header = "// Your macro needs to define a function `onEvent`\n" +
            "// with as single argument `details`.\n" +
            "// This is the entry point of the event.\n\n";
        switch (field) {
            case "rollAttackCheck-Posterior":
                return header + "function onEvent(details) {\n" +
                    "  console.log(details)\n" +
                    "  // details.actor = ...\n" +
                    "  // details.attackOutcome = ...\n" +
                    "  // details.diceServerConfig = ...\n" +
                    "  // details.prompt = ...\n" +
                    "  return details;\n}";
            case "rollAttackCheck-Prior":
                return header + "function onEvent(details) {\n" +
                    "  console.log(details)\n" +
                    "  // details.actor = ...\n" +
                    "  // details.diceServerConfig = ...\n" +
                    "  // details.prompt = ...\n" +
                    "  return details;\n}";
        }
    }
};
