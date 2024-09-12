import LocalisationServer from "./localisation_server.js";

export default class ChatServer {
  static transmit(id, details) {
    let msg = `<h2>${LocalisationServer.chatLocalisation(id)}</h2>`;
    for (const [key, value] of Object.entries(details)) {
      msg = msg.replace(key, value);
    }
    ChatMessage.create(this._chatDataSetup(msg, "roll"))
  }

  static transmitPlain(msg) {
    ChatMessage.create(this._chatDataSetup(`<h2>${msg}</h2>`, "roll"))
  }

  static transmitError(id, details) {
    const parts = LocalisationServer.chatErrorLocalisation(id).split("<PART>");
    let msg = `<h2 color="red">${parts[0]}</h2>`;
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; ++i) {
            msg += `<p>${parts[i]}</p>`;
        }
    }
    if (details) {
      for (const [key, value] of Object.entries(details)) {
        msg = msg.replace(key, value);
      }
    }
    ChatMessage.create(this._chatDataSetup(msg, "roll"))
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