import Aux from "../../system/auxilliaries.js";
import NewChatServer from "../../system/new_chat_server.js";
import NewDiceServer from "../../system/new_dice_server.js";
import DiceServer from "../../system/dice_server.js";
import LocalisationServer from "../../system/localisation_server.js";
import ProficiencyConfig from "../../system/config-proficiencies.js";

const { renderTemplate } = foundry.applications.handlebars;

export default async function attachContextMenus(config: IContextMenuHookConfig) {
  const {actor, html} = config;
  new foundry.applications.ux.ContextMenu(html, ".rerollable", [
    {
      name: LocalisationServer.localise("Use hero token"),
      classes: "roll-context-menu",
      icon: "",
      condition: (contextHtml: HTMLAnchorElement) => {
        const prevRoll = parseInt((contextHtml.querySelector(".d20-overlay") as HTMLElement).innerText);
        const type = contextHtml.dataset.type;
        return actor.system.heroToken.available > 0 && (prevRoll != 1 || type == "proficiency");
      },
      callback: (contextHtml: HTMLAnchorElement) => _heroTokenCallback(contextHtml, config)
    },
    {
      name: LocalisationServer.localise("Reroll"),
      classes: "roll-context-menu",
      icon: "",
      condition: () => {return true;},
      callback: (contextHtml: HTMLAnchorElement) => _rerollCallback(contextHtml, config)
    },
    {
      name: LocalisationServer.localise("Change"),
      classes: "roll-context-menu",
      icon: "",
      condition: () => {return game.user.isGM;},
      callback: (contextHtml: HTMLAnchorElement) => _changeCallback(contextHtml, config)
    }
  ], {jQuery: false, fixed: true}) // jQuery Option can be removed with Foundry v14
}

// Callbacks
async function _heroTokenCallback(contextHtml: HTMLAnchorElement, config: IContextMenuHookConfig) {
  const {actor, chatMsgCls, system} = config;

  switch (contextHtml.dataset.type) {
    case "attribute":
      _heroTokenAttributeCheck(chatMsgCls, system)
      actor.system.useHeroToken("attribute");
      break;
    case "proficiency":
      _heroTokenProficiencyCheck(chatMsgCls, system)
      actor.system.useHeroToken("proficiency");
      break;
    case "weapon":
      const index = +contextHtml.dataset.index!;
      _heroTokenWeaponCheck(chatMsgCls, actor, system, index)
      actor.system.useHeroToken("weapon");
      break;
  }
}

async function _rerollCallback(contextHtml: HTMLAnchorElement, config: IContextMenuHookConfig) {
  const newRoll = await NewDiceServer.genericRoll("1d20");
  _handleRerollOrChange(contextHtml, config, newRoll);
}

async function _changeCallback(contextHtml: HTMLAnchorElement, config: IContextMenuHookConfig) {
  const newRoll = await Aux.promptInput("Change dice");
  if (!(newRoll && newRoll >= 1 && newRoll <= 20)) return;
  _handleRerollOrChange(contextHtml, config, newRoll);
}

function _handleRerollOrChange(contextHtml: HTMLAnchorElement, config: IContextMenuHookConfig, newRoll: number) {
  const {actor, chatMsgCls, system} = config;

  const rerollDetails: Record<string, any> = {name: game.user.name, new: newRoll};
  const index = +(contextHtml.dataset.index || 0);

  switch (contextHtml.dataset.type) {
    case "attribute":
      rerollDetails.old = system.details.rolls[0];
      updateAttributeCheck(chatMsgCls, system, newRoll);
      rerollDetails.check = LocalisationServer.localise(system.details.attribute, "attr");
      break;
    case "proficiency":
      rerollDetails.old = system.details.rolls[index];
      rerollDetails.check = LocalisationServer.localise(system.details.proficiency, "proficiency");
      system.details.rolls[index] = newRoll;
      updateProficiencyCheck(chatMsgCls, system, system.details.rolls);
      break;
    case "weapon":
      rerollDetails.old = system.details.rolls[index].res;
      const newResults = structuredClone(system.details.rolls);
      newResults[index].res = newRoll;
      updateWeaponCheck(chatMsgCls, actor, system, newResults, index);
      rerollDetails.check = LocalisationServer.localise("combat", "combat");
      break;
  }
  NewChatServer.transmitEvent("Reroll", rerollDetails);
}

// Helper functions
function _heroTokenAttributeCheck (chatMsgCls: foundryAny, system: IChatSystem) {
  if (system.details.outcome == "Success") updateAttributeCheck(chatMsgCls, system, 1);
  else updateAttributeCheck(chatMsgCls, system, system.details.effectiveThreshold);
}

async function updateAttributeCheck(chatMsgCls: foundryAny, system: IChatSystem, newResult: number) {
  const { details } = system;
  foundry.utils.mergeObject(details, NewDiceServer.attributeOutcome(newResult, details.diceServerConfig));
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/attribute_check.hbs", details);
  updateChatMessage(chatMsgCls, newContent, system);
}

function _heroTokenProficiencyCheck(chatMsgCls: foundryAny, system: IChatSystem) {
  const { details } = system;
  if (details.quality < 0) {
    for (let i = 0; i < 4; ++i) {
      details.rolls[i] = Math.min(
        details.dice[i].threshold + Math.floor((details.modifier + details.strain) / 4), 19
      );
    }
  } else {
    for (let _j = 0; _j < 2; ++_j) { // Convert largest two rolls
      const indexMax = details.rolls.indexOf(Math.max(...details.rolls));
      details.rolls[indexMax] = 1;
    }
  }
  updateProficiencyCheck(chatMsgCls, system, details.rolls);
}

async function updateProficiencyCheck(chatMsgCls: foundryAny, system: IChatSystem, newResults: number[]) {
  const { details } = system;
  foundry.utils.mergeObject(details, NewDiceServer.proficiencyOutcome(newResults, details.diceServerConfig));
  if ("interpretation" in details) {
    details.interpretation = ProficiencyConfig.rollOutcome(details.proficiency, details.quality);
  }
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/proficiency_check.hbs", details);
  updateChatMessage(chatMsgCls, newContent, system);
}

function _heroTokenWeaponCheck(chatMsgCls: foundryAny, actor: foundryAny, system: IChatSystem, index: number) {
  const { details } = system;
  const newResults = structuredClone(details.rolls);
  if (newResults[index].hit) newResults[index].res = 1;
  else newResults[index].res = details.threshold;
  updateWeaponCheck(chatMsgCls, actor, system, newResults, index);
}

async function updateWeaponCheck(chatMsgCls: foundryAny, actor: foundryAny, system: IChatSystem, newResults, index: number) {
  const { details } = system;
  if ((newResults[index].res <= details.threshold || newResults[index].res == 1) &&
    !actor.diceServer.interpretationParams.weapons.critFail.includes(newResults[index].res)) {
    newResults[index].hit = true;
  } else newResults[index].hit = false;

  // Which hit was modified?
  let hitIndex = 0;
  for (let i = 0; i < index; ++i) {
    if (details.rolls[i].hit) hitIndex += 1;
  }

  if (details.rolls[index].hit) { // Previous roll was a hit
    if (!newResults[index].hit) details.damage.splice(hitIndex, 1);
    else if (actor.diceServer.interpretationParams.weapons.crit.includes(newResults[index].res) &&
      !actor.diceServer.interpretationParams.weapons.crit.includes(details.rolls[index].res)) {
      details.damage[hitIndex] += DiceServer.max(details.damageRoll);
    } else if (newResults[index].res != 1 && details.rolls[index].res == 1) {
      details.damage[hitIndex] -= DiceServer.max(details.damageRoll);
    }
  } else { // Precious roll wasn't a hit
    if (newResults[index].hit) {
      details.damage = [
        ...details.damage.slice(0, hitIndex),
        await DiceServer.genericRoll(details.damageRoll),
        ...details.damage.slice(hitIndex)
      ]
    }
    if (newResults[index].res == 1) {
      details.damage[hitIndex] += DiceServer.max(details.damageRoll);
    }
  }

  details.rolls = newResults;
  const newContent = await renderTemplate(
    "systems/the_edge/templates/chat/weapon_check.hbs", details);
  updateChatMessage(chatMsgCls, newContent, system);
}

async function updateChatMessage(chatMsgCls: foundryAny, newContent: string, newSystem: IChatSystem) {
  chatMsgCls.update({"content": newContent, "system": newSystem});
}