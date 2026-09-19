import ApiHandler from "../api-handler.js";
import { assert, TestRegistry } from "../test-registry.js";

/** @param {ApiHandler} apiHandler */
export default function registerUnitTestsForItems(apiHandler) {
  async function attributeCheckGeneral() {
    const samples = [
      { threshold: 0, modifier: 0, qualityStep: 1 },
      { threshold: 20, modifier: 0, qualityStep: 1 },
      { threshold: 10, modifier: 10, qualityStep: 1 },
      { threshold: 10, modifier: 10, qualityStep: 2 },
    ];
    const actualResults = [];

    for (const sample of samples) {
      const command =
        _diceServerConfigNoCrits({
          threshold: sample.threshold,
          modifier: sample.modifier,
        }) +
        `diceServerConfig.qualityStep = ${sample.qualityStep};` +
        `let outcome = await game.the_edge.diceServer.attributeCheck(diceServerConfig);` +
        `return outcome;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    for (let i = 0; i < samples.length; i++) {
      assert(
        actualResults[i].effectiveThreshold ==
          samples[i].threshold + samples[i].modifier,
      );
      const quality = Math.floor(
        (actualResults[i].effectiveThreshold - actualResults[i].rolls[0]) /
          samples[i].qualityStep,
      );
      assert(actualResults[i].quality == quality);
    }
  }
  TestRegistry.registerTest(
    attributeCheckGeneral,
    "DiceServer - Basic Attribute Check",
    "unit",
  );

  async function attributeCheckOutcomeSpecifics() {
    const samples = [
      { dieResult: 1, critDie: 1, critFailDie: 2 },
      { dieResult: 2, critDie: 1, critFailDie: 2 },
      { dieResult: 2, critDie: 2, critFailDie: 1 },
      { dieResult: 3, critDie: 1, critFailDie: 2 },
      { dieResult: 11, critDie: 1, critFailDie: 2 },
    ];
    const expectedResults = [
      "CritSuccess",
      "CritFailure",
      "CritSuccess",
      "Success",
      "Failure",
    ];
    const actualResults = [];

    for (const sample of samples) {
      const command =
        _diceServerConfigNoCrits({ threshold: 10 }) +
        `diceServerConfig.critDice = [${sample.critDie}];` +
        `diceServerConfig.critFailDice = [${sample.critFailDie}];` +
        `let outcome = await game.the_edge.diceServer.attributeOutcome(` +
        `  ${sample.dieResult}, diceServerConfig` +
        `);` +
        `return outcome;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].outcome == expectedResults[i]);
    }
  }
  TestRegistry.registerTest(
    attributeCheckOutcomeSpecifics,
    "DiceServer - Attribute Check Outcomes",
    "unit",
  );
}

function _diceServerConfigNoCrits(options = {}) {
  const { threshold = 20, modifier = 0 } = options;
  return (
    `let diceServerConfig = {` +
    `  threshold: ${threshold}, modifier: ${modifier}, vantage: "Nothing",` +
    `  critDice: [], critBonus: 2, critDieBonus: 2,` +
    `  critFailDice: [], critFailMalus: -2, critFailDieMalus: -2,` +
    `  critFailEvents: [], qualityStep: 1` +
    `};`
  );
}
