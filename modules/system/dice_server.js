export default class DiceServer {
  constructor() {
    const interpretTemplate = {
      crit: [1], critFail: [20], critFailTable: []
    }

    this.interpretationParams = {
      attributes: structuredClone(interpretTemplate),
      proficiencies: structuredClone(interpretTemplate),
      weapons: structuredClone(interpretTemplate),
    }
    this.interpretationParams.attributes.qualityStep = 2;
    this.interpretationParams.proficiencies.qualityStep = 5;
    this.interpretationParams.weapons.critFailTable = [
      {name: "Spontaneous discharge", frequency: 3}, {name: "Jam", frequency: 5},
      {name: "Optics de-adjusted", frequency: 5}, {name: "Overheating", frequency: 5},
      {name: "Flicked safety on", frequency: 5}, {name: "Trigger jam", frequency: 5},
      {name: "Mag drop", frequency: 5}, {name: "Random discharge", frequency: 5},
      {name: "Broken grip", frequency: 5}, {name: "Barrel misaligned", frequency: 5},
      {name: "Barrel damaged", frequency: 2}, {name: "Catastrophic failure", frequency: 1}
    ]
  }

  _selectFromFailTable(tableBasis) {
    let table = [];
    for (const elem of tableBasis) {
      for (let i = 0; i < elem.frequency; ++i) table.push(elem.name);
    }
    return table.random();
  }

  _selectVantageOutcome(vantage, roll1, roll2) {
    if ( (vantage == "Advantage" && roll1.netOutcome > roll2.netOutcome) ||
          (vantage == "Disadvantage" && roll1.netOutcome < roll2.netOutcome) ) {
      return roll1;
    }
    return roll2;
  }

  async _interpretCheck(type, roll, details = undefined) {
    const interpretationParams = this.interpretationParams[type];
    const qualityStep = interpretationParams.qualityStep;

    let basicQuality = Math.floor(roll.netOutcome / qualityStep);
    let outcome = (roll.netOutcome >= 0) ? "Success" : "Failure"
    switch (type) {
      case "attributes":
        if (interpretationParams.crit.includes(roll.diceResult)) {
          outcome = "CritSuccess"
          basicQuality = Math.max(basicQuality + 2, 2);
          roll.netOutcome += 8;
        }
        if (interpretationParams.critFail.includes(roll.diceResult)) {
          outcome = "CritFailure"
          basicQuality = Math.min(basicQuality - 2, -2);
          roll.netOutcome -= 8;
        }
        break;

      case "proficiencies":
        let nCrits = 0;
        let nCritFails = 0;
        for (const dice of roll.diceResults) {
          if (interpretationParams.crit.includes(dice)) ++nCrits;
          if (interpretationParams.critFail.includes(dice)) ++nCritFails;
        }
        basicQuality += 2 * (nCrits - nCritFails);
        roll.netOutcome += 8 * (nCrits - nCritFails);
        outcome = (roll.netOutcome >= 0) ? "Success" : "Failure"
        if (nCrits >= 2) {
          basicQuality = Math.max(basicQuality, 7);
          outcome = "CritSuccess";
        } else if (nCritFails >= 2) {
          basicQuality = Math.min(basicQuality, -7);
          outcome = "CritFailure";
        }
        break;
      
      case "weapons":
        let damage = [];
        let crits = [];
        for (let i = 0; i < details.dices; ++i) {
          if (!roll.hits[i]) continue;

          damage.push((await this._genericRoll(details.damageDice)))
          if (interpretationParams.crit.includes(roll.diceResults[i])) {
            damage[damage.length-1] += this._max(details.damageDice);
            crits.push(true)
          } else crits.push(false)
        }

        let failEvents = [];
        const nFailures = roll.diceResults.filter(x => interpretationParams.critFail.includes(x));
        if (nFailures.length >= 0.33335 * roll.diceResults.length) {
          const failCheck = (await this._genericRoll("1d20"));
          if (failCheck == 20 || failCheck > details.critThreshold) {
            failEvents.push(this._selectFromFailTable(interpretationParams.critFailTable));
          }
        }

        return [crits, damage, roll.diceResults, roll.hits, failEvents];
    }

    const interpretation = {outcome: outcome, quality: basicQuality};
    foundry.utils.mergeObject(roll, interpretation);
    return roll;
  }

  async attributeCheck(threshold, vantage) {
    let roll = await this._attributeRoll(threshold);

    if (vantage == "Advantage" || vantage == "Disadvantage") {
      const roll2 = this._attributeRoll(threshold);
      roll = this._selectVantageOutcome(vantage, roll, roll2);
    }

    return this._interpretCheck("attributes", roll);
  }

  async _attributeRoll(threshold) {
    let diceRes = await this._genericRoll("1d20");
    return {diceResult: diceRes, netOutcome: threshold - diceRes};
  }

  async proficiencyCheck(thresholds, modificator, vantage) {
    let roll = await this._proficiencyRoll(thresholds, modificator);

    if (vantage == "Advantage" || vantage == "Disadvantage") {
      const roll2 = await this._proficiencyRoll(thresholds, modificator);
      roll = this._selectVantageOutcome(vantage, roll, roll2)
    }

    return this._interpretCheck("proficiencies", roll);
  }

  async _proficiencyRoll(thresholds, modificator) {
    const diceRes = await new Roll("3d20").evaluate();
    const diceResults = diceRes.dice[0].results.map(x => x.result);
    const netOutcome = this.constructor.proficiencyNetOutcome(diceResults, thresholds, modificator);
    return {diceResults: diceResults, netOutcome: netOutcome};
  }
  
  static proficiencyNetOutcome(diceResults, thresholds, modificator) {
    let failedSum = 0;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const diff = thresholds[i] - diceResults[i];
      failedSum += Math.min(diff, 0);
      sum += diff;
    }
    return modificator + ((modificator >= -failedSum || failedSum == 0) ? sum : failedSum);
  }

  async attackCheck(dices, threshold, vantage, damageDice, critThreshold) {
    let roll = await this._attackRoll(dices, threshold);

    if (vantage == "Advantage" || vantage == "Disadvantage") {
      const roll2 = await this._attackRoll(dices, threshold);
      roll = this._selectVantageOutcome(vantage, roll, roll2)
    }

    return this._interpretCheck("weapons", roll,
      {damageDice: damageDice, dices: dices, critThreshold: critThreshold}
    );
  }

  async _attackRoll(dices, threshold) {
    let diceRes = []
    for (let i = 0; i < dices; ++i) diceRes.push(await this._genericRoll("1d20"));
    let hits = diceRes.map(x =>
      x <= threshold && !(this.interpretationParams.weapons.critFail.includes(x))
    );
    return {diceResults: diceRes, hits: hits, netOutcome: hits.sum()};
  }

  async _genericRoll(rollDescription) { return this.constructor.genericRoll(rollDescription); }
  static async genericRoll(rollDescription) {
    const roll = await new Roll(rollDescription).evaluate();
    return roll._total;
  }
  
  _max(rollDescription) { return this.constructor.max(rollDescription); }
  static max(rollDescription) {
    let rolls = rollDescription.replace(/\s/g, '').split("+");
    let result = 0;

    for (const roll of rolls) {
      if (!isNaN(roll)) {
        result += +roll; // Plain numbers are added
        continue;
      }
      const regex = /^(\d*)?d(\d+)([hl])?(\d*)?$/;
      const match = roll.match(regex);

      if (match) {
        let nDices = 1
        if (match[4] === undefined && match[1] !== undefined) {
          nDices = match[1];
        } else if (match[4] !== undefined) {
          nDices = match[4]
        }
        let nSides = match[2];
        result += nSides * nDices;
      }
    }
    return result
  }
}