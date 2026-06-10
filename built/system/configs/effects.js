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
    }
};
