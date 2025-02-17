import LocalisationServer from "./localisation_server.js";

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
      
      case "FIRING EMPTY WEAPON":
        html = LocalisationServer.parsedLocalisation(id, "Chat", details)
        break;
      
      case "PROFICIENCYCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/proficiency_check.html", details);
        break;
      
      case "WEAPONCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/weapon_check.html", details);
        break;
      
      case "COMBATICSCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/combatics.html", details);
        break;
      
      case "MEDICINE":
        html = await renderTemplate("systems/the_edge/templates/chat/medicine.html", details);
        break;
      
      case "GRENADE":
        details.check = "throwing";
        html = await renderTemplate("systems/the_edge/templates/chat/grenade.html", details);
        break;
      
      case "STRAINUPDATE":
        html = await renderTemplate("systems/the_edge/templates/chat/strain_update.html", details);
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
        html = await renderTemplate("systems/the_edge/templates/chat/item-description.html", details);
        break;
      
      case "POST SKILL":
        html = await renderTemplate("systems/the_edge/templates/chat/skill-description.html", details);
        break;
      
      case "REROLL":
        html = await renderTemplate("systems/the_edge/templates/chat/reroll-check.html", details);
        break;
    }
    const chatData = this._chatDataSetup(html, roll);
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

  static _chatDataSetup(content, modeOverride, forceWhisper, forceWhisperIDs) {
    let chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content: content,
      speaker: ChatMessage.getSpeaker()
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