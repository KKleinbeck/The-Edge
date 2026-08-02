export const EVENT_NAMES = [
    "rollAttackCheck-Prior", "rollAttackCheck-Posterior",
    "rollAttributeCheck-Prior", "rollAttributeCheck-Posterior",
    "rollMeleeCheck-Prior", "rollMeleeCheck-Posterior",
    "rollProficiencyCheck-Prior", "rollProficiencyCheck-Posterior",
    "onReceiveDamage", "onRest"
];
export const EFFECTS = {
    effectMap: {
        attributes: { all: [] },
        proficiencies: { all: [] },
        weapons: { all: [] },
        generalModifiers: {}
    },
    dynamicModifiers: (type) => {
        const attributes = ["rollAttributeCheck-Prior", "rollAttributeCheck-Posterior"];
        const general = ["onReceiveDamage", "onRest"];
        const proficiency = ["rollProficiencyCheck-Prior", "rollProficiencyCheck-Posterior"];
        const weapon = [
            "rollMeleeCheck-Prior", "rollMeleeCheck-Posterior", "rollAttackCheck-Prior", "rollAttackCheck-Posterior"
        ];
        switch (type) {
            case "Armour":
            case "Skill":
                return [...attributes, ...general, ...proficiency, ...weapon];
            case "Weapon":
                return [...attributes, ...proficiency, ...weapon];
        }
        return undefined;
    },
    isDynamicModifier: (field) => {
        return EVENT_NAMES.includes(field);
    },
    dynamicModifierDefaults: (field) => {
        const header = "// Your macro needs to define a function `onEvent` with\n" +
            "// two arguments `details` and `id` (== id of this item).\n" +
            "// This is the entry point of the event.\n\n";
        switch (field) {
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
            case "rollMeleeCheck-Posterior":
            case "rollMeleeCheck-Prior":
                return header + "function onEvent(details, id) {\n" +
                    "  // Prevents triggering on other weapons\n" +
                    "  if (details.weaponId === id) {\n" +
                    "    console.log(details)\n" +
                    "    // details.actor = ...\n" +
                    (field.includes("Posterior") ? "    // details.attackRollResult = ...\n" : "") +
                    "    // details.prompt = ...\n" +
                    `  } else if (details.weaponId === "UnarmedStrike") {\n` +
                    "    // Handle weapon-less attacks\n" +
                    "    console.log(details)\n" +
                    "  }\n}";
            case "onReceiveDamage":
                return header + "function onEvent(details, id) {\n" +
                    "  console.log(details)\n" +
                    "  // details.actor = ... \n" +
                    "  // details.damageConfig = ... \n" +
                    "}";
            case "onRest":
                return header + "function onEvent(details, id) {\n" +
                    "  console.log(details)\n" +
                    "  // details.actor = ... \n" +
                    "  // details.restDescription = ... \n" +
                    "}";
        }
    }
};
