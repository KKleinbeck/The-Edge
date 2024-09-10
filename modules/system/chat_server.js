import LocalisationServer from "../../lang/localisation_server.js";

export default class ChatServer {
  static transmit(id, user) {
      let msg = `<h2>${LocalisationServer.chatLocalisation(id, user)}</h2>`;
      ChatMessage.create(this._chatDataSetup(msg, "roll"))
  }

  static transmitPlain(id) {
      let msg = `<h2>${id}</h2>`;
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