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
  static async attributeCheck(threshold, ability) {
    const diceRes = await this._basicRoll("1d20", true);
    if (diceRes === undefined) return undefined;

    let outcome = undefined;
    if (diceRes == 1)  outcome = "CritSuccess";
    else if (diceRes == 20) outcome = "CritFailure";
    else if (threshold >= diceRes) outcome = "Success";
    else outcome = "Failure";
    ChatServer.transmitRoll("AbilityCheck", {ability: ability, roll: diceRes, outcome: outcome, threshold: threshold})
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
        console.log(results)
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
      console.log(vantageResults)
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