import THE_EDGE from "./config-the-edge.js";
import LocalisationServer from "./localisation_server.js";
const { renderTemplate } = foundry.applications.handlebars;
export default class NewChatServer {
    static transmitPlain(msg, config) {
        ChatMessage.create(this.createChatData(`<h2>${msg}</h2>`, config));
    }
    static async transmitEvent(id, details, config = {}) {
        let html = "";
        let text = undefined;
        switch (id.toUpperCase()) {
            case "ATTRIBUTE CHECK":
                html = await renderTemplate("systems/the_edge/templates/chat/attribute_check.hbs", details);
                break;
            case "COMBAT ACTION":
                html = await renderTemplate("systems/the_edge/templates/chat/combat_action.html", details);
                break;
            case "CRIT FAIL EVENT":
                text = LocalisationServer.parsedLocalisation(details.event, "Crit Fail Event");
                html = await renderTemplate("systems/the_edge/templates/chat/crit_failure.html", { check: details.check, text: text });
                break;
            case "FALL":
                html = await renderTemplate("systems/the_edge/templates/chat/fall.html", details);
                break;
            case "FIRING EMPTY WEAPON":
                html = LocalisationServer.parsedLocalisation(id, "Chat", details);
                break;
            case "FOOD CONSUME":
                html = await renderTemplate("systems/the_edge/templates/chat/food_consum.hbs", details);
                break;
            case "GENERIC DAMAGE":
                html = await renderTemplate("systems/the_edge/templates/chat/generic_damage.html", details);
                break;
            case "GRENADE SHEET BASED":
                details.check = "throwing";
                html = await renderTemplate("systems/the_edge/templates/chat/grenade-sheet-based.html", details);
                break;
            case "GRENADE CONTEXT BASED":
                html = await renderTemplate("systems/the_edge/templates/chat/grenade-context-based.html", details);
                break;
            case "HERO TOKEN":
                text = LocalisationServer.parsedLocalisation(details.reason, "Hero Token", details);
                html = await renderTemplate("systems/the_edge/templates/chat/hero_token.html", { name: details.name, text: text });
                break;
            case "IMPACT":
                html = await renderTemplate("systems/the_edge/templates/chat/impact.html", details);
                break;
            case "MEDICINE":
                html = await renderTemplate("systems/the_edge/templates/chat/medicine.html", details);
                break;
            case "POST ITEM":
                switch (details.item.type) {
                    case "Ammunition":
                        details.subtypeIconExists = THE_EDGE.ammunitionSubtypes.includes(details.item.system.subtype);
                        html = await renderTemplate("systems/the_edge/templates/chat/items/ammunition.hbs", details);
                        break;
                    case "Armour":
                        html = await renderTemplate("systems/the_edge/templates/chat/items/armour.hbs", details);
                        break;
                    case "Consumables":
                        switch (details.item.system.subtype) {
                            case "grenade":
                                html = await renderTemplate("systems/the_edge/templates/chat/items/grenade.hbs", details);
                                break;
                            default:
                                html = await renderTemplate("systems/the_edge/templates/chat/items/generic.hbs", details);
                        }
                        break;
                    case "Weapon":
                        html = await renderTemplate("systems/the_edge/templates/chat/items/weapon.hbs", details);
                        break;
                    default:
                        html = await renderTemplate("systems/the_edge/templates/chat/items/generic.hbs", details);
                }
                break;
            case "POST SKILL":
                html = await renderTemplate("systems/the_edge/templates/chat/skill-description.html", details);
                break;
            case "PROFICIENCY CHECK":
                html = await renderTemplate("systems/the_edge/templates/chat/proficiency_check.hbs", details);
                break;
            case "RELOAD":
                html = await renderTemplate("systems/the_edge/templates/chat/reload.html", details);
                break;
            case "REROLL":
                html = await renderTemplate("systems/the_edge/templates/chat/reroll-check.html", details);
                break;
            case "SHORT REST":
            case "LONG REST":
                html = await renderTemplate("systems/the_edge/templates/chat/long-or-short-rest.html", foundry.utils.mergeObject(details, { restType: id }));
                break;
            case "WEAPON CHECK":
                html = await renderTemplate("systems/the_edge/templates/chat/weapon_check.hbs", details);
                break;
        }
        const chatData = this.createChatData(html, config);
        chatData.system = { details: details, config: config };
        ChatMessage.create(chatData);
    }
    static createChatData(content, config = {}) {
        const chatData = {
            user: game.user.id,
            content: content,
        };
        if ("speaker" in config)
            chatData.speaker = config.speaker;
        if ("roll" in config) {
            if (config.roll == "blind")
                chatData.blind = true;
            else if (config.roll == "whisper") {
                chatData.whisper = [
                    game.user.id,
                    ...game.users.filter((x) => x.isGM).map((x) => x.id)
                ];
            }
        }
        return chatData;
    }
}
