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
  static async attributeCheck(check, modificators) {
    let diceRes = await this._basicRoll("1d20", true);
    if (diceRes === undefined) return undefined;

    if (modificators.advantage != "Nothing") {
      const diceRes2 = await this._basicRoll("1d20", true);

      if ( ((modificators.advantage == "Advantage") && (diceRes2 < diceRes)) ||
           ((modificators.advantage == "Disadvantage") && (diceRes2 > diceRes)) ) {
        diceRes = diceRes2;
      }
    }

    let threshold = check.threshold + modificators.temporary;
    let basicQuality = Math.floor((threshold - diceRes) / 2)
    if (diceRes == 1) return {outcome: "CritSuccess", roll: diceRes, quality: Math.max(basicQuality + 2, 2)};
    else if (diceRes == 20) return {outcome: "CritFailure", roll: diceRes, quality: Math.min(basicQuality - 2, -2)};
    return {outcome: (threshold >= diceRes) ? "Success" : "Failure", roll: diceRes, quality: basicQuality};
  }

  static async proficiencyCheck(check, modificators) {
    const diceRes = await new Roll("3d20").evaluate();
    let diceResults = [];
    let failedSum = 0;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      diceResults.push(diceRes.dice[0].results[i].result)
      let netOutcome = check.thresholds[i] - diceResults[i]
      failedSum += Math.min(netOutcome, 0)
      sum += netOutcome
    }

    const modificator = modificators.modificator;
    let results = undefined;
    if (modificator > 0) {
      // Is the modificator great enough to make the check?
      let reserves = modificator + failedSum 
      if (reserves >= 0) {
        results = {outcome: "Success", quality: Math.floor((modificator + sum) / 3)};
      }
      else results = {outcome: "Failure", quality: Math.floor(reserves / 3)};
    }
    else {
      // Negative modificator requires all checks to pass
      if (failedSum < 0) results = {outcome: "Failure", quality: Math.floor((modificator + failedSum) / 3)};
      else results = {outcome: sum < -modificator ? "Failure" : "Success", quality: Math.floor((modificator + sum) / 3)};
    }
    foundry.utils.mergeObject(results, {diceResults: diceResults})
    
    if (modificators.advantage != "Nothing") {
      let advantage = modificators.advantage;
      modificators.advantage = "Nothing";
      let results2 = await this.proficiencyCheck(check, modificators);

      if ( (advantage == "Advantage" && results2.quality > results.quality) ||
           (advantage == "Disadvantage" && results2.quality < results.quality) ) {
        return results2;
      }
    }
    return results;
  }

  static async attackCheck(modificators) {
    let diceRes = []
    for (let i = 0; i < modificators.dicesEff; ++i) {
      diceRes.push(await this._basicRoll("1d20", true));
    }
    if (diceRes == []) return undefined;
    let hits = []
    for (const res of diceRes) hits.push(res <= modificators.threshold);

    if (modificators.advantage != "Nothing") {
      let diceRes2 = []
      for (let i = 0; i < modificators.dicesEff; ++i) {
        diceRes2.push(await this._basicRoll("1d20", true));
      }
      let hits2 = []
      for (const res of diceRes2) hits2.push(res <= modificators.threshold);
      
      let sum = hits.sum();
      let sum2 = hits2.sum();
      if ( ((modificators.advantage == "Advantage") && (sum < sum2)) ||
           ((modificators.advantage == "Disadvantage") && (sum > sum2)) ) {
        hits = hits2
        diceRes = diceRes2
      }
    }

    let damage = []
    let crits = []
    for (let i = 0; i < diceRes.length; ++i) {
      if (!hits[i]) continue;

      damage.push((await this._genericRoll(modificators.fireModeModifier.damage)).sum())
      if (diceRes[i] == 1) {
        damage[damage.length-1] += this._max(modificators.fireModeModifier.damage);
        crits.push(true)
      } else crits.push(false)
    }

    return [crits, damage, diceRes, hits];
  }

  static async _genericRoll(rollDescription, isCheck = false) {
    let rolls = rollDescription.replace(/\s/g, '').split("+");
    let results = [];

    for (const roll of rolls) {
      if (!isNaN(roll)) results.push(+roll); // Plain numbers are added
      else results.push(await this._basicRoll(roll, isCheck));
    }
    return results
  }

  static async _basicRoll(rollDescription, isCheck = false) {
    //just an individual role, i.e., '2d3d20h2'
    const regex = /^(\d*)?([ad])?(\d*)?d(\d+)([hl])?(\d*)?$/;
    const match = rollDescription.match(regex);

    if (match) {
      let nVantageRolls = undefined;
      let vantageRolls = match[2];
      let nDices = undefined;
      let nSides = match[4];
      let subsetType = match[5];
      let nSubset = match[6] ? match[6] : 1;

      // Parameter Setup
      if (vantageRolls) {
        nVantageRolls = match[1] ? match[1] : 2;
        if (nVantageRolls == 1) {
          return undefined;
        }
        nDices = match[3] ? match[3] : 1;
      }
      else {
        nDices = match[1] ? match[1] : 1;
        nVantageRolls = 1; // pseudo so that we prevent conditions later
      }

      if (subsetType && nSubset >= nDices) {
        return undefined;
      }

      // Roll generation
      let vantageResults = [];
      for (let i = 1; i <= nVantageRolls; ++i) {
        let results = []
        for (let j = 1; j <= nDices; ++j) {
          results.push(await this._randInt(1, nSides));
        }
        switch (subsetType) {
          case "h":
            vantageResults.push(
              results.sort((a, b) => a-b).slice(-nSubset).reduce((a, b) => a + b, 0)
            );
            break;
          case "l":
            vantageResults.push(
              results.sort((a, b) => a-b).slice(0, nSubset).reduce((a, b) => a + b, 0)
            );
            break;
          default:
            vantageResults.push(
              results.reduce((a,b) => a + b, 0)
            )
        }
      }
      switch (vantageRolls) {
        case "a":
          return isCheck ? Math.min(...vantageResults) : Math.max(...vantageResults);
        case "d":
          return isCheck ? Math.max(...vantageResults) : Math.max(...vantageResults);
        default: // Only one dice roll
          return vantageResults[0];
      }
    }

    // If no match
    let msg = LocalisationServer.parsedLocalisation("IllicitRole", "CHATERROR", {"_ROLE_": rollDescription})
    ui.notifications.notify(msg)
    return undefined;
  }

  static async _randInt(min, max) {
    return Math.floor((max * Math.random() - min + 1) + min);
  }
  
  static _max(rollDescription) {
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