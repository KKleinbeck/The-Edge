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
        switch (field) {
            case "rollAttackCheck-Posterior":
            case "rollAttackCheck-Prior":
                return "function onEvent(checkData) {\n" +
                    "  console.log(checkData)\n" +
                    "  return checkData;\n}";
        }
    }
};
