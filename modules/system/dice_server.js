import LocalisationServer from "./localisation_server.js";

export default class DiceServer {
  // [2]a1d20 + 3d3d10h2 + 5d6l3, [1]d20+60
  // Meaning:
  // - [n=2]a: advantage (default highest of two rolls)
  // - [n=2]d: disadvantage (default lowest of two rolls)
  // - [n=1]d: dices
  // - h[n]: take highest n dices
  // - l[n]: take lowest n dices
  // - KOMMA: return mutliple rolls
  constructor() {
    const interpretTemplate = {
      crit: [1], critFail: [20], critFailTable: []
    }

    this.interpretationParams = {
      attribute: structuredClone(interpretTemplate),
      proficiency: structuredClone(interpretTemplate),
      combat: structuredClone(interpretTemplate),
    }
    this.interpretationParams.attribute.qualityStep = 2;
    this.interpretationParams.proficiency.qualityStep = 4;
  }

  _selectVantageOutcome(vantage, roll1, roll2) {
    console.log("Vantaging")
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
      case "attribute":
        if (interpretationParams.crit.includes(roll.diceResult)) {
          outcome = "CritSuccess"
          basicQuality = Math.max(basicQuality + 2, 2);
        }
        if (interpretationParams.critFail.includes(roll.diceResult)) {
          outcome = "CritFailure"
          basicQuality = Math.min(basicQuality - 2, -2);
        }
        break;

      case "proficiency":
        for (const dice of roll.diceResults) {
          if (interpretationParams.crit.includes(dice)) basicQuality += 2;
          if (interpretationParams.critFail.includes(dice)) basicQuality -= 2;
        }
        break;
      
      case "combat":
        let damage = []
        let crits = []
        for (let i = 0; i < details.dices; ++i) {
          if (!roll.hits[i]) continue;

          damage.push((await this._genericRoll(details.damageDice)))
          if (interpretationParams.crit.includes(roll.diceResults[i])) {
            damage[damage.length-1] += this._max(details.damageDice);
            crits.push(true)
          } else crits.push(false)
        }

        return [crits, damage, roll.diceResults, roll.hits];
    }

    let interpretation = {outcome: outcome, quality: basicQuality};
    foundry.utils.mergeObject(interpretation, roll);
    return interpretation;
  }

  async attributeCheck(threshold, vantage) {
    let roll = await this._attributeRoll(threshold);

    if (vantage == "Advantage" || vantage == "Disadvantage") {
      const roll2 = this._attributeRoll(threshold);
      roll = this._selectVantageOutcome(vantage, roll, roll2);
    }

    return this._interpretCheck("attribute", roll);
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

    return this._interpretCheck("proficiency", roll);
  }

  async _proficiencyRoll(thresholds, modificator) {
    const diceRes = await new Roll("3d20").evaluate();
    let diceResults = [];
    let failedSum = 0;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      diceResults.push(diceRes.dice[0].results[i].result)
      let netOutcome = thresholds[i] - diceResults[i]
      failedSum += Math.min(netOutcome, 0)
      sum += netOutcome
    }

    let netOutcome = modificator + ((modificator >= -failedSum || failedSum == 0) ? sum : failedSum);
    return {diceResults: diceResults, netOutcome: netOutcome};
  }

  async attackCheck(dices, threshold, vantage, damageDice) {
    let roll = await this._attackRoll(dices, threshold);

    if (vantage == "Advantage" || vantage == "Disadvantage") {
      const roll2 = await this._attackRoll(dices, threshold);
      roll = this._selectVantageOutcome(vantage, roll, roll2)
    }

    return this._interpretCheck("combat", roll, {damageDice: damageDice, dices: dices});
  }

  async _attackRoll(dices, threshold) {
    let diceRes = []
    for (let i = 0; i < dices; ++i) diceRes.push(await this._genericRoll("1d20"));
    let hits = diceRes.map(x => x <= threshold);
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