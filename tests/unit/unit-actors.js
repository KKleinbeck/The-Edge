import ApiHandler from "../api-handler.js";
import { assert, TestRegistry } from "../test-registry.js"

import THE_EDGE from "../../built/system/config-the-edge.js"


function accumulate(func, to, from = 0) {
  var acc = 0;
  for (let i = from; i < to; ++i) acc += func(i);
  return acc;
}


/** @param {ApiHandler} apiHandler */
export default function registerUnitTestsForActors(apiHandler) {
  async function levelingActor() {
    const actor = await apiHandler.actorCreate();

    const samples = [1, 2, 3, 5, 7, 10, 12, 5, 2];
    const expectedCosts = samples.map(x => accumulate(THE_EDGE.attrCost, x));
    const actualCosts = [];
    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.attributes.end.advances", ${sample});` + 
        `return actor.system.PracticeHours.used;`;
      const practiceHoursUsed = await apiHandler.runCommand(command);
      actualCosts.push(practiceHoursUsed);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) assert(actualCosts[i] == expectedCosts[i]);
  }
  TestRegistry.registerTest(levelingActor, "Actor Leveling Attributes", "unit");


  async function maxHealth() {
    const actor = await apiHandler.actorCreate();

    const samples = [
      {end: 2, res: 0}, {end: 0, res: 2}, {end: 3, res: 0}, {end: 4, res: 4}, {end: 3, res: 5}
    ];
    const expectedMaxHealth = [101, 101, 101, 104, 104];
    const actualMaxHealth = [];

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.attributes.end.advances", ${sample.end});` + 
        `await actor.system.changeCoreValue("system.attributes.res.advances", ${sample.res});` + 
        `return actor.system.health.max.value;`;
      const maxHealth = await apiHandler.runCommand(command);
      actualMaxHealth.push(maxHealth);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) assert(actualMaxHealth[i] == expectedMaxHealth[i]);
  }
  TestRegistry.registerTest(maxHealth, "Actor Max Health", "unit");


  async function actorSpeeds() {
    const actor = await apiHandler.actorCreate();

    const samples = [
      {spd: 0, foc: 0}, {spd: 0, foc: 8}, {spd: 2, foc: 8}, {spd: 6, foc: 8}, {spd: 12, foc: 12}
    ];
    const expectedSpeeds = [
      {stride: 0, run: 0, sprint: 0}, {stride: 5, run: 7, sprint: 8}, {stride: 5, run: 7, sprint: 9},
      {stride: 6, run: 9, sprint: 12}, {stride: 7, run: 11, sprint: 16}
    ];
    const actualSpeeds = [];

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.attributes.spd.advances", ${sample.spd});` + 
        `await actor.system.changeCoreValue("system.attributes.foc.advances", ${sample.foc});` + 
        `return {stride: actor.system.strideSpeed, run: actor.system.runSpeed, sprint: actor.system.sprintSpeed};`;
      const speeds = await apiHandler.runCommand(command);
      actualSpeeds.push(speeds);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) {
      assert(actualSpeeds[i].stride == expectedSpeeds[i].stride);
      assert(actualSpeeds[i].run    == expectedSpeeds[i].run);
      assert(actualSpeeds[i].sprint == expectedSpeeds[i].sprint);
    }
  }
  TestRegistry.registerTest(actorSpeeds, "Actor Speeds", "unit");


  async function actorCombatics() {
    const actor = await apiHandler.actorCreate();

    const samples = [
      {str: 0, crd: 0, h2h: 0, gen:  0}, {str: 0, crd: 0, h2h: 0, gen: 10}, {str: 2, crd: 2, h2h: 0, gen: 10},
      {str: 1, crd: 3, h2h: 0, gen: 10}, {str: 3, crd: 4, h2h: 0, gen: 10}, {str: 8, crd: 8, h2h: 8, gen: 10},
    ];
    const expectedResults = [
      {general: 0, combatics: 0, damage: "1d0+0"}, {general: 0, combatics:  5, damage: "1d0+0"},
      {general: 2, combatics: 6, damage: "1d4+2"}, {general: 2, combatics:  6, damage: "1d4+1"},
      {general: 3, combatics: 6, damage: "1d7+3"}, {general: 8, combatics: 13, damage: "1d16+8"}
    ];
    const actualResults = [];

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.attributes.str.advances", ${sample.str});` + 
        `await actor.system.changeCoreValue("system.attributes.crd.advances", ${sample.crd});` + 
        `await actor.system.changeCoreValue("system.weapons.general.General weapon proficiency.advances", ${sample.gen});` + 
        `await actor.system.changeCoreValue("system.weapons.general.Hand-to-Hand combat.advances", ${sample.h2h});` + 
        `return {general: actor.system.combaticsGeneralPl, combatics: actor.system.combaticsPL, damage: actor.system.combaticsDamage};`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].combatics == expectedResults[i].combatics);
      assert(actualResults[i].damage    == expectedResults[i].damage);
      assert(actualResults[i].general   == expectedResults[i].general);
    }
  }
  TestRegistry.registerTest(actorCombatics, "Actor Combatics Level", "unit");

  // Todo Apply Strain
  // Proficiency Leveling
  // Strain Levels
  // Status Effect Thresholds
  // Weapon proficieny level
}