import LocalisationServer from "./localisation_server.js";

// Architecture idea:
// abstract ChatServer class
// multiple specialised subclasses (Dicerolls, communication...)
// enum instead of dicts with names for replacement
// Subclasses come with an required method

export default class ChatServer {
  static transmitPlain(msg) {
    ChatMessage.create(this._chatDataSetup(`<h2>${msg}</h2>`, "roll"))
  }
  
  static transmit(id, details, type = "") {
    const parts = LocalisationServer.chatLocalisation(id, type).split("<PART>");
    const colour = type.toUpperCase() == "ERROR" ? "red" : "black";
    let msg = `<h2 style="color:${colour};">${parts[0]}</h2>`;
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; ++i) {
            msg += `<p>${parts[i]}</p>`;
        }
    }
    msg = this.fillInDetails(msg, details)
    ChatMessage.create(this._chatDataSetup(msg, "roll"))
  }

  static async transmitRoll(id, details) {
    const parts = LocalisationServer.chatLocalisation(id, "dice").split("<PART>");
    let html = undefined;
    switch (id.toUpperCase()) {
      case "ABILITYCHECK":
        html = await renderTemplate("systems/the_edge/templates/chat/attribute_check.html", details);
    }
    ChatMessage.create(this._chatDataSetup(html, "roll"))
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
      content: content
    };

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    if (chatData.rollMode === "blindroll") chatData["blind"] = true;
    else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

    if (forceWhisper) {
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
    }
    if (forceWhisperIDs) {
      chatData["speaker"] = ChatMessage.getSpeaker();
      chatData["whisper"] = forceWhisperIDs
    }

    return chatData;
  }
}