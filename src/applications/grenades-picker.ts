import THE_EDGE from "../system/config-the-edge.js";
import NewChatServer from "../system/new_chat_server.js";
import DialogProficiency from "../dialogs/dialog-proficiency.js";
import ProficiencyConfig from "../system/config-proficiencies.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface _IExtendedRollMessage extends IProficiencyRollMessage {
  rollOutcome: IThrowingOutcome
}
interface _IGrenadePickerPayload {
  actor: Actor
  rollDetails: _IExtendedRollMessage
  tokenPosition: IPosition
  targetPosition: IPosition
  grenade: Item
  sceneId: string
}

export default class GrenadePicker extends HandlebarsApplicationMixin(ApplicationV2) {
  declare chosenActorIndex: number
  declare chosenGrenadeIndex: number
  declare targetPosition: {x: number, y: number}

  constructor (options) {
    super(options);
    this.chosenActorIndex = 0;
    this.chosenGrenadeIndex = 0;
    this.targetPosition = {
      x: options.mousePosition.x, y: options.mousePosition.y
    }; // mousePosition constantly updates. The explicit assignment freezes it

    // Get all controlled actors and their grenade options
    const tokens = canvas.scene.tokens.filter(x => x.isOwner);

    this.actorOptions = [];
    for (const token of tokens) {
      if (token.actor.type !== "character") continue;

      const grenades = token.actor.itemTypes["Consumables"].filter(
        x => {return "grenade" == x.system.current_type;}
      )
      if (grenades.length >= 1) {
        const distance = this._getDistance(this.targetPosition, token);
        const size = (Object.values(THE_EDGE.sizes) as number[]).find(
          (value: number, _index: number, _obj: unknown[]) => value > token.actor.system.height
        );
        const modifier = this._getDistanceModifier(distance, size);
        this.actorOptions.push({
          id: token.id, name: token.actor.name, distance: distance, modifier: modifier, grenades: grenades
        });
      }
    }
  }


  static DEFAULT_OPTIONS = {
    tag: "form",
    form: {
      handler: GrenadePicker.formHandler,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      rollCheck: GrenadePicker._rollCheck
    },
    window: {
      title: "Grenade Picker"
    },
    classes: ["grenade-picker"]
  }


  static PARTS = {
    from: {
      template: "systems/the_edge/templates/applications/grenade-picker.hbs"
    }
  }


  hasContent() { return this.actorOptions.length >= 1; }


  async _prepareContext(_options: foundryAny) {
    const actors = this.actorOptions;
    const chosenActor = actors[this.chosenActorIndex];
    const chosenActorIndex = this.chosenActorIndex;
    const grenadeOptions = actors[this.chosenActorIndex].grenades;
    return {actors, chosenActor, chosenActorIndex, grenadeOptions};
  }


  _getDistance(mousePosition, token) {
    const factor = canvas.scene.grid.distance / canvas.scene.grid.size;
    const offset = canvas.scene.grid.size / 2; // To use the mid of token instead of the corner
    return factor * Math.hypot(mousePosition.x - token.x - offset, mousePosition.y - token.y - offset);
  }


  _getDistanceModifier(distance: number, size) {
    if (distance <= THE_EDGE.sizeFreeThrow[size]) return 30;
    if (distance <= 10) return Math.floor(10 - distance);
    if (distance <= 20) return Math.floor((10 - distance) / 2);
    return Math.floor((20 - distance) / 4) - 5;
  }


  _onRender(context, options) {
    this.element.querySelector(".actor-selection")?.addEventListener("change", ev => {
      this.chosenActorIndex = +ev.currentTarget.value;
      this.chosenGrenadeIndex = 0;
      this.render(true);
    });
  }


  static async _rollCheck(_event, target: HTMLElement) {
    const actorOptions = this.actorOptions[this.chosenActorIndex];
    const token = canvas.scene.tokens.get(actorOptions.id);
    const rollQuery: IProficiencyRollQuery = {
      proficiency: "throwing", actor: token.actor, actorId: token.actor.id, tokenId: token.id,
      sceneId: canvas.scene.id, transmit: false, modifier: actorOptions.modifier
    }
    DialogProficiency.start(
      rollQuery, (rollDetails: IProficiencyRollMessage) => this._onRollCompleted(rollDetails, target)
    );
    this.close();
    return;

    // const checkData = {
    //   proficiency: "throwing", modifier: chosenActor.modifier, vantage: "Nothing",
    //   actor: token.actor, actorId: token.actor.id, tokenId: token.id, sceneId: canvas.scene.id,
    //   titleDetails: chosenGrenade.name, grenade: chosenGrenade, strain: 0
    // };
    const proficiencyRoll = await token.actor.system.rollProficiencyCheck(rollQuery, false);
    foundry.utils.mergeObject(rollQuery, proficiencyRoll);
  }


  _onRollCompleted(rollDetails: IProficiencyRollMessage, target: HTMLElement) {
    const {token, chosenGrenade} = this._getTokenAndGrenade(target) ?? {};
    if (!token) return;

    const rollOutcome = ProficiencyConfig.rollOutcome("throwing", rollDetails.quality);
    foundry.utils.mergeObject(rollDetails, {rollOutcome, titleDetails: chosenGrenade.name});
    const chatServerConfig: IChatServerConfig = {speaker: {scene: canvas.scene.id, token: token.id}};
    NewChatServer.transmitEvent("PROFICIENCY CHECK", rollDetails, chatServerConfig);

    const payload: _IGrenadePickerPayload = {
      actor: token.actor, rollDetails: rollDetails as _IExtendedRollMessage, tokenPosition: {x: token.x, y: token.y},
      targetPosition: this.targetPosition, grenade: chosenGrenade, sceneId: canvas.scene.id
    };
    game.the_edge.socketHandler.emit("CREATE_GRENADE_TILE", payload);
    if (game.user.isActiveGM) GrenadePicker.createGrenadeTile(payload); // As we do not catch our own events

    chosenGrenade.useOne();
  }


  _getTokenAndGrenade(target: HTMLElement) {
    if (!target.parentNode) return;
    const grenadeIndex = +(target.parentNode.querySelector(".grenade-selection") as HTMLInputElement).value;

    const chosenActor = this.actorOptions[this.chosenActorIndex];
    const token = canvas.scene.tokens.get(chosenActor.id);
    const chosenGrenade = chosenActor.grenades[grenadeIndex];
    return {token, chosenGrenade};
  }


  static async createGrenadeTile(payload: _IGrenadePickerPayload) {
    const { rollDetails, tokenPosition, targetPosition, grenade } = payload;
    const cls = getDocumentClass("Tile");
    const position = GrenadePicker._createGrenadePosition(
      rollDetails.quality, rollDetails.rollOutcome, tokenPosition, targetPosition
    );
    const grenadeTile = await cls.create(
      {
        width: 80, height: 80, ...position, elevation: 1,
        texture: {src: "systems/the_edge/icons/fragger.png"}
      },
      {parent: canvas.scene}
    );

    const details = {
      nameGrenade: rollDetails.titleDetails, nameActor: payload.actor.name,
      grenade, grenadeTileId: grenadeTile.id,
      sceneId: payload.sceneId
    };
    NewChatServer.transmitEvent("GRENADE CONTEXT BASED", details);
  }

  static _createGrenadePosition(
    quality: number, rollOutcome: IThrowingOutcome, tokenPosition: IPosition, targetPosition: IPosition
  ): IPosition {
    const position: IPosition = {x: 0, y: 0};
    const dist = rollOutcome.distance * canvas.scene.grid.size;
    if (quality >= 0) {
      const angle = Math.PI * (45 * rollOutcome.dir + 40 * Math.random() - 20) / 180;
      position.x = Math.floor(targetPosition.x + dist * Math.sin(angle));
      position.y = Math.floor(targetPosition.y - dist * Math.cos(angle));
    } else {
      const angle = Math.atan2(tokenPosition.y - targetPosition.y, tokenPosition.x - targetPosition.x) +
        Math.PI * (180 * rollOutcome.dir + 40 * Math.random() - 20 + 90) / 180;
      position.x = Math.floor(tokenPosition.x + dist * Math.sin(angle));
      position.y = Math.floor(tokenPosition.y - dist * Math.cos(angle));
    }
    return position;
  }
}