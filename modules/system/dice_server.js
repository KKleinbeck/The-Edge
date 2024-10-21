import ChatServer from "./chat_server.js";

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

    let outcome = undefined;
    let threshold = check.threshold + modificators.temporary;
    if (diceRes == 1)  outcome = "CritSuccess";
    else if (diceRes == 20) outcome = "CritFailure";
    else if (threshold >= diceRes) outcome = "Success";
    else outcome = "Failure";

    let details = {roll: diceRes, outcome: outcome};
    mergeObject(details, check)
    mergeObject(details, modificators)
    ChatServer.transmitRoll("AbilityCheck", details);
  }

  static async proficiencyCheck(check, modificators, transmit = true) {
    const diceRes = await new Roll("3d20").evaluate({async: true});
    let results = [];
    let failedSum = 0;
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      results.push(diceRes.dice[0].results[i].result)
      let netOutcome = check.thresholds[i] - results[i]
      failedSum += Math.min(netOutcome, 0)
      sum += netOutcome
    }

    const modificator = modificators.character + modificators.temporary;
    let result = {
      proficiency: check.name, dices: check.dices, thresholds: check.thresholds,
      results: results, character_mod: modificators.character, temporary_mod: modificators.temporary,
      advantage: modificators.advantage
    };
    if (modificator > 0) {
      // Is the modificator great enough to make the check?
      let reserves = modificator + failedSum 
      if (reserves >= 0) {
        mergeObject(result, {outcome: "Success", quality: Math.floor((modificator + sum) / 3)});
      }
      else mergeObject(result, {outcome: "Failure", quality: Math.floor(reserves / 3)});
    }
    else {
      // Negative modificator requires all checks to pass
      if (failedSum < 0) mergeObject(result, {outcome: "Failure", quality: Math.floor((modificator + failedSum) / 3)});
      else {
        mergeObject(result, {outcome: sum < -modificator ? "Failure" : "Success", quality: Math.floor((modificator + sum) / 3)});
      }
    }
    
    if (modificators.advantage != "Nothing") {
      let advantage = modificators.advantage;
      modificators.advantage = "Nothing";
      let result2 = await this.proficiencyCheck(check, modificators, false);

      switch(advantage) {
        case "Advantage":
          result = result2.quality > result.quality ? result2 : result;
          break;

        case "Disadvantage":
          result = result2.quality < result.quality ? result2 : result;
      }
    }
    if (transmit) ChatServer.transmitRoll("ProficiencyCheck", result);
    return result;
  }

  static async attackCheck(check, modificators) {
    let diceRes = []
    for (let i = 0; i < modificators.fireModeModifiers.dices; ++i) {
      diceRes.push(await this._basicRoll("1d20", true));
    }
    if (diceRes == []) return undefined;
    let hits = []
    for (const res of diceRes) hits.push(res <= check.threshold);

    if (modificators.advantage != "Nothing") {
      let diceRes2 = []
      for (let i = 0; i < modificators.fireModeModifiers.dices; ++i) {
        diceRes2.push(await this._basicRoll("1d20", true));
      }
      let hits2 = []
      for (const res of diceRes) hits2.push(res <= check.threshold);
      
      let sum1 = hits.reduce((a, b) => a+b, 0);
      let sum2 = hits2.reduce((a, b) => a+b, 0);
      if ( ((modificators.advantage == "Advantage") && (sum1 < sum2)) ||
           ((modificators.advantage == "Disadvantage") && (sum1 > sum2)) ) {
        hits = hits2
        diceRes = diceRes2
      }
    }

    // let outcome = undefined;
    // let threshold = check.threshold + modificators.temporary;
    // if (diceRes == 1)  outcome = "CritSuccess";
    // else if (diceRes == 20) outcome = "CritFailure";
    // else if (threshold >= diceRes) outcome = "Success";
    // else outcome = "Failure";

    let details = {name: check.name, rolls: [], threshold: check.threshold};
    for (let i = 0; i < modificators.fireModeModifiers.dices; ++i) {
      details.rolls.push({res: diceRes[i], hit: hits[i]})
    }
    // mergeObject(details, check)
    mergeObject(details, modificators)
    ChatServer.transmitRoll("WeaponCheck", details);
  }

  static async _genericRoll(rollDescription, isCheck = false) {
    let rolls = rollDescription.replace(/\s/g, '').split("+");
    let results = [];

    for (const roll in rolls) {
      results.push(this._basicRoll(roll))
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
    ChatServer.transmit("IllicitRole", {"_ROLE_": rollDescription}, "error")
    return undefined;
  }

  static async _randInt(min, max) {
    return Math.floor((max * Math.random() - min + 1) + min);
  }
}