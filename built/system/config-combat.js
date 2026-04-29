export default class CombatConfig {
    static critFailTable = [
        { name: "Spontaneous discharge", frequency: 3 }, { name: "Jam", frequency: 5 },
        { name: "Optics de-adjusted", frequency: 5 }, { name: "Overheating", frequency: 5 },
        { name: "Flicked safety on", frequency: 5 }, { name: "Trigger jam", frequency: 5 },
        { name: "Mag drop", frequency: 5 }, { name: "Random discharge", frequency: 5 },
        { name: "Broken grip", frequency: 5 }, { name: "Barrel misaligned", frequency: 5 },
        { name: "Barrel damaged", frequency: 2 }, { name: "Catastrophic failure", frequency: 1 }
    ];
}
