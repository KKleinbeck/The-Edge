/** @param {string | Actor | Token} object */
/** @return {string} */
function uuid(object) {
  if (typeof object == "string") return object;
  if (
    object.hasOwnProperty("uuid") ||
    object.constructor.prototype.hasOwnProperty("uuid")
  ) {
    return object.uuid;
  }
  throw new Error(`Object '${object}' has no property named 'uuid'.`);
}

export default class ApiHandler {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;

    this._actors = {};
    this._items = {};
    this._tokens = {};
  }

  async requestClients() {
    const response = await fetch(this.url + "/clients", {
      method: "GET",
      headers: { "x-api-key": this.apiKey },
    });
    return await response.json();
  }

  /** @param {Record<string, any>} options */
  /** @return {Actor} */
  async actorCreate(options = {}) {
    const { name, systemPreset, systemPayload = {} } = options;

    const response = await fetch(this.url + "/create", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entityType: "Actor",
        data: {
          name: name ?? "TestActor",
          type: "character",
          system: { ...Actor.getSystemPreset(systemPreset), ...systemPayload },
        },
      }),
    });
    const result = await response.json();
    const actor = new Actor(this, result.entity, result.uuid);
    this._actors[result.uuid] = actor;
    return actor;
  }

  /** @param {string | Actor} actor */
  async actorDelete(actor) {
    actor = this._getFromCollection(this._actors, actor);

    const path = "/delete";
    const params = { uuid: uuid(actor) };
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.url}${path}?${queryString}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "x-api-key": this.apiKey },
    });
    const result = await response.json();

    if (result.success) delete this._actors[uuid(actor)];
    return result;
  }

  /** @param {string | Actor} actor */
  /** @return {Record<string, any>} */
  async actorGetDocument(actor) {
    actor = this._getFromCollection(this._actors, actor);

    const params = { uuid: uuid(actor) };
    const queryString = new URLSearchParams(params).toString();

    const url = `${this.url}/get?${queryString}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": this.apiKey },
    });
    const result = await response.json();
    return result.data;
  }

  /** @param {(string | Token)[]} tokens */
  /** @param {string} encounterId */
  async encounterAddTokens(tokens, encounterId) {
    const tokenIds = tokens.map((x) =>
      typeof x == "string"
        ? this._getFromCollection(this._tokens, x).uuid
        : x.uuid,
    );

    const response = await fetch(this.url + "/add-to-encounter", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encounterId: encounterId,
        uuids: tokenIds,
        rollInitiative: true,
      }),
    });
    const result = await response.json();
    return result;
  }

  /** @param {string} encounterId */
  /** @return {Record<string, any>} */
  async encounterEnd(encounterId) {
    const params = { encounterId };
    const queryString = new URLSearchParams(params).toString();

    const url = `${this.url}/end-encounter?${queryString}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "x-api-key": this.apiKey },
    });
    const result = await response.json();
    return result;
  }

  /** @param {string} encounterId */
  async encounterNextTurn(encounterId) {
    const response = await fetch(this.url + "/next-turn", {
      method: "POST",
      headers: { "x-api-key": this.apiKey },
      body: JSON.stringify({
        encounterId: encounterId,
      }),
    });
    const result = await response.json();
    return result;
  }

  /** @return {Encounter} */
  async encounterStart() {
    const response = await fetch(this.url + "/start-encounter", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    return new Encounter(this, result.encounterId);
  }

  /** @param {Record<string, any>} options */
  /** @return {Item} */
  async itemCreate(options = {}) {
    const { name, type, systemPreset, systemPayload = {} } = options;

    const response = await fetch(this.url + "/create", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entityType: "Item",
        data: {
          name: name ?? "TestItem",
          type: type ?? "Ammunition",
          system: { ...Actor.getSystemPreset(systemPreset), ...systemPayload },
        },
      }),
    });
    const result = await response.json();
    const item = new Item(this, result.entity, result.uuid);
    this._items[result.uuid] = item;
    return item;
  }

  /** @param {string | Item} item */
  async itemDelete(item) {
    item = this._getFromCollection(this._items, item);

    const path = "/delete";
    const params = { uuid: uuid(item) };
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.url}${path}?${queryString}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "x-api-key": this.apiKey },
    });
    const result = await response.json();

    if (result.success) delete this._items[uuid(item)];
    return result;
  }

  /** @param {string} command */
  /** @return {Record<string, any>} */
  async runCommand(command) {
    const response = await fetch(this.url + "/execute-js", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script: command }),
    });
    const result = await response.json();
    return result.result;
  }

  /** @param {string | Actor} actor */
  /** @param {boolean} actorLink */
  /** @return {Token} */
  async tokenCreate(actor, actorLink = false) {
    actor = this._getFromCollection(this._actors, actor);

    const response = await fetch(this.url + "/canvas/tokens", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          x: 0,
          y: 0,
          actorLink: actorLink,
          actorId: actor.data._id,
        },
      }),
    });
    const result = await response.json();
    const token = new Token(this, result.data[0], result.sceneId);
    this._tokens[result.data._id] = token;
    return token;
  }

  /** @param {string | Token} token */
  async tokenDelete(token) {
    token = this._getFromCollection(this._tokens, token);

    const params = { documentId: token.data._id };
    const queryString = new URLSearchParams(params).toString();

    const url = `${this.url}/canvas/tokens?${queryString}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "x-api-key": this.apiKey },
    });
    const result = await response.json();
    return result;
  }

  /** @param {string | Token} token */
  /** @param {number} x */
  /** @param {number} y */
  /** @return {Token} */
  async tokenMove(token, x, y) {
    token = this._getFromCollection(this._tokens, token);

    const response = await fetch(this.url + "/move-token", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: `Actor.${token.data.actorId}`,
        x: x,
        y: y,
        animate: false,
      }),
    });
    const result = await response.json();
    return token;
  }

  /** @param {Record<string, Actor | Token>} collection */
  /** @param {string | Actor | Token} entity */
  _getFromCollection(collection, entity) {
    if (typeof entity == "string") {
      try {
        entity = collection[entity];
      } catch (exception) {
        throw new Error(`No actor registered with id '${entity}'`);
      }
    }
    return entity;
  }
}

class Actor {
  /** @param {ApiHandler} handler */
  /** @param {Record<string, any>} data */
  /** @param {sting} uuid */
  constructor(handler, data, uuid) {
    this.handler = handler;
    this.data = data;
    this.uuid = uuid;
  }

  /** @param {boolean} actorLink */
  async createToken(actorLink = false) {
    return await this.handler.tokenCreate(this, actorLink);
  }

  async delete() {
    return await this.handler.actorDelete(this);
  }

  /** @param {string} preset */
  static getSystemPreset(preset) {
    if (preset == "10s") {
      return {
        attributes: {
          end: { advances: 10 },
          str: { advances: 10 },
          spd: { advances: 10 },
          crd: { advances: 10 },
          cha: { advances: 10 },
          emp: { advances: 10 },
          foc: { advances: 10 },
          res: { advances: 10 },
          int: { advances: 10 },
        },
      };
    }
    return {};
  }

  /** @return {Record<string, any>} */
  async updateData() {
    const result = await this.handler.actorGetDocument(this.uuid);
    this.data = result;
    return result;
  }
}

class Item {
  /** @param {ApiHandler} handler */
  /** @param {Record<string, any>} data */
  /** @param {sting} uuid */
  constructor(handler, data, uuid) {
    this.handler = handler;
    this.data = data;
    this.uuid = uuid;
  }

  /** @param {boolean} actorLink */
  async createToken(actorLink = false) {
    return await this.handler.tokenCreate(this, actorLink);
  }

  async delete() {
    return await this.handler.itemDelete(this);
  }
}

class Encounter {
  /** @param {ApiHandler} handler */
  /** @param {string} encounterId */
  constructor(apiHandler, encounterId) {
    this.handler = apiHandler;
    this.encounterId = encounterId;
  }

  /** @param {ApiHandler} handler */
  static async start(apiHandler) {
    return await apiHandler.encounterStart();
  }

  /** @param {(string | Token)[]} tokens */
  /** @return {Encounter} */
  async addTokens(tokens) {
    await this.handler.encounterAddTokens(tokens, this.encounterId);
    return this;
  }

  async end() {
    return await this.handler.encounterEnd(this.encounterId);
  }

  /** @return {Encounter} */
  async nextTurn() {
    await this.handler.encounterNextTurn(this.encounterId);
    return this;
  }
}

class Token {
  /** @param {ApiHandler} handler */
  /** @param {Record<string, any>} data */
  /** @param {string} sceneId */
  constructor(handler, data, sceneId) {
    this.handler = handler;
    this.data = data;
    this.sceneId = sceneId;
  }

  /** @param {number} x */
  /** @param {number} y */
  /** @param {boolean} relative */
  async move(x = 0, y = 0, relative = true) {
    if (relative) {
      x += this.data.x;
      y += this.data.y;
    }
    await this.handler.tokenMove(this, x, y);
    return this;
  }

  async delete() {
    return await this.handler.tokenDelete(this);
  }

  /** @return {Record<string, any>} */
  async getActorDocument() {
    const result = await this.handler.actorGetDocument(
      `Actor.${this.data.actorId}`,
    );
    return result;
  }

  /** @return {string} */
  get uuid() {
    return `Scene.${this.sceneId}.Token.${this.data._id}`;
    return `Scene.${this.sceneId}.Actor.${this.data.actorId}.Token.${this.data._id}`;
  }
}
