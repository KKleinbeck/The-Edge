import LocalisationServer from "../system/localisation_server.js"
import MovementCalculator from "../system/sidebar/combat-tracker-movement-options.js"
import THE_EDGE from "../system/config-the-edge.js"

interface IMovementOption {
  actions: number
  pattern: number[]
  cost: number
}

export class TheEdgeCombatant extends Combatant {
  async update(dataCandidate: any, operation?: foundryAny): Promise<Combatant> {
    const data = {...dataCandidate}; // Create a copy to prevent mutation

    if ("initiative" in data) { // reset strain initiative when we set the initiative manually
      if (this.system.strainInitiative) this.actor.system.applyStrain(-this.system.strainInitiative);
      data["system.strainInitiative"] = 0;
    }
    
    if ("system.strainInitiative" in dataCandidate) { // update initiative when we update strainInitiative
      const strainDelta = dataCandidate["system.strainInitiative"] - this.system.strainInitiative;
      data.initiative = this.initiative + strainDelta;
      if(!operation?.isTurnReset) this.actor.system.applyStrain(strainDelta);
    }

    return super.update(data, operation) as unknown as Combatant;
  }


  get context(): Record<string, any> {
    const context: Record<string, any> = {};
    context.strainLog = this.system.strainLog;
    
    context.distance = this.distanceTravelled;
    context.movementOptions = this.getMovementOptions(context.distance);
    context.movementIndex = this.system.movementIndex;
    context.movements = this.getMovementStrainLog(context.movementOptions);

    context.strainNow = this.actor.system.strain.value;
    context.strainThen = (
      context.strainNow +
      (context.movements?.reduce((acc: number, movement: any) => acc + movement.strainChange, 0) ?? 0) +
      (context.strainLog?.reduce((acc: number, entry: any) => acc + entry.strainChange, 0) ?? 0)
    );
    context.levelNow = this.actor.system.strainLevel;
    context.levelThen = this.actor.system.strainLevels
      .map(x => x.value).findIndex(x => x > context.strainThen);

    return context;
  }


  get distanceTravelled(): number {
    const movementHistory = this.token.movementHistory;
    return movementHistory.reduce(
      (acc: number, current: foundryAny) => acc + current.cost, 0
    );
  }


  addAction(payload: ITheEdgeActionPayload) {
    let name = payload.action ?? LocalisationServer.localise(payload.actionType, "Game Actions");
    if (payload.actionCost > 1) name += ` x ${payload.actionCost}`;

    this.system.strainLog.push({
      name: name, strainChange: payload.strainCost ? payload.strainCost : 0
    });
    this.update({"system.strainLog": this.system.strainLog});
  }


  undoAction(undoIndex: number) {
    this.system.strainLog.splice(undoIndex, 1);
    this.update({"system.strainLog": this.system.strainLog});
  }


  getMovementOptions(distance: number): IMovementOption[] {
    const actor = this.actor;

    const speeds = [actor.system.strideSpeed, actor.system.runSpeed, actor.system.sprintSpeed];
    if (speeds[2] == 0) return []; // We cannot possibly do anything here

    const strainCost = [
      THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
    ];

    const minActions = Math.ceil(distance / speeds[2]);
    const maxActions = Math.ceil(distance / speeds[0]);

    const patterns: IMovementOption[] = [];
    for (let actions = minActions; actions <= maxActions; actions++) {
      patterns.push(MovementCalculator.determineBestPattern(actions, distance, speeds, strainCost));
    }
    
    return patterns;
  }

  
  getMovementStrainLog(movementOptions: IMovementOption[]): IStrainLogEntry[] {
    if (!movementOptions.length) return [];

    const movementStrainLog: IStrainLogEntry[] = [];
    for (const patternIndex of movementOptions[this.system.movementIndex].pattern) {
      movementStrainLog.push({
        name: LocalisationServer.localise(
          ["Stride", "Run", "Sprint"][patternIndex], "Combat"
        ),
        strainChange: [
          THE_EDGE.strainCost.striding, THE_EDGE.strainCost.running, THE_EDGE.strainCost.sprinting
        ][patternIndex]
      });
    }
    return movementStrainLog;
  }


  get _totalStrainCost(): number {
    const movementOptions = this.getMovementOptions(this.distanceTravelled);
    const movementStrainCost = movementOptions[this.system.movementIndex].cost;
    console.log(movementStrainCost)

    const actionStrainCost = this.system.strainLog.reduce(
      (acc: number, strainLogEntry: IStrainLogEntry) => acc + strainLogEntry.strainChange,
      0
    );
    console.log(actionStrainCost)

    return movementStrainCost + actionStrainCost;
  }


  endOfTurnReset() {
    this.actor.system.applyCombatStrain(this._totalStrainCost);

    this.update(
      {
        "system.movementIndex": 0,
        "system.strainInitiative": 0,
        "system.strainLog": []
      },
      {isTurnReset: true}
    );
  }
}