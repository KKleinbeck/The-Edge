import LocalisationServer from "./localisation_server.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class ChatServer {
  static transmitPlain(msg) {
    ChatMessage.create(this._chatDataSetup(`<h2>${msg}</h2>`, "roll"))
  }

  static async transmitEvent(id, details, roll = "roll") {
    let html = undefined;
    let text = undefined;
    switch (id.toUpperCase()) {
      case "ABILITYCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/attribute_check.html", details);
        break;
      
      case "COMBAT ACTION":
        html = await renderTemplate("systems/the_edge/templates/chat/combat_action.html", details);
        break;
      
      case "FIRING EMPTY WEAPON":
        html = LocalisationServer.parsedLocalisation(id, "Chat", details)
        break;
      
      case "GENERIC DAMAGE":
        html = await renderTemplate("systems/the_edge/templates/chat/generic_damage.html", details);
        break;
      
      case "PROFICIENCYCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/proficiency_check.html", details);
        break;
      
      case "WEAPONCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/weapon_check.html", details);
        break;
      
      case "MEDICINE":
        html = await renderTemplate("systems/the_edge/templates/chat/medicine.html", details);
        break;
      
      case "GENERAL CONSUME":
        html = await renderTemplate("systems/the_edge/templates/chat/general_consume.html", details);
        break;
      
      case "GRENADE SHEET BASED":
        details.check = "throwing";
        html = await renderTemplate("systems/the_edge/templates/chat/grenade-sheet-based.html", details);
        break;
      
      case "GRENADE CONTEXT BASED":
        html = await renderTemplate("systems/the_edge/templates/chat/grenade-context-based.html", details);
        break;
      
      case "RELOAD":
        html = await renderTemplate("systems/the_edge/templates/chat/reload.html", details);
        break;
      
      case "SHORT REST":
      case "LONG REST":
        html = await renderTemplate(
          "systems/the_edge/templates/chat/long-or-short-rest.html",
          foundry.utils.mergeObject(details, {restType: id})
        );
        break;
      
      case "HERO TOKEN":
        text = LocalisationServer.parsedLocalisation(details.reason, "Hero Token", details)
        html = await renderTemplate(
          "systems/the_edge/templates/chat/hero_token.html",
          {name: details.name, text: text}
        );
        break;
      
      case "FALL":
        html = await renderTemplate("systems/the_edge/templates/chat/fall.html", details);
        break;
      
      case "IMPACT":
        html = await renderTemplate("systems/the_edge/templates/chat/impact.html", details);
        break;

      case "CRIT FAIL EVENT":
        text = LocalisationServer.parsedLocalisation(details.event, "Crit Fail Event")
        html = await renderTemplate(
          "systems/the_edge/templates/chat/crit_failure.html",
          {check: details.check, text: text}
        );
        break;
      
      case "POST ITEM":
        switch (details.item.type) {
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
      
      case "REROLL":
        html = await renderTemplate("systems/the_edge/templates/chat/reroll-check.html", details);
        break;
    }
    const chatData = this._chatDataSetup(html, roll, details);
    chatData.system = details;
    ChatMessage.create(chatData);
  }

  static fillInDetails(msg, details) {
    if (details) {
      for (const [key, value] of Object.entries(details)) {
        msg = msg.replace(key, value);
      }
    }
    return msg;
  }

  static _chatDataSetup(content, modeOverride, details, forceWhisper, forceWhisperIDs) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content,
      speaker: ChatMessage.getSpeaker({
        actor: details?.actor,
        token: canvas.scene.tokens.get(details?.tokenId)
      })
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) {
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }
    if (forceWhisperIDs) {
      chatData["whisper"] = forceWhisperIDs
    }

    return chatData;
  }
}