import LocalisationServer from "../../system/localisation_server.js";
import THE_EDGE from "../../system/config-the-edge.js";

export default async function executeChatCommands(message, chatData) {
  const regexPH = CONFIG.ui.chat.MESSAGE_PATTERNS.givePH;
  const matchPH = regexPH.exec(message);
  if (matchPH) return processGivePH(message, matchPH, chatData);
  
  const regexHR = CONFIG.ui.chat.MESSAGE_PATTERNS.changeHR;
  const matchHR = regexHR.exec(message);
  if (matchHR) return processChangeHR(message, matchHR, chatData);

  const language = CONFIG.ui.chat.MESSAGE_PATTERNS.language;
  const matchLanguage = language.exec(message);
  if (matchLanguage) return processLanguage(matchLanguage, chatData);
}

function processGivePH(message, matches, chatData) {
  const user = game.users.get(chatData.user);
  if (!user.isGM) {
    const msg = LocalisationServer.localise("givePH permission", "chat");
    ui.notifications.notify(msg);
    chatData.content = msg;
    return false;
  }

  if (matches[1] === undefined) {
    chatData.content = message + "<br />" + LocalisationServer.localise("givePH help", "chat");
    return true;
  }
  const ph = +matches[1];
  const name = matches[2] ? matches[2].toLowerCase() : "all";
  const actors = _getActors(name);
  if (!actors.length) {
    chatData.content = message + _missingActorError(name);
    return true;
  }

  const names = [];
  for (const actor of actors) {
    actor.update({"system.PracticeHours.max": actor.system.PracticeHours.max + ph});
    names.push(actor.name);
  }

  chatData.content = `<h3>${LocalisationServer.localise("practice time", "chat")}</h3>` +
    LocalisationServer.parsedLocalisation("Practice message", "chat", {actors: names, phGain: ph})
  return true;
}

function processChangeHR(message, matches, chatData) {
  const user = game.users.get(chatData.user);
  if (!user.isGM) {
    const msg = LocalisationServer.parsedLocalisation(
      "command permission", "chat", {command: matches[1]}
    );
    ui.notifications.notify(msg);
    chatData.content = msg;
    return false;
  }
  
  if (matches[1] === undefined) {
    chatData.content = message + "<br />" + LocalisationServer.localise("changeHR help", "chat");
    return true;
  }
  const hr = matches[1];
  const name = matches[2] ? matches[2].toLowerCase() : "all";
  const actors = _getActors(name);
  if (!actors.length) {
    chatData.content = message + _missingActorError(name);
    return true;
  }

  const names = [];
  let newHRTitle = "";
  for (const actor of actors) {
    let newHR = 0;
    switch (hr) {
      case "Z1":
        newHR = actor.system.heartRate.min.value;
        newHRTitle = LocalisationServer.localise("Zone") + " 1";
        break;

      case "Z2":
        newHR = actor.hrZone1();
        newHRTitle = LocalisationServer.localise("Zone") + " 2";
        break;

      case "Z3":
        newHR = actor.hrZone2();
        newHRTitle = LocalisationServer.localise("Zone") + " 3";
        break;

      default:
        newHR = +hr;
        newHRTitle = hr;
    }
    actor.update({"system.heartRate.value": newHR});
    names.push(actor.name);
  }

  chatData.content = `<h3>${LocalisationServer.localise("change hr title", "chat")}</h3>` +
    LocalisationServer.parsedLocalisation("change hr message", "chat", {actors: names, newHR: newHRTitle});
  return true;
}

function processLanguage(matches, chatData) {
  const language = matches[1].toLowerCase();

  // Generate new pseudo message
  let newMessage = "";
  for (const word of matches[2].split(" ")) {
    newMessage += _generatePseudoWord(language, word) + " ";
  }

  const usersWitoutTranslation = _translateForProficientUsers(
    language, matches[2], newMessage
  );

  // Create message for all users whom do not speak the language
  chatData.content = `
    <div class="ff-lucius-cipher">
      ${newMessage}
    </div>
  `;
  chatData.whisper = usersWitoutTranslation;
}

function _generatePseudoWord(language, word) {
  const hash = _stringHash(language + word.toLowerCase());

  const newWordLength = word.length - 1 + (hash % 4);

  let pseudoWord = '';
  let seed = hash;
  for (let i = 0; i < newWordLength; i++) {
      seed = (seed * seed + 11) % 1000000;
      const randomValue = seed % 26;
      pseudoWord += String.fromCharCode(97 + randomValue);
  }

  return pseudoWord;
}

function _stringHash(string) {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    if (hash < 0) hash *= -1;
  }
  return hash;
}

function _translateForProficientUsers(language, message, newMessage) {
  const speakingActors = _getSpeakingActors(language);
  // TODO: assert that message always renders for GM
  if (!(speakingActors.length)) return;

  const userProficiency = _createLevelByUserID(speakingActors);
  const usersByLevel = _mapLevelsToUsers(userProficiency);

  // Send a matching text to all relevant users
  for (const [level, users] of Object.entries(usersByLevel)) {
    if (level == 0) continue;
    const content = _createMessageForLevel(
      level, language, message, newMessage
    );
    ChatMessage.create({
      content: content,
      whisper: users
    });
  }

  return usersByLevel[0];
}

function _getSpeakingActors(language) {
  const speakingActors = game.actors.map(actor => {
    const learnedLevels = actor.itemTypes["Languageskill"].filter(
      x => x.name.toLowerCase() == language
    ).map(x => x.system.level);

    const nativeLevel = (
      language == actor.system.nativeLanguage.toLowerCase() ?
      6 : 0
    );

    return {
      ownerIDs: actor.ownership,
      languageLevel: Math.max(nativeLevel, ...learnedLevels)
    }
  }).filter(x => x.languageLevel);

  return speakingActors;
}

function _createLevelByUserID(speakingActors) {
  const userProficiency = game.users.reduce(
    (acc, user) => {
      acc[user.id] = user.isGM ? 6 : 0;
      return acc;
    }, {}
  ); // Collect defaults for all

  for (const actorData of speakingActors) {
    for (const ownerID of Object.keys(actorData.ownerIDs)) {
      userProficiency[ownerID] = Math.max(
        actorData.languageLevel,
        userProficiency[ownerID]
      )
    }
  }
  delete userProficiency.default;
  return userProficiency;
}

function _mapLevelsToUsers(userProficiency) {
  const usersByLevel = {};

  for (const [userID, level] of Object.entries(userProficiency)) {
    if (level in usersByLevel) usersByLevel[level].push(userID);
    else usersByLevel[level] = [userID];
  }
  return usersByLevel;
}

function _createMessageForLevel(level, language, message, newMessage) {
  const translatedMessage = _getLevelTranslation(
    level, language, message, newMessage
  );
  const content = `<div class="ff-lucius-cipher">${newMessage}</div>` +
    `<h5 style="margin-top: 8px;">
      ${LocalisationServer.localise("translation")}
      (${LocalisationServer.localise("level")} ${level}):
    </h5>` +
    translatedMessage;
  return content;
}

function _getLevelTranslation(level, language, message, newMessage) {
  const originalWords = message.split(" ");
  const translatedWords = newMessage.split(" ");

  let partialTranslation = "";
  for (let i = 0; i < originalWords.length; ++i) {
    const wordHash = _stringHash(language + originalWords[i]);

    if (wordHash % 100 < THE_EDGE.translationPercentage[level]) {
      partialTranslation += originalWords[i];
    } else {
      partialTranslation += `
        <span class="ff-lucius-cipher">${translatedWords[i]}</span>
      `;
    }
    partialTranslation += " ";
  }
  return partialTranslation;
}