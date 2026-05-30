import Aux from "../system/auxilliaries.js";
import attachContextMenus from "./chat-hooks/context-menus.js";
import executeChatCommands from "./chat-hooks/chat-commands.js";
import NotificationServer from "../system/notifications.js";
import { applyDamage, applyGrenadeDamage, rollProficiencyCheck } from "./chat-hooks/event-listeners.js";
export default function () {
    Hooks.on("chatMessage", async (_chatLog, message, chatData) => {
        return executeChatCommands(message, chatData);
    });
    Hooks.on("createChatMessage", async (data, _options, _userId) => {
        data.content = await Aux.replacePlaceholderInContent(data.content, data.system.item?.system ?? {});
    });
    Hooks.on("renderChatMessageHTML", async (chatMsgCls, html, message) => {
        const newContent = await Aux.replacePlaceholderInContent(chatMsgCls.content, chatMsgCls.system.item?.system ?? {});
        html.querySelector(".message-content").innerHTML = newContent;
        const sys = message.message.system;
        const actor = Aux.getActorNew(message.message.speaker);
        // Adding context menus
        const contextMenuConfig = {
            actor: actor,
            chatMsgCls: chatMsgCls,
            html: html,
            system: message.message.system
        };
        attachContextMenus(contextMenuConfig);
        // Dynamic rolls listeners
        const proficiencyRoll = html.querySelector(".proficiency-roll");
        if (proficiencyRoll) {
            proficiencyRoll.addEventListener("click", async (event) => {
                await rollProficiencyCheck(event, sys, actor);
                updateChatMessageFromHTML(chatMsgCls, html, sys);
            });
        }
        const genericRoll = html.querySelector(".generic-roll");
        if (genericRoll) {
            genericRoll.addEventListener("click", async (ev) => {
                const target = ev.currentTarget;
                if (!rollIsReady("generic-roll", target))
                    return undefined;
                let elem = $(target);
                let rollElems = elem.find(".roll");
                for (const rollElem of rollElems) {
                    let roll = await new Roll(rollElem.dataset.roll).evaluate();
                    rollElem.remove();
                    elem.append(`<div class="output" style="width: 25px;">${roll.total}</div>`);
                }
                elem.find(".roll").remove();
                rollFollowUps(elem);
                updateChatMessageFromHTML(chatMsgCls, html, sys);
            });
        }
        const applyDamageButton = html.querySelector(".apply-damage");
        if (applyDamageButton) {
            applyDamageButton.addEventListener("click", async (event) => {
                if (!game.user.isGM) {
                    NotificationServer.notify("Requires GM");
                    return;
                }
                await applyDamage(event, sys, html);
                updateChatMessageFromHTML(chatMsgCls, html, sys);
            });
        }
        const applyGrenadeDamageButton = html.querySelector(".apply-grenade-damage");
        if (applyGrenadeDamageButton) {
            applyGrenadeDamageButton.addEventListener("click", async (event) => {
                if (!game.user.isGM) {
                    NotificationServer.notify("Requires GM");
                    return;
                }
                await applyGrenadeDamage(event, sys, applyGrenadeDamageButton);
                updateChatMessageFromHTML(chatMsgCls, html, sys);
            });
        }
    });
}
function rollIsReady(id, target) {
    if (Aux.hasRaceCondDanger(id))
        return false;
    if (target.className.includes("roll-offline"))
        return false;
    return true;
}
;
function rollFollowUps(elem) {
    const followUps = elem.parent().find(".roll-offline");
    followUps.removeClass("roll-offline");
}
async function updateChatMessage(chatMsgCls, newContent, newSys) {
    chatMsgCls.update({ "content": newContent, "system": newSys });
}
function updateChatMessageFromHTML(chatMsgCls, html, sys) {
    html.querySelector(".message-header")?.remove();
    updateChatMessage(chatMsgCls, html.querySelector(".message-content").innerHTML, sys);
}
