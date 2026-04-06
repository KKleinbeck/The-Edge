const THE_EDGE = {};
// IMPORTANT: Multiple config entries are dynamically generated from the template.json.
//   This happens in the Hooks.on("init").
THE_EDGE.attrCost = (n) => { return 10 * Math.floor(12 + 8 * Math.pow(1.2, n)); };
THE_EDGE.profCost = (n) => { return 5 * Math.floor(10 + 4 * Math.pow(1.2, n)); };
THE_EDGE.sizes = { tiny: 30, small: 130, normal: 250, large: 500, giant: Infinity };
THE_EDGE.sizeModifiers = { "normal": [0, 0], "tiny": [-8, -4], "small": [-4, -2], "large": [2, 4], "giant": [4, 8] };
THE_EDGE.ammunitionSubtypes = ["small", "large"];
THE_EDGE.sizeFreeThrow = { "tiny": 0.3, "small": 1, "normal": 1.5, "large": 3, "giant": 10 };
THE_EDGE.movements = { "stationary": [0, 0], "moderate": [-1, -1], "fast": [-2, -2], "erradic": [-4, -4] };
THE_EDGE.cover = { "no cover": 0, "half cover": -2, "three quarters": -4, "full cover": -20 };
THE_EDGE.consumables_subtypes = ["Food", "Grenade", "SkinPack", "FleshPack", "Drugs", "Generic"];
THE_EDGE.wounds_pixel_coords = {
    "female": {
        "Head": { "coords": [[47.0, 8.0], [47.0, 8.0]], "radius": 5 },
        "Torso": { "coords": [[47.0, 22.0], [47.0, 45.0]], "radius": 10 },
        "ArmsLeft": { "coords": [[23.5, 23.0], [14.5, 46.0]], "radius": 1 },
        "ArmsRight": { "coords": [[71.0, 23.0], [80.0, 46.0]], "radius": 1 },
        "LegsLeft": { "coords": [[33.5, 57.0], [32.5, 84.0]], "radius": 1 },
        "LegsRight": { "coords": [[62.0, 57.0], [63.0, 84.0]], "radius": 1 }
    },
    "male": {
        "Head": { "coords": [[47.0, 8.0], [47.0, 8.0]], "radius": 5 },
        "Torso": { "coords": [[47.0, 22.0], [47.0, 45.0]], "radius": 15 },
        "ArmsLeft": { "coords": [[21.5, 23.0], [12.5, 46.0]], "radius": 1 },
        "ArmsRight": { "coords": [[73.0, 23.0], [82.0, 46.0]], "radius": 1 },
        "LegsLeft": { "coords": [[30.5, 57.0], [28.5, 84.0]], "radius": 1 },
        "LegsRight": { "coords": [[65.0, 57.0], [67.0, 84.0]], "radius": 1 }
    }
};
THE_EDGE.cover_map = {
    Torso: ["Torso"],
    Torso_Arms: ["Torso", "ArmsLeft", "ArmsRight"],
    Legs: ["LegsLeft", "LegsRight"],
    Below_Neck: ["Torso", "ArmsLeft", "ArmsRight", "LegsLeft", "LegsRight"],
    Head: ["Head"],
    Entire: ["Head", "Torso", "ArmsLeft", "ArmsRight", "LegsLeft", "LegsRight"]
};
THE_EDGE.combat_damage_types = [
    "energy", "kinetic", "elemental"
];
THE_EDGE.bleeding_threshold = {
    "energy": 25, "kinetic": 10, "elemental": 50, "fall": 15, "impact": 15, "HandToHand": 25
};
THE_EDGE.wound_odds = ({ damage, damageType } = {}) => {
    switch (damageType) {
        case "energy":
            return { "abrasion": 10, "light burn": damage, "strong burn": Math.max(0, Math.ceil(damage * (damage - 10) / 10)) };
        case "kinetic":
            return { "abrasion": 10, "laceration": damage, "fracture": Math.max(0, Math.ceil(damage * (damage - 10) / 10)) };
        case "elemental":
            return { "light burn": damage, "strong burn": Math.max(0, damage * (damage - 10) / 10) };
        case "fall":
        case "impact":
            return { "abrasion": 20, "laceration": Math.ceil(damage / 2), "fracture": Math.max(0, Math.ceil(damage * (damage - 10) / 10)) };
        case "HandToHand":
            return { "abrasion": 20, "fracture": Math.max(0, Math.ceil(damage * (damage - 10) / 10)) };
    }
    return {};
};
THE_EDGE.fallDamageRoll = (height) => { return `${height}d12 + ${4 * height - 22}`; };
THE_EDGE.fallDamageWoundCount = (height) => { return Math.floor(height / 2); };
THE_EDGE.impactDamageRoll = (speed) => { return `${speed}d${speed}+${speed - 30}`; };
THE_EDGE.impactDamageWoundCount = (speed) => { return Math.floor(speed / 3); };
THE_EDGE.medicine_effects = ["heals", "treats"];
THE_EDGE.wound_status = ["treatable", "treated"];
// Entries below are primarily implemented in the_edge.js
THE_EDGE.coreValueMap = { attributes: {}, proficiencies: {}, strain: {}, weapons: {} };
THE_EDGE.effectMap = {
    attributes: { all: [] },
    proficiencies: { all: [] },
    weapons: { all: [] },
    generalModifiers: {}
};
THE_EDGE.weapon_damage_types = { "Recoilless Rifles": "general" };
THE_EDGE.weapon_partners = {};
// Status Effects
THE_EDGE.overloadModifiers = (level) => {
    const modifiers = [];
    if (level > 0) {
        modifiers.push({ group: "proficiencies", field: "physical", value: -1 });
    }
    if (level > 1) {
        modifiers.push({ group: "attributes", field: "physical", value: -level + 1 });
    }
    return modifiers;
};
THE_EDGE.strainModifiers = (level) => {
    if (level == 0)
        return [];
    if (level == 1) {
        return [
            { group: "attributes", field: "crd", value: -1 },
            { group: "attributes", field: "foc", value: -1 }
        ];
    }
    return [
        { group: "weapons", field: "all", value: -1 },
        { group: "attributes", field: "crd", value: -2 },
        { group: "attributes", field: "foc", value: -2 },
        { group: "attributes", field: "social", value: -1 },
        { group: "attributes", field: "mental", value: -1 }
    ];
};
THE_EDGE.painModifiers = (level) => {
    if (level == 0)
        return [];
    if (level == 1)
        return [{ group: "proficiencies", field: "all", value: -1 }];
    return [
        { group: "proficiencies", field: "all", value: -Math.ceil(level / 2) },
        { group: "weapons", field: "General weapon proficiency", value: -Math.floor(level / 2) }
    ];
};
THE_EDGE.injuryMap = { "torso": "end", "head": "foc", "arms": "crd", "legs": "spd" };
THE_EDGE.damageBodyPartModifiers = (bodyPart, level) => {
    if (level == 0)
        return [];
    return [{ group: "attributes", field: THE_EDGE.injuryMap[bodyPart], value: -level }];
};
THE_EDGE.translationPercentage = {
    // Maps language level to chance of getting a word
    0: 0,
    1: 15,
    2: 30,
    3: 50,
    4: 70,
    5: 90,
    6: 100
};
export default THE_EDGE;
