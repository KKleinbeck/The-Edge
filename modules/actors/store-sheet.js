import IconSelectorMixin from "../mixins/icon-selector-mixin.js";
import Aux from "../system/auxilliaries.js";
import NotificationServer from "../system/notifications.js";
import { TheEdgeActorSheet } from "./actor-sheet.js";

export class TheEdgeStoreSheet extends IconSelectorMixin(TheEdgeActorSheet) {
  constructor (options) {
    super(options);

    this.playerTokens = Aux.getPlayerTokens();
    const storeToken = this.document.token;
    if (storeToken) { // Sort tokens by proximity (relevant for player view)
      this.playerTokens.sort((a, b) => {
        return Aux.tokenDistance(a, storeToken) - Aux.tokenDistance(b, storeToken)
      })
    }
    this.selectedTokenIndex = 0;
  }

  static DEFAULT_OPTIONS = {...TheEdgeActorSheet.DEFAULT_OPTIONS,
    actions: {
      itemInformation: TheEdgeStoreSheet._editItem,
      delete: TheEdgeStoreSheet._deleteItem,
      buyOrRetrieve: TheEdgeStoreSheet._buyOrRetrieveItem,
      sellOrStore: TheEdgeStoreSheet._sellOrStoreItem
    },
  }

  static PARTS = {
    form: {
      template: "systems/the_edge/templates/actors/store/store-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs" // Foundry default
    },
    Ammunition: {
      template: "systems/the_edge/templates/actors/store/meta-item-page.hbs"
    },
    Armour: {
      template: "systems/the_edge/templates/actors/store/meta-item-page.hbs"
    },
    Consumables: {
      template: "systems/the_edge/templates/actors/store/meta-item-page.hbs"
    },
    Gear: {
      template: "systems/the_edge/templates/actors/store/meta-item-page.hbs"
    },
    Weapon: {
      template: "systems/the_edge/templates/actors/store/meta-item-page.hbs"
    },
    Sell: {
      template: "systems/the_edge/templates/actors/store/buy-from-player.hbs"
    },
    Store: {
      template: "systems/the_edge/templates/actors/store/buy-from-player.hbs"
    }
  }

  static TABS = {
    primary: {
      tabs: [{id: "Gear"}, {id: "Test"}],
      labelPrefix: "TABS",
      initial: "Gear",
    }
  }

  async render(options={}, _options={}) {
    // Select only item classes that have content (+ always Gear)
    const tabs = Object.entries(this.document.itemTypes)
      .filter(x => x[1].length > 0 || x[0] == "Gear")
      .map(x => { return {id: x[0]}; })
    if (this.actor.system.buysFromPlayer) {
      if (this.actor.system.isStorage) tabs.push({ id: "Store" });
      else tabs.push({ id: "Sell" });
    }
    this.constructor.TABS.primary.tabs = tabs;
    super.render(options, _options);
  }

  async _onDropItem(event, data) {
    const item = (await Item.implementation.fromDropData(data)).toObject();
    switch (item.type) {
      case "Weapon":
      case "Armour":
        return super._onDropItem(event, data)

      case "Ammunition":
      case "Gear":
      case "Consumables":
        return this._onDropStackableItem(event, data, item)
      
      default:
        return;
    }
  }

  async _prepareContext(_options) {
    context.store = this.document;
    context.tokens = this.playerTokens;
    context.selectedTokenIndex = this.selectedTokenIndex;
    context.userIsGM = game.user.isGM;

    context.playerItemTypes = {};
    const playerActor = this.playerTokens[this.selectedTokenIndex].actor;
    for (const [type, items] of Object.entries(playerActor.itemTypes)) {
      if (items.length && "value" in game.model.Item[type]) {
        context.playerItemTypes[type] = items.filter(
          x => (!("equipped" in x.system) || !x.system.equipped) &&
                (!("loaded" in x.system) || !x.system.loaded)
        );
      }
    }

    context.tabs = this._prepareTabs("primary");
    return context;
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = partId;

    switch (partId) {
      case "Ammunition":
      case "Armour":
      case "Gear":
        context.items = this.actor.itemTypes[partId];
        break;

      case "Consumables":
        // Sort items by subtype
        context.groups = {};
        for (const item of this.actor.itemTypes["Consumables"]) {
          if (!(item.system.subtype in context.groups)) {
            context.groups[item.system.subtype] = [item];
          } else {
            context.groups[item.system.subtype].push(item);
          }
        }
        break;
      
      case "Weapon":
        // Sort items by weapon category
        context.groups = {};
        for (const item of this.actor.itemTypes["Weapon"]) {
          if (!(item.system.type in context.groups)) {
            context.groups[item.system.type] = [item];
          } else {
            context.groups[item.system.type].push(item);
          }
        }
        break;
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options)

    this.element.querySelectorAll(".actor-selection-hook").forEach(x =>
      x.addEventListener("change", event => {
        this.selectedTokenIndex = event.currentTarget.value;
      })
    );
  }

  onIconSelected(_iconType, value) {
    const newIsStorage = value === "Storage";
    if (this.actor.system.isStorage !== newIsStorage) {
      this.actor.update({"system.isStorage": newIsStorage})
    }
  }

  // Actions
  static _editItem(_event, target) {
    const itemInformation = target.closest(".item").dataset;
    if ("parentId" in itemInformation) {
      const actor = game.actors.get(itemInformation.parentId);
      const item = actor.items.get(itemInformation.itemId);
      item.sheet.render(true);
    } else {
      const item = this.actor.items.get(itemInformation.itemId);
      item.sheet.render(true);
    }
  }

  static _deleteItem(_event, target) {
    const itemInformation = target.closest(".item").dataset;
    const item = this.actor.items.get(itemInformation.itemId);
    item.delete();
  }

  static _buyOrRetrieveItem(_event, target) {
    if (!this.playerTokens.length) return;
    const token = this.playerTokens[this.selectedTokenIndex];

    const credits = token.actor.system.credits.chids +
      token.actor.system.credits.digital;

    const itemInformation = target.closest(".item").dataset;
    const price = +itemInformation.price;
    if (credits < price && !this.actor.system.isStorage) {
      NotificationServer.notify(
        "Too expensive",
        {name: token.name, price: price, credits: credits}
      );
      return
    }

    const payload = {
      sceneId: game.canvas.id,
      tokenId: token.id,
      storeId: this.actor.token.id,
      itemId: itemInformation.itemId
    };
    if (game.user.isGM) {
      TheEdgeStoreSheet.handleBuyOrRetrieve(payload);
    } else {
      game.the_edge.socketHandler.emit("BUY_OR_RETRIEVE", payload);
    }
  }

  static handleBuyOrRetrieve(payload) {
    const {sceneId, tokenId, storeId, itemId} = payload;
    const scene = game.scenes.get(sceneId);
    const store = scene.tokens.get(storeId).actor;
    const actor = scene.tokens.get(tokenId).actor;
    const item = store.items.get(itemId);

    const price = item.system.value * store.system.tradeFactor;
    const credits = actor.system.credits.chids + actor.system.credits.digital;

    if (credits >= price || store.system.isStorage) {
      if (!store.system.isStorage) {
        const [chids, digital] = actor.pay(price);
        store.getCredits(chids, digital);
      }

      const existingCopy = actor.findItem(item);
      if (existingCopy && "quantity" in item.system) {
        existingCopy.update({"system.quantity": existingCopy.system.quantity + 1});
      } else {
        const itemCls = getDocumentClass("Item");
        const newSystem = {...item.system};
        newSystem.quantity = 1;
        itemCls.create({name: item.name, type: item.type, system: newSystem}, {parent: actor});
      }

      if (item.system.quantity > 1) item.update({"system.quantity": item.system.quantity - 1});
      else item.delete();
    }
  }

  static _sellOrStoreItem(_event, target) {
    if (!this.playerTokens.length) return;
    const token = this.playerTokens[this.selectedTokenIndex];

    const credits = this.actor.system.credits.chids + this.actor.system.credits.digital;

    const itemInformation = target.closest(".store-item").dataset;
    const price = +itemInformation.price;
    if (credits < price && !this.actor.system.isStorage) {
      NotificationServer.notify(
        "Too expensive",
        {name: this.actor.name, price: price, credits: credits}
      );
      return
    }

    const payload = {
      sceneId: game.canvas.id,
      tokenId: token.id,
      storeId: this.actor.token.id,
      itemId: itemInformation.itemId
    };
    if (game.user.isGM) {
      TheEdgeStoreSheet.handleSellOrStore(payload);
    } else {
      game.the_edge.socketHandler.emit("SELL_OR_STORE", payload);
    }
  }
  
  static handleSellOrStore(payload) {
    const {sceneId, tokenId, storeId, itemId} = payload;
    const scene = game.scenes.get(sceneId);
    const store = scene.tokens.get(storeId).actor;
    const actor = scene.tokens.get(tokenId).actor;
    const item = actor.items.get(itemId);

    const price = item.system.value / store.system.tradeFactor;
    const credits = store.system.credits.chids + store.system.credits.digital;

    if (credits >= price) {
      if (!store.system.isStorage) {
        const [chids, digital] = store.pay(price);
        actor.getCredits(chids, digital);
      }

      const existingCopy = store.findItem(item);
      if (existingCopy && "quantity" in item.system) {
        existingCopy.update({"system.quantity": existingCopy.system.quantity + 1});
      } else {
        const itemCls = getDocumentClass("Item");
        const newSystem = {...item.system};
        newSystem.quantity = 1;
        itemCls.create({name: item.name, type: item.type, system: newSystem}, {parent: store});
      }
      
      if (item.system.quantity > 1) item.update({"system.quantity": item.system.quantity - 1});
      else item.delete();
    }
  }
}