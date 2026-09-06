export const COMBAT_CONFIG = {
  critFailTable: [
    { name: "Spontaneous discharge", frequency: 3 },
    { name: "Jam", frequency: 5 },
    { name: "Optics de-adjusted", frequency: 5 },
    { name: "Overheating", frequency: 5 },
    { name: "Flicked safety on", frequency: 5 },
    { name: "Trigger jam", frequency: 5 },
    { name: "Mag drop", frequency: 5 },
    { name: "Random discharge", frequency: 5 },
    { name: "Broken grip", frequency: 5 },
    { name: "Barrel misaligned", frequency: 5 },
    { name: "Barrel damaged", frequency: 2 },
    { name: "Catastrophic failure", frequency: 1 },
  ] as ICritFailEvent[],

  attackDiceParameters(actor: Actor): IAttackDiceParameters {
    return {
      critDice: [1],
      critFailDice: [20],
      critFailCheckThreshold: Math.floor(
        actor.system.weapons.general["General weapon proficiency"].value / 2,
      ),
    };
  },

  handToHandMaxStrain: (
    handToHandLevel: number,
    strainMaxUseReduction: number,
  ) => {
    return Math.floor(handToHandLevel / 2.5 + strainMaxUseReduction);
  },

  weaponAttackActionCost: (precision: "aimed" | "unaimed"): number => {
    return precision == "aimed" ? 2 : 1;
  },
};
