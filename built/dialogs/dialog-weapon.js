import Aux from "../system/auxilliaries.js";
import LocalisationServer from "../system/localisation_server.js";
import ChatServer from "../system/chat_server.js";
import THE_EDGE from "../system/config-the-edge.js";
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;
export default class DialogWeapon extends DialogV2 {
    constructor(checkData, options) {
        super(options);
        this.checkData = checkData;
    }
    static async start(checkData) {
        const checkDataExtended = DialogWeapon._extendCheckData(checkData);
        const config = {
            position: { width: 320, height: 380 },
            window: { title: checkData.weapon.name + " " + LocalisationServer.localise("Check") },
            content: await DialogWeapon._setupContent(checkDataExtended),
            buttons: [
                { label: LocalisationServer.localise("Cancel", "Dialog"), action: "cancel" },
                DialogWeapon._rollAttackButton()
            ]
        };
        return new DialogWeapon(checkDataExtended, config).render({ force: true });
    }
    static _extendCheckData(checkData) {
        const extension = {
            distance: DialogWeapon._getDistance(checkData.token, checkData.targetIds, checkData.sceneId),
            smallestSize: DialogWeapon._getSmallestSize(checkData.targetIds, checkData.sceneId),
            sizeModifiers: THE_EDGE.sizeModifiers,
            movementModifiers: THE_EDGE.movementModifiers,
            coverModifiers: THE_EDGE.coverModifiers,
        };
        return { ...checkData, ...extension };
    }
    static async _setupContent(checkData) {
        const template = "systems/the_edge/templates/dialogs/weapon.hbs";
        return await renderTemplate(template, checkData);
    }
    static _rollAttackButton() {
        return {
            label: LocalisationServer.localise("Roll", "Dialog"),
            action: "rollAttack",
            callback: async (_event, _button, dialog) => {
                const parseResult = DialogWeapon._onRollParseSheet(dialog.element, dialog.checkData);
                parseResult.fireModeDetails = dialog.checkData.weapon.system.fireModes[parseResult.fireModeIndex];
                parseResult.nShots = await DialogWeapon._onRollUpdateAmmunitionGetNumberShots(dialog.checkData, parseResult);
                const rollDamageOutcome = await DialogWeapon._onRollRollDamage(dialog.checkData, parseResult);
                DialogWeapon._onRollApplyDamageAndPost(dialog.checkData, parseResult, rollDamageOutcome);
            }
        };
    }
    static _getDistance(aggressor, targetIds, sceneId) {
        const scene = game.scenes.get(sceneId);
        if (scene === undefined)
            return undefined;
        const targets = targetIds.map(id => scene.tokens.get(id));
        if (targets.length == 0)
            return undefined;
        // determine distance
        const factor = scene.grid.distance / scene.grid.size;
        const distances = targets.map(target => factor * Aux.tokenDistance(aggressor, target));
        return Math.max(...distances);
    }
    static _getSmallestSize(targetIds, sceneId) {
        // get the scene
        const scene = game.scenes.get(sceneId);
        // get the involved actors
        let smallest = Infinity;
        const targets = targetIds.map(id => scene.tokens.get(id));
        for (const target of targets) {
            smallest = Math.min(smallest, target.actor.system.height);
        }
        if (smallest === Infinity)
            return undefined;
        // @ts-expect-error
        return Object.entries(THE_EDGE.sizes).find(([_, value]) => value > smallest)[0];
    }
    static _onRollParseSheet(element, checkData) {
        const labelFor = {
            cover: DialogWeapon._safeGetByName(element, "CoverSelector"),
            fireMode: DialogWeapon._safeGetByName(element, "FireSelector") ??
                checkData.weapon.system.fireModes[0].name,
            movement: DialogWeapon._safeGetByName(element, "MovementSelector"),
            precision: (DialogWeapon._safeGetByName(element, "PrecisionSelector") ?? "aimed"),
            range: DialogWeapon._onRollGetRange(element, checkData.distance),
            size: (DialogWeapon._safeGetByName(element, "SizeSelector") ?? checkData.smallestSize),
        };
        const [modifiers, modifierIndicies] = DialogWeapon._onRollGetModifiersAndIndices(element, checkData, labelFor);
        const threshold = Math.max(Object.values(modifiers).sum(), 1);
        return {
            threshold, labels: labelFor, modifiers, ...modifierIndicies,
            fireModeDetails: undefined, nShots: 0, // Placeholders
            vantage: DialogWeapon._safeGetByName(element, "VantageSelector"),
        };
    }
    static _onRollGetRange(element, distance) {
        if (distance) {
            if (distance < 2)
                return "less_2m";
            if (distance < 10)
                return "less_10m";
            if (distance < 25)
                return "less_25m";
            if (distance < 100)
                return "less_100m";
            return "more_100m";
        }
        return DialogWeapon._safeGetByName(element, "RangeSelector") ?? "less_2m";
    }
    static _onRollGetModifiersAndIndices(element, checkData, labels) {
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
            }, { pIndex, fireModeIndex }];
    }
    static async _onRollUpdateAmmunitionGetNumberShots(checkData, parseResult) {
        const ammunition = checkData.actor.items.get(checkData.weapon.system.ammunitionID);
        const ammuCapa = ammunition.system.capacity;
        if (ammuCapa.value <= 0) {
            ChatServer.transmitEvent("FIRING EMPTY WEAPON", { name: checkData.actor.name }, DialogWeapon._extractChatServerConfig(checkData));
            return 0;
        }
        const fireModeModifier = parseResult.fireModeDetails;
        const ammuCost = Math.min(fireModeModifier.cost, ammuCapa.value);
        await ammunition.update({ "system.capacity.value": ammuCapa.value - ammuCost });
        return Math.floor((ammuCost + 0.1) * fireModeModifier.dices / fireModeModifier.cost);
    }
    static async _onRollRollDamage(checkData, parseResult) {
        const ammunition = checkData.actor.items.get(checkData.weapon.system.ammunitionID);
        const damageRoll = parseResult.fireModeDetails.damage + ` + ${ammunition.system.damage.bonus}`;
        const prompt = {
            damageRoll: damageRoll,
            nRolls: parseResult.nShots,
            threshold: parseResult.threshold,
            vantage: parseResult.vantage,
            ...THE_EDGE.combatConfig.attackDiceParameters(checkData.actor)
        };
        Hooks.call("onModifierEvent", "rollAttackCheck-Prior", { actor: checkData.actor, prompt, weaponId: checkData.weapon.id });
        const attackRollResult = await checkData.actor.system.rollAttackCheck(prompt);
        DialogWeapon._dispatchActionHook(checkData, parseResult);
        Hooks.call("onModifierEvent", "rollAttackCheck-Posterior", { actor: checkData.actor, attackRollResult, prompt, weaponId: checkData.weapon.id });
        return { penetration: ammunition.system.penetration, prompt, attackRollResult };
    }
    static async _onRollApplyDamageAndPost(checkData, parseResult, rollDamageOutcome) {
        const chatServerConfig = DialogWeapon._extractChatServerConfig(checkData);
        const details = DialogWeapon._generateWeaponCheckData(checkData, parseResult, rollDamageOutcome);
        if (checkData.targetIds.length == 0) {
            ChatServer.transmitEvent("WEAPON CHECK", details, chatServerConfig);
        }
        ;
        for (const id of checkData.targetIds) {
            details.attackRollQuery.targetId = id;
            ChatServer.transmitEvent("WEAPON CHECK", details, chatServerConfig);
        }
        if (rollDamageOutcome.attackRollResult.failEvent) {
            ChatServer.transmitEvent("CRIT FAIL EVENT", { event: rollDamageOutcome.attackRollResult.failEvent, check: "Combat check" }, chatServerConfig);
        }
    }
    static _dispatchActionHook(checkData, parseResult) {
        const payload = {
            actionType: parseResult.labels.precision == "aimed" ? "weapon check aimed" : "weapon check",
            actionCost: THE_EDGE.combatConfig.weaponAttackActionCost(parseResult.labels.precision),
            actor: checkData.actor,
        };
        Hooks.call("TheEdgeAction", payload);
    }
    static _extractChatServerConfig(checkData) {
        return {
            speaker: {
                actor: checkData.actor.id,
                scene: checkData.sceneId,
                token: checkData.token.id
            }
        };
    }
    static _generateWeaponCheckData(checkData, parseResult, rollDamageOutcome) {
        const attackRollQuery = {
            actor: checkData.actor,
            actorId: checkData.actor.id,
            damageRoll: rollDamageOutcome.prompt.damageRoll,
            name: checkData.weapon.name,
            sceneId: checkData.sceneId,
            threshold: rollDamageOutcome.prompt.threshold,
            token: checkData.token
        };
        return {
            attackRollQuery,
            attackRollResult: rollDamageOutcome.attackRollResult,
            damageType: checkData.weapon.system.damageType,
            isMelee: false,
            specifics: {
                labels: parseResult.labels,
                modifiers: parseResult.modifiers,
                penetration: rollDamageOutcome.penetration
            },
            vantage: parseResult.vantage
        };
    }
    static _safeGetByName(element, name) {
        const target = element.querySelector(`[name="${name}"]`);
        return target?.value;
    }
}
