import ChatServer from "./chat_server.js";

export default class DiceServer {
  // [2]a1d20 + 3d3d10h2 + 5d6l3, [1]d20
  // Meaning:
  // - [n=2]a: advantage (default highest of two rolls)
  // - [n=2]d: disadvantage (default lowest of two rolls)
  // - [n=1]d: dices
  // - h[n]: take highest n dices
  // - l[n]: take lowest n dices
  // - KOMMA: return mutliple rolls
  static async attributeCheck(threshold) {
    const res = (await this._basicRoll("1d20h3"));
    if (res === undefined) return undefined;
    const diceRes = res[0];

    console.log(diceRes)
    if (threshold > diceRes) {
      console.log("Success");
    }
    else {
      console.log("Failed Check")
    }
  }

  static async _basicRoll(rollDescription) {
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

      if (vantageRolls) {
        nVantageRolls = match[1] ? match[1] : 2;
        if (nVantageRolls == 1) {
          ChatServer.transmitError("DiceAdvantage", {"_ROLE_": rollDescription});
          return undefined;
        }
        nDices = match[3] ? match[3] : 1;
      }
      else {
        nDices = match[1] ? match[1] : 1;
      }
      if (vantageRolls) {
        console.log("(Dis-)Adv rolls:", nVantageRolls);
        console.log("(Dis-)Advantage:", vantageRolls);
      }
      console.log("Number dices:   ", nDices);
      console.log("Sides dice:     ", nSides);
      if (subsetType) {
        console.log("Highest/Lowest: ", subsetType);
        console.log("N accapted dice:", nSubset);
        if (nSubset >= nDices) {
          ChatServer.transmitError("DiceSubset", {"_SUBSET_": nSubset, "_DICE_": nDices, "_ROLE_": rollDescription});
          return undefined;
        }
      }
    }

    return [11];
  }

  static async _randInt(min, max) {
    Math.floor((max * Math.random() - min + 1) + min)
  }
}