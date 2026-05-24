export class TheEdgeCombatant extends Combatant {
  async update(dataCandidate: any, operation?: foundryAny): Promise<Combatant> {
    const data = {...dataCandidate}; // Create a copy to prevent mutation
    // First proper update, needed as the first update comes through `Document.updateDocuments`
    if (!("baseInitiative" in this.system)) data["system.baseInitiative"] = data.initiative ?? this.initiative;

    // reset everything when we set the initiative manually
    if ("initiative" in data) {
      data["system.baseInitiative"] = data.initiative;
      if (this.system.strainInitiative) this.actor.system.applyStrain(-this.system.strainInitiative);
      data["system.strainInitiative"] = 0;
    }
    
    // when we update strainInitiative, update the initiative too
    if ("system.strainInitiative" in dataCandidate) {
      const strainDelta = dataCandidate["system.strainInitiative"] - (this.system.strainInitiative ?? 0);
      data.initiative = this.initiative + strainDelta;
      if(!operation?.isRoundReset) this.actor.system.applyStrain(strainDelta);
    }

    return super.update(data, operation) as unknown as Combatant;
  }


  async rollInitiative(formula:string): Promise<Combatant> {
    const roll = this.getInitiativeRoll(formula);
    await roll.evaluate();
    return this.update({
      initiative: roll.total,
      "system.initialInitiative": roll.total,
      "system.strainInitiative": 0
    });
  }


  roundReset() {this.update({"system.strainInitiative": 0}, {isRoundReset: true});}
}