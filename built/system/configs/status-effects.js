export const STATUS_EFFECTS = {
    overloadModifiers: (level) => {
        const modifiers = [];
        if (level > 0) {
            modifiers.push({ group: "proficiencies", field: "physical", value: -1 });
        }
        if (level > 1) {
            modifiers.push({ group: "generalModifiers", field: "movementSpeed - status", value: -level + 1 });
        }
        return modifiers;
    },
    strainModifiers: (level) => {
        if (level == 0)
            return [];
        if (level == 1) {
            return [
                { group: "generalModifiers", field: "strain - maxUseReduction", value: -1 },
                { group: "generalModifiers", field: "initiative - status", value: -1 },
            ];
        }
        return [
            { group: "generalModifiers", field: "strain - maxUseReduction", value: -Math.ceil(level / 2) },
            { group: "generalModifiers", field: "initiative - status", value: -Math.ceil(level / 2) },
            { group: "proficiencies", field: "all", value: -Math.floor(level / 2) },
        ];
    },
    painModifiers: (level) => {
        if (level == 0)
            return [];
        if (level == 1)
            return [{ group: "proficiencies", field: "all", value: -1 }];
        return [
            { group: "proficiencies", field: "all", value: -Math.ceil(level / 2) },
            { group: "weapons", field: "General weapon proficiency", value: -Math.floor(level / 2) }
        ];
    },
    damageBodyPartModifiers: (bodyPart, level) => {
        if (level == 0)
            return [];
        switch (bodyPart) {
            case "arms":
                return [{ group: "proficiencies", field: "technical", value: -level }];
            case "head":
                return [{ group: "proficiencies", field: "mental", value: -level }];
            case "legs":
                return [{ group: "generalModifiers", field: "movementSpeed - status", value: -level }];
            case "torso":
                return [{ group: "generalModifiers", field: "health - max", value: -3 * level }];
        }
    }
};
