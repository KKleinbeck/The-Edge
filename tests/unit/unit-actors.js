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
  async function actoAlterMaxHealth() {
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
  TestRegistry.registerTest(actoAlterMaxHealth, "Actor Max Health", "unit");


  async function actorApplyStrain() {
    const samples = [ 0, 25, 50, 100, 200 ];
    const expectedResults = [
      {strainChange:   0, strainLevel: 0}, {strainChange:  25, strainLevel: 1}, {strainChange: 50, strainLevel: 2},
      {strainChange: 100, strainLevel: 4}, {strainChange: 100, strainLevel: 4},
    ];
    const actualResults = [];

    for (const sample of samples) {
      const actor = await apiHandler.actorCreate();

      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `const strainChange = await actor.system.applyStrain(${sample});` + 
        `return { strainChange, strainLevel: actor.system.strainLevel };`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);

      await actor.delete();
    }

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].strainChange == expectedResults[i].strainChange);
      assert(actualResults[i].strainLevel  == expectedResults[i].strainLevel);
    }
  }
  TestRegistry.registerTest(actorApplyStrain, "Actor Apply Strain", "unit");


  async function actorApplyDamage() {
    const samples = [
      {crit: false, damage:  0, damageType:  "energy", name: "Weapon", penetration: 0},
      {crit: false, damage: 10, damageType:  "energy", name: "Weapon", penetration: 0},
      {crit: false, damage: 10, damageType: "kinetic", name: "Weapon", penetration: 0},
      {crit:  true, damage:  1, damageType:  "energy", name: "Weapon", penetration: 0},
    ];
    const expectedResults = [
      [],
      [{type: "light burn", damageType:  "energy", damage: 10, status: "treatable"}],
      [{type:   "abrasion", damageType: "kinetic", damage: 10, bleeding: 1}],
      [{type: "light burn", damageType:  "energy", damage: 10, bodyPart: "Head"}],
    ];
    const actualResults = [];

    for (const sample of samples) {
      const actor = await apiHandler.actorCreate();

      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.applyDamage(${JSON.stringify(sample)});` + 
        `return actor.system.wounds;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);

      await actor.delete();
    }

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].length == expectedResults[i].length);
      if (actualResults[i].length) {
        for (const key of Object.keys(actualResults[i][0])) {
          assert(actualResults[i][key] == expectedResults[i][key]);
        }
      }
    }
  }
  TestRegistry.registerTest(actorApplyDamage, "Actor Apply Damage", "unit");


  async function actorApplyStrainRepeated() {
    const samples = [ 15, 15, 15, 15, 15 ];
    const expectedResults = [
      {strainChange: 15, strainLevel: 0, value: 15}, {strainChange: 15, strainLevel: 1, value: 30},
      {strainChange: 15, strainLevel: 2, value: 45}, {strainChange: 15, strainLevel: 3, value: 60},
      {strainChange: 15, strainLevel: 3, value: 75},
    ];
    const actualResults = [];

    const actor = await apiHandler.actorCreate();

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `const strainChange = await actor.system.applyStrain(${sample});` + 
        `return { strainChange, strainLevel: actor.system.strainLevel, value: actor.system.strain.value };`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].strainChange == expectedResults[i].strainChange);
      assert(actualResults[i].strainLevel  == expectedResults[i].strainLevel);
      assert(actualResults[i].value        == expectedResults[i].value);
    }
  }
  TestRegistry.registerTest(actorApplyStrainRepeated, "Actor Apply Strain Repeated", "unit");


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


  async function actorDetermineBleeding() {
    const samples = [
      {damage:  0, threshold: 10}, {damage: 10, threshold: 10}, {damage: 25, threshold: 10},
    ];
    const expectedResults = [0, 1, 2];
    const actualResults = [];

    const actor = await apiHandler.actorCreate();

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `return actor.system.constructor._determineBleeding(${sample.damage}, ${sample.threshold});`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) actualResults[i] >= expectedResults[i];
  }
  TestRegistry.registerTest(actorDetermineBleeding, "Actor Apply Damage", "unit");


  async function actorLevelingAttributes() {
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
  TestRegistry.registerTest(actorLevelingAttributes, "Actor Leveling Attributes", "unit");


  async function actorLevelingProficiencies() {
    const samples = [ 2, 4, 6, 8 ];
    const expectedResults = samples.map(x => accumulate(THE_EDGE.profCost, x));
    const actualResults = [];

    const actor = await apiHandler.actorCreate();

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.proficiencies.physical.climbing.advances", ${sample});` + 
        `return actor.system.PracticeHours.used;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) assert(actualResults[i] == expectedResults[i]);
  }
  TestRegistry.registerTest(actorLevelingProficiencies, "Actor Leveling Proficiencies", "unit");


  async function actorMaxStrain() {
    const actor = await apiHandler.actorCreate();

    const samples = [ {strain: 0, end: 0}, {strain: 0, end: 5}, {strain: 5, end: 0}, {strain: 5, end: 5} ];
    const expectedResults = [100, 105, 110, 115];
    const actualResults = [];

    for (const sample of samples) {
      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.attributes.end.advances", ${sample.end});` + 
        `await actor.system.changeCoreValue("system.strain.max.advances", ${sample.strain});` + 
        `return actor.system.strain.max.value;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await actor.delete();

    for (let i = 0; i < samples.length; i++) assert(actualResults[i] == expectedResults[i]);
  }
  TestRegistry.registerTest(actorMaxStrain, "Actor Leveling Max Strain", "unit");


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


  async function actorWeaponProficiencyLevel() {
    const samples = [
      {general:  0, SABs:  0, LMGs: 0}, {general: 10, SABs:  0, LMGs: 0}, {general:  0, SABs: 10, LMGs: 0},
      {general: 10, SABs: 10, LMGs: 0}, {general: 10, SABs:  9, LMGs: 0}, {general: 11, SABs:  9, LMGs: 0},
      {general: 10, SABs: 10, LMGs: 4},
    ];
    const expectedResults = [
      {SABvalue:  0, SABactual:  0}, {SABvalue:  0, SABactual:  5}, {SABvalue:  0, SABactual:  0},
      {SABvalue: 10, SABactual: 10}, {SABvalue:  9, SABactual:  9}, {SABvalue:  9, SABactual: 10},
      {SABvalue: 10, SABactual: 11},
    ]
    const actualResults = [];

    for (const sample of samples) {
      const actor = await apiHandler.actorCreate();

      const command = `const actor = game.actors.get("${actor.data._id}");` +
        `await actor.system.changeCoreValue("system.weapons.general.General weapon proficiency.advances", ${sample.general});` + 
        `await actor.system.changeCoreValue("system.weapons.energy.SABs.advances", ${sample.SABs});` + 
        `await actor.system.changeCoreValue("system.weapons.kinetic.LMGs.advances", ${sample.LMGs});` + 
        `return {SABvalue: actor.system.weapons.energy.SABs.value, SABactual: actor.system.getWeaponLevel("SABs")};`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);

      await actor.delete();
    }

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].SABvalue  == expectedResults[i].SABvalue);
      assert(actualResults[i].SABactual == expectedResults[i].SABactual);
    }
  }
  TestRegistry.registerTest(actorWeaponProficiencyLevel, "Actor Weapon Proficiency Level", "unit");

  // Status Effect Thresholds
  // Wounds
  // Apply Damage
}