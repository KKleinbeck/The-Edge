import ApiHandler from "../api-handler.js";
import { assert, TestRegistry } from "../test-registry.js";

import THE_EDGE from "../../built/system/config-the-edge.js";

/** @param {ApiHandler} apiHandler */
export default function registerUnitTestsForItems(apiHandler) {
  async function armourProtectCorrectBodyPart() {
    const samples = [
      { damage: 10, penetration: 0, damageType: "energy", location: "Torso" },
      { damage: 50, penetration: 0, damageType: "energy", location: "Torso" },
      { damage: 200, penetration: 0, damageType: "energy", location: "Torso" },
    ];
    const itemPayloads = [
      { absorption: 0, threshold: 0 },
      { absorption: 5, threshold: 10 },
      { absorption: 5, threshold: 100 },
    ];
    const expectedResults = [];
    const actualResults = [];

    for (const partialPayload of itemPayloads) {
      for (const sample of samples) {
        const item = await apiHandler.itemCreate({
          type: "Armour",
          systemPayload: {
            bodyPart: "Torso",
            structurePoints: 100,
            protection: {
              energy: partialPayload,
              kinetic: partialPayload,
              elemental: partialPayload,
            },
          },
        });

        const command =
          `const item = game.items.get("${item.data._id}");` +
          `await item.system.protect(${sample.damage}, ${sample.penetration},` +
          ` "${sample.damageType}", "${sample.location}", []);` +
          `return {structurePoints: item.system.structurePoints, name: item.name};`;
        const result = await apiHandler.runCommand(command);
        actualResults.push(result);

        const expectedDamage =
          100 -
          Math.max(
            Math.min(
              sample.damage - partialPayload.absorption,
              partialPayload.threshold,
            ),
            0,
          );
        expectedResults.push(expectedDamage);

        await item.delete();
      }
    }

    for (let i = 0; i < actualResults.length; i++) {
      assert(actualResults[i].structurePoints == expectedResults[i]);
      if (expectedResults[i] == 0)
        assert(actualResults[i].name.includes("Broken"));
    }
  }
  TestRegistry.registerTest(
    armourProtectCorrectBodyPart,
    "Armour Protection on Correct Body Part",
    "unit",
  );

  async function armourProtectBodyParts() {
    const samples = [
      { damage: 1, penetration: 0, damageType: "energy", location: "Torso" },
      { damage: 1, penetration: 0, damageType: "energy", location: "ArmsLeft" },
      { damage: 1, penetration: 0, damageType: "energy", location: "Head" },
    ];
    const bodyParts = ["Torso", "Torso_Arms", "Below_Neck", "Head"];
    const expectedResults = [];
    const actualResults = [];

    for (const bodyPart of bodyParts) {
      for (const sample of samples) {
        const item = await apiHandler.itemCreate({
          type: "Armour",
          systemPayload: {
            bodyPart,
            protection: {
              energy: { absorption: 0, threshold: 1 },
              kinetic: { absorption: 0, threshold: 1 },
              elemental: { absorption: 0, threshold: 1 },
            },
          },
        });

        const command =
          `const item = game.items.get("${item.data._id}");` +
          `await item.system.protect(${sample.damage}, ${sample.penetration},` +
          ` "${sample.damageType}", "${sample.location}", []);` +
          `return item.system.structurePoints;`;
        const result = await apiHandler.runCommand(command);
        actualResults.push(result);

        expectedResults.push(
          THE_EDGE.cover_map[bodyPart].includes(sample.location),
        );

        await item.delete();
      }
    }

    for (let i = 0; i < actualResults.length; i++) {
      assert(
        expectedResults[i] ? actualResults[i] == 9 : actualResults[i] == 10,
      );
    }
  }
  TestRegistry.registerTest(
    armourProtectBodyParts,
    "Armour Protection on varying Body Part",
    "unit",
  );

  async function armourProtectDamageTypes() {
    const samples = [
      { damage: 1, penetration: 0, damageType: "energy", location: "Torso" },
      { damage: 1, penetration: 0, damageType: "kinetic", location: "Torso" },
      { damage: 1, penetration: 0, damageType: "elemental", location: "Torso" },
    ];
    const protectionFrom = ["energy", "kinetic", "elemental"];
    const expectedResults = [];
    const actualResults = [];

    for (const protectedElement of protectionFrom) {
      for (const sample of samples) {
        const item = await apiHandler.itemCreate({
          type: "Armour",
          systemPayload: {
            protection: {
              energy: {
                absorption: 0,
                threshold: protectedElement == "energy" ? 1 : 0,
              },
              kinetic: {
                absorption: 0,
                threshold: protectedElement == "kinetic" ? 1 : 0,
              },
              elemental: {
                absorption: 0,
                threshold: protectedElement == "elemental" ? 1 : 0,
              },
            },
          },
        });

        const command =
          `const item = game.items.get("${item.data._id}");` +
          `await item.system.protect(${sample.damage}, ${sample.penetration},` +
          ` "${sample.damageType}", "${sample.location}", []);` +
          `return item.system.structurePoints;`;
        const result = await apiHandler.runCommand(command);
        actualResults.push(result);

        expectedResults.push(protectedElement == sample.damageType ? 9 : 10);

        await item.delete();
      }
    }

    for (let i = 0; i < actualResults.length; i++)
      assert(actualResults[i] == expectedResults[i]);
  }
  TestRegistry.registerTest(
    armourProtectDamageTypes,
    "Armour Protection on varying DamageTypes",
    "unit",
  );

  async function onIconSelectedAmmunition() {
    const samples = [
      { iconType: "type", value: "kinetic" },
      { iconType: "subtype", value: "large" },
      { iconType: "subtype", value: "custom" },
      { iconType: "type", value: "energy" },
    ];
    const expectedResults = [
      { type: "kinetic", subtype: "small" },
      { type: "kinetic", subtype: "large" },
      { type: "kinetic", subtype: "custom" },
      { type: "energy", subtype: "custom" },
    ];
    const actualResults = [];

    const item = await apiHandler.itemCreate({ type: "Ammunition" });

    for (const sample of samples) {
      const command =
        `const item = game.items.get("${item.data._id}");` +
        `await item.sheet.render(true);` +
        `await item.sheet.onIconSelected("${sample.iconType}", "${sample.value}");` +
        `return {type: item.system.type, subtype: item.system.subtype};`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await item.delete();

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].type == expectedResults[i].type);
      assert(actualResults[i].subtype == expectedResults[i].subtype);
    }
  }
  TestRegistry.registerTest(
    onIconSelectedAmmunition,
    "onIconSelected Ammunition",
    "unit",
  );

  async function onIconSelectedGrenade() {
    const samples = [
      { iconType: "grenadeEffect", value: "smoke" },
      { iconType: "grenadeEffect", value: "emp" },
      { iconType: "grenadeEffect", value: "smoke" }, // Toggle smoke off again
      { iconType: "grenadeEffect", value: "shellshock" },
    ];
    const expectedResults = [
      {
        shellshock: { active: false },
        emp: { active: false },
        smoke: { active: true },
      },
      {
        shellshock: { active: false },
        emp: { active: true },
        smoke: { active: true },
      },
      {
        shellshock: { active: false },
        emp: { active: true },
        smoke: { active: false },
      },
      {
        shellshock: { active: true },
        emp: { active: true },
        smoke: { active: false },
      },
    ];
    const actualResults = [];

    const item = await apiHandler.itemCreate({
      type: "Consumables",
      systemPayload: { current_type: "grenade" },
    });

    for (const sample of samples) {
      const command =
        `const item = game.items.get("${item.data._id}");` +
        `await item.sheet.render(true);` +
        `await item.sheet.onIconSelected("${sample.iconType}", "${sample.value}");` +
        `return item.system.subtypes.grenade.effects;`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
    }

    await item.delete();

    for (let i = 0; i < samples.length; i++) {
      assert(
        actualResults[i].shellshock.active ==
          expectedResults[i].shellshock.active,
      );
      assert(actualResults[i].emp.active == expectedResults[i].emp.active);
      assert(actualResults[i].smoke.active == expectedResults[i].smoke.active);
    }
  }
  TestRegistry.registerTest(
    onIconSelectedGrenade,
    "onIconSelected Grenade",
    "unit",
  );

  async function onMaxLevelChange() {
    const item = await apiHandler.itemCreate({ type: "Skill" });

    const command =
      `const item = game.items.get("${item.data._id}");` +
      `const nEffects0 = item.system.effects.length;` +
      `const nRequirements0 = item.system.requirements.length;` +
      `await item.sheet.render(true);` +
      `var mockEvent = {target: {value: 3}};` +
      `await item.sheet._onMaxLevelChange(mockEvent);` +
      `const nEffects1 = item.system.effects.length;` +
      `const nRequirements1 = item.system.requirements.length;` +
      `mockEvent = {target: {value: 2}};` +
      `await item.sheet._onMaxLevelChange(mockEvent);` +
      `const nEffects2 = item.system.effects.length;` +
      `const nRequirements2 = item.system.requirements.length;` +
      `return {nEffects0, nRequirements0, nEffects1, nRequirements1,` +
      `nEffects2, nRequirements2};`;
    const result = await apiHandler.runCommand(command);

    await item.delete();

    assert(result.nEffects0 == 1);
    assert(result.nRequirements0 == 1);
    assert(result.nEffects1 == 3);
    assert(result.nRequirements1 == 3);
    assert(result.nEffects2 == 2);
    assert(result.nRequirements2 == 2);
  }
  TestRegistry.registerTest(onMaxLevelChange, "onMaxLevelChange Skill", "unit");

  async function setTypesDictAmmunition() {
    const expectedTypes = ["energy", "kinetic"];
    const expectedSubtypes = ["small", "large"];

    const item = await apiHandler.itemCreate({ type: "Ammunition" });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `return {` +
      `  types: Object.keys(item.sheet._setTypesDict()),` +
      `  subTypes: Object.keys(item.sheet._setSubtypesDict())` +
      `};`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(expectedTypes.length == result.types.length);
    assert(expectedSubtypes.length == result.subTypes.length);
    for (const expectedEntry of expectedTypes)
      assert(result.types.includes(expectedEntry));
    for (const expectedEntry of expectedSubtypes)
      assert(result.subTypes.includes(expectedEntry));
  }
  TestRegistry.registerTest(
    setTypesDictAmmunition,
    "setTypesDict Ammunition",
    "unit",
  );

  async function setTypesDictArmour() {
    const expectedResult = [
      "Torso",
      "Torso_Arms",
      "Legs",
      "Below_Neck",
      "Head",
      "Entire",
    ];

    const item = await apiHandler.itemCreate({ type: "Armour" });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `return Object.keys(item.sheet._setTypesDict());`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(expectedResult.length == result.length);
    for (const expectedEntry of expectedResult)
      assert(result.includes(expectedEntry));
  }
  TestRegistry.registerTest(setTypesDictArmour, "setTypesDict Armour", "unit");

  async function setTypesDictWeapon() {
    const expectedResult = ["small", "large"];

    const item = await apiHandler.itemCreate({ type: "Weapon" });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `return Object.keys(item.sheet._setAmmunitionTypesDict());`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(expectedResult.length == result.length);
    for (const expectedEntry of expectedResult)
      assert(result.includes(expectedEntry));
  }
  TestRegistry.registerTest(setTypesDictWeapon, "setTypesDict Weapon", "unit");

  async function toggleEquipped() {
    const samples = ["Armour", "Weapon"];
    const actualResults = [];

    for (const sample of samples) {
      const item = await apiHandler.itemCreate({ type: sample });
      const command =
        `const item = game.items.get("${item.data._id}");` +
        `const initial = item.system.equipped;` +
        `const toggle1 = await item.system.toggleEquipped();` +
        `const toggle2 = await item.system.toggleEquipped();` +
        `return {initial, toggle1, toggle2};`;
      const result = await apiHandler.runCommand(command);
      actualResults.push(result);
      await item.delete();
    }

    for (let i = 0; i < samples.length; i++) {
      assert(actualResults[i].initial == false);
      assert(actualResults[i].toggle1 == true);
      assert(actualResults[i].toggle2 == false);
    }
  }
  TestRegistry.registerTest(toggleEquipped, "Item Toggle Equipped", "unit");

  async function useOne() {
    const item = await apiHandler.itemCreate({
      type: "Consumables",
      systemPayload: { quantity: 2 },
    });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `const initial = item.system.quantity;` +
      `await item.useOne();` +
      `const afterUse = item.system.quantity;` +
      `return {initial, afterUse};`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(result.initial == 2);
    assert(result.afterUse == 1);
  }
  TestRegistry.registerTest(useOne, "Item useOne", "unit");

  async function weaponModifyFiringModes() {
    const item = await apiHandler.itemCreate({ type: "Weapon" });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `const nFireModes0 = item.system.fireModes.length;` +
      `await item.sheet.render(true);` +
      `await item.sheet.constructor._addFiringMode.call(item.sheet);` +
      `const nFireModesPostAdd = item.system.fireModes.length;` +
      `const mockModifyEvent = {target: {dataset: {index: 0, field: "name"}, value: "Test"}};` +
      `await item.sheet._onModeModify(mockModifyEvent);` +
      `const modifiedName = item.system.fireModes[0].name;` +
      `const mockDeleteTarget = {dataset: {index: 1}};` +
      `await item.sheet.constructor._deleteFiringMode.call(item.sheet, undefined, mockDeleteTarget);` +
      `const nFireModesPostDelete = item.system.fireModes.length;` +
      `return {nFireModes0, nFireModesPostAdd, nFireModesPostDelete, modifiedName};`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(result.nFireModes0 == 1);
    assert(result.nFireModesPostAdd == 2);
    assert(result.nFireModesPostDelete == 1);
    assert(result.modifiedName == "Test");
  }
  TestRegistry.registerTest(
    weaponModifyFiringModes,
    "Weapon Modify Firing Modes",
    "unit",
  );

  async function weaponDamageType() {
    const item = await apiHandler.itemCreate({ type: "Weapon" });
    const command =
      `const item = game.items.get("${item.data._id}");` +
      `const damageType0 = item.system.damageType;` +
      `await item.update({"system.type": "LMGs"});` +
      `const damageType1 = item.system.damageType;` +
      `await item.update({"system.isElemental": true});` +
      `const damageType2 = item.system.damageType;` +
      `return {damageType0, damageType1, damageType2};`;
    const result = await apiHandler.runCommand(command);
    await item.delete();

    assert(result.damageType0 == "energy");
    assert(result.damageType1 == "kinetic");
    assert(result.damageType2 == "elemental");
  }
  TestRegistry.registerTest(weaponDamageType, "Weapon Damage Type", "unit");

  // item-sheet: Consumables, Skill, Weapon getModifiers with mock target
  // item-sheet: Consumables, Skill, Weapon updateModifiers
}
