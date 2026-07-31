import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import NewChatServer from "../system/new_chat_server.js";
import THE_EDGE from "../system/config-the-edge.js";

const { renderTemplate } = foundry.applications.handlebars;

const { DialogV2 } = foundry.applications.api;


interface _IParseResult extends _IWeaponDataIndices {
  fireModeDetails: any
  labels: IAttackWeaponLabels
  modifiers: IAttackWeaponModifiers
  nShots: number
  threshold: number
  vantage: TVantage
}


interface _IRollDamageOutcome {
  attackRollResult: IAttackRollResult
  penetration: number
  prompt: IAttackRollPrompt
}


interface _IWeaponDataIndices {
  pIndex: number
  fireModeIndex: number
}


export default class DialogWeapon extends DialogV2 {
  declare checkData: IDialogWeaponDataExtended
  declare element: HTMLDialogElement

  constructor(checkData: IDialogWeaponDataExtended, options) {
    super(options);
    this.checkData = checkData;
  }

  static async start(checkData: IDialogWeaponData): Promise<DialogV2 | null> {
    const checkDataExtended = DialogWeapon._extendCheckData(checkData);
    // actor.system.getWeaponPlOfWeapon(weaponID)
      // ammunition: actor.items.get(weapon.system.ammunitionID),
    const config = {
      position: { width: 300, height: 380 },
      window: { title: checkData.weapon.name + " " + LocalisationServer.localise("Check") },
      content: await DialogWeapon._setupContent(checkDataExtended),
      buttons: [
        {label: LocalisationServer.localise("Cancel", "Dialog"), action: "cancel"},
        DialogWeapon._rollAttackButton()
      ]
    }

    return new DialogWeapon(checkDataExtended, config).render({ force: true });
  }


  static _extendCheckData(checkData: IDialogWeaponData): IDialogWeaponDataExtended {
    const extension = {
      distance: DialogWeapon._getDistance(checkData.token, checkData.targetIds, checkData.sceneId),
      smallestSize: DialogWeapon._getSmallestSize(checkData.targetIds, checkData.sceneId),
      sizeModifiers: THE_EDGE.sizeModifiers,
      movementModifiers: THE_EDGE.movementModifiers,
      coverModifiers: THE_EDGE.coverModifiers,
    };

    return {...checkData, ...extension};
  }


  static async _setupContent(checkData: IDialogWeaponDataExtended): Promise<string> { 

    const template = "systems/the_edge/templates/dialogs/weapon-new.hbs";
    return await renderTemplate(template, checkData);
  }


  static _rollAttackButton(): Record<string, any> {
    return {
      label: LocalisationServer.localise("Roll", "Dialog"),
      action: "rollAttack",
      callback: async (_event, _button, dialog: DialogWeapon) => {
        const parseResult = DialogWeapon._onRollParseSheet(dialog.element, dialog.checkData);
        parseResult.fireModeDetails = dialog.checkData.weapon.system.fireModes[parseResult.fireModeIndex];

        parseResult.nShots = await DialogWeapon._onRollUpdateAmmunitionGetNumberShots(
          dialog.checkData, parseResult);
        const rollDamageOutcome: _IRollDamageOutcome = await DialogWeapon._onRollRollDamage(
          dialog.checkData, parseResult);
        
        DialogWeapon._onRollApplyDamageAndPost(dialog.checkData, parseResult, rollDamageOutcome)
      }
    }
  }


  static _getDistance(aggressor: TokenDocument, targetIds: string[], sceneId: string): number | undefined {
    const scene = game.scenes.get(sceneId);
    if (scene === undefined) return undefined;

    const targets = targetIds.map(id => scene.tokens.get(id) );
    if (targets.length == 0) return undefined;

    // determine distance
    const factor = scene.grid.distance / scene.grid.size;
    const distances = targets.map(target => factor * Aux.tokenDistance(aggressor, target));
    return Math.max(...distances);
  }


  static _getSmallestSize(targetIds: string[], sceneId: string): TSize | undefined {
    // get the scene
    const scene = game.scenes.get(sceneId);

    // get the involved actors
    let smallest: number = Infinity;
    const targets = targetIds.map(id => scene.tokens.get(id));
    for (const target of targets) {
      smallest = Math.min(smallest, target.actor.system.height);
    }
    if (smallest === Infinity) return undefined;
    // @ts-expect-error
    return Object.entries(THE_EDGE.sizes).find(([_, value]) => value > smallest)[0];
  }


  static _onRollParseSheet(
    element: HTMLDialogElement, checkData: IDialogWeaponDataExtended
  ): _IParseResult {
    const labelFor: IAttackWeaponLabels = {
      cover: DialogWeapon._safeGetByName(element, "CoverSelector") as TCover,
      fireMode: DialogWeapon._safeGetByName(element, "FireSelector") ??
        checkData.weapon.system.fireModes[0].name,
      movement: DialogWeapon._safeGetByName(element, "MovementSelector") as TMovement,
      precision: (DialogWeapon._safeGetByName(element, "PrecisionSelector") ?? "aimed") as TPrecision,
      range: DialogWeapon._onRollGetRange(element, checkData.distance),
      size: (DialogWeapon._safeGetByName(element, "SizeSelector") ?? checkData.smallestSize) as TSize,
    }

    const [modifiers, modifierIndicies] = DialogWeapon._onRollGetModifiersAndIndices(
      element, checkData, labelFor);

    const threshold = Math.max(Object.values(modifiers).sum(), 1);

    return {
      threshold, labels: labelFor, modifiers, ...modifierIndicies,
      fireModeDetails: undefined, nShots: 0, // Placeholders
      vantage: DialogWeapon._safeGetByName(element, "VantageSelector") as TVantage,
    };
  }


  static _onRollGetRange(element: HTMLElement, distance: number | undefined): TDistance {
    if (distance) {
      if (distance < 2) return "less_2m";
      if (distance < 20) return "less_20m";
      if (distance < 200) return "less_200m";
      if (distance < 1000) return "less_1km";
      return "more_1km";
    }

    return (DialogWeapon._safeGetByName(element, "RangeSelector") as TDistance) ?? "less_2m";
  }

  
  static _onRollGetModifiersAndIndices(
    element: HTMLElement, checkData: IDialogWeaponDataExtended, labels: IAttackWeaponLabels
  ): [IAttackWeaponModifiers, _IWeaponDataIndices] {
    const pIndex = labels.precision == "aimed" ? 1 : 0;
    const fireModeIndex = checkData.weapon.system.fireModes.findIndex((x) => x.name === labels.fireMode);

    return [{
      coverModifier: THE_EDGE.coverModifiers[labels.cover],
      movementModifier: THE_EDGE.movementModifiers[labels.movement][pIndex],
      fireModeModifier: checkData.weapon.system.fireModes[fireModeIndex].precisionPenalty[pIndex],
      rangeModifer: checkData.weapon.system.rangeChart[labels.range][pIndex],
      sizeModifier: THE_EDGE.sizeModifiers[labels.size][pIndex],
      tempModifier: +(DialogWeapon._safeGetByName(element, "Modifier") ?? 0),
      weaponProfLevel: checkData.actor.system.getWeaponPlOfWeapon(checkData.weapon.id)
    }, {pIndex, fireModeIndex}];
  }


  static async _onRollUpdateAmmunitionGetNumberShots(
    checkData: IDialogWeaponDataExtended, parseResult: _IParseResult
  ): Promise<number> {
    const ammunition = checkData.actor.items.get(checkData.weapon.system.ammunitionID);
    const ammuCapa = ammunition.system.capacity;
    if (ammuCapa.value <= 0) {
      NewChatServer.transmitEvent(
        "FIRING EMPTY WEAPON", {name: checkData.actor.name},
        DialogWeapon._extractChatServerConfig(checkData)
      );
      return 0;
    }

    const fireModeModifier = parseResult.fireModeDetails;
    const ammuCost = Math.min(fireModeModifier.cost, ammuCapa.value);
    await ammunition.update({"system.capacity.value": ammuCapa.value - ammuCost});

    return Math.floor((ammuCost + 0.1) * fireModeModifier.dices / fireModeModifier.cost);
  }


  static async _onRollRollDamage(
    checkData: IDialogWeaponDataExtended, parseResult: _IParseResult
  ): Promise<_IRollDamageOutcome> {
    const ammunition = checkData.actor.items.get(checkData.weapon.system.ammunitionID);
    const damageRoll: string = parseResult.fireModeDetails.damage + ` + ${ammunition.system.damage.bonus}`;

    const prompt: IAttackRollPrompt = {
      damageRoll: damageRoll,
      nRolls: parseResult.nShots,
      threshold: parseResult.threshold,
      vantage: parseResult.vantage,
      ...THE_EDGE.combatConfig.attackDiceParameters(checkData.actor)
    }
    const attackRollResult: IAttackRollResult = await checkData.actor.system.rollAttackCheck(prompt);
    DialogWeapon._dispatchHook(checkData, parseResult);

    return { penetration: ammunition.system.penetration, prompt, attackRollResult };
  }


  static async _onRollApplyDamageAndPost(
    checkData: IDialogWeaponDataExtended, parseResult: _IParseResult, rollDamageOutcome: _IRollDamageOutcome
  ) {
    const chatServerConfig = DialogWeapon._extractChatServerConfig(checkData);

    const details: IDetailsWeaponCheck = DialogWeapon._generateWeaponCheckData(
      checkData, parseResult, rollDamageOutcome);
    if (checkData.targetIds.length == 0) { NewChatServer.transmitEvent("WEAPON CHECK", details, chatServerConfig) };
    for (const id of checkData.targetIds) {
      checkData["targetId"] = id;
      NewChatServer.transmitEvent("WEAPON CHECK", details, chatServerConfig);
    }
    // if (rollResult.failEvent) {
    //   NewChatServer.transmitEvent(
    //     "CRIT FAIL EVENT", {event: rollResult.failEvent, check: "Combat check"}, chatServerConfig
    //   )
    // }
  }


  static _dispatchHook(checkData: IDialogWeaponDataExtended, parseResult: _IParseResult) {
    const payload: ITheEdgeActionPayload = {
      actionType: parseResult.labels.precision =="aimed" ? "weapon check aimed" : "weapon check",
      actionCost: THE_EDGE.combatConfig.weaponAttackActionCost(parseResult.labels.precision),
      actor: checkData.actor,
    }
    Hooks.call("TheEdgeAction", payload);
  }


  static _extractChatServerConfig(checkData: IDialogWeaponDataExtended): IChatServerConfig {
    return {
      speaker: {
        actor: checkData.actor.id,
        scene: checkData.sceneId,
        token: checkData.token.id
      }
    };
  }


  static _generateWeaponCheckData(
    checkData: IDialogWeaponDataExtended, parseResult: _IParseResult, rollDamageOutcome: _IRollDamageOutcome
  ): IDetailsWeaponCheck {
    const attackRollQuery: IAttackRollQuery = {
      actor: checkData.actor,
      actorId: checkData.actor.id,
      damageRoll: rollDamageOutcome.prompt.damageRoll,
      name: checkData.weapon.name,
      sceneId: checkData.sceneId,
      threshold: rollDamageOutcome.prompt.threshold,
      token: checkData.token
    }

    return {
      attackRollQuery,
      attackRollResult: rollDamageOutcome.attackRollResult,
      isMelee: false,
      specifics: {
        labels: parseResult.labels,
        modifiers: parseResult.modifiers,
      },
      vantage: parseResult.vantage
    }
  }


  static _safeGetByName(element: HTMLElement, name: string): string | undefined {
    const target: HTMLSelectElement | HTMLInputElement | null = element.querySelector(`[name="${name}"]`);
    return target?.value;
  }
}