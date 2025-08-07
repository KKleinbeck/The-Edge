import THE_EDGE from "../system/config-the-edge.js";
import ChatServer from "../system/chat_server.js";
import ProficiencyConfig from "../system/config-proficiencies.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class GrenadePicker extends HandlebarsApplicationMixin(ApplicationV2) {
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
      const grenades = token.actor.itemTypes["Consumables"].filter(
        x => {return "grenade" == x.system.subtype;}
      )
      if (grenades.length >= 1) {
        const distance = this._getDistance(this.targetPosition, token);
        const size = Object.entries(THE_EDGE.sizes).find(([_, value]) => value > token.actor.system.height)[0];
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
      template: "systems/the_edge/modules/applications/templates/grenade-picker.hbs"
    }
  }

  hasContent() { return this.actorOptions.length >= 1; }

  async _prepareContext(options) {
    const context = {};
    context.actors = this.actorOptions;
    context.chosenActor = context.actors[this.chosenActorIndex];
    context.chosenActorIndex = this.chosenActorIndex;
    context.grenadeOptions = context.actors[this.chosenActorIndex].grenades;
    return context;
  }

  _getDistance(mousePosition, token) {
    const factor = canvas.scene.grid.distance / canvas.scene.grid.size;
    const offset = canvas.scene.grid.size / 2; // To use the mid of token instead of the corner
    return factor * Math.hypot(mousePosition.x - token.x - offset, mousePosition.y - token.y - offset);
  }

  _getDistanceModifier(distance, size) {
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

  static async _rollCheck(_event, target) {
    const chosenActor = this.actorOptions[this.chosenActorIndex];
    const grenadeIndex = +target.parentNode.querySelector(".grenade-selection").value;
    const chosenGrenade = chosenActor.grenades[grenadeIndex];

    const token = canvas.scene.tokens.get(chosenActor.id);
    const checkData = {
      proficiency: "throwing", temporaryMod: chosenActor.modifier, vantage: "Nothing",
      actor: token.actor, actorId: token.actor.id, tokenId: token.id, sceneId: canvas.scene.id,
      titleDetails: chosenGrenade.name
    };
    const proficiencyRoll = await token.actor.rollProficiencyCheck(checkData, "roll", false);
    foundry.utils.mergeObject(checkData, proficiencyRoll);

    const rollOutcome = ProficiencyConfig.rollOutcome("throwing", proficiencyRoll.quality);
    foundry.utils.mergeObject(checkData, {rollOutcome: rollOutcome.description});
    ChatServer.transmitEvent("ProficiencyCheck", checkData);

    const grenadeId = await this._createGrenadeTile(proficiencyRoll, rollOutcome, token);
    foundry.utils.mergeObject(checkData, {grenadeId: grenadeId});

    chosenGrenade.useOne();
    this.close();
  }

  async _createGrenadeTile(proficiencyRoll, rollOutcome, token) {
    const cls = getDocumentClass("Tile");
    const position = {x: 0, y: 0};
    const dist = rollOutcome.distance * canvas.scene.grid.size;
    if (proficiencyRoll.quality >= 0) {
      const angle = Math.PI * (45 * rollOutcome.dir + 40 * Math.random() - 20) / 180;
      position.x = this.targetPosition.x + dist * Math.sin(angle);
      position.y = this.targetPosition.y - dist * Math.cos(angle);
    } else {
      const angle = Math.atan2(token.y - this.targetPosition.y, token.x - this.targetPosition.x) +
        Math.PI * (180 * rollOutcome.dir + 40 * Math.random() - 20 + 90) / 180;
      position.x = token.x + dist * Math.sin(angle);
      position.y = token.y - dist * Math.cos(angle);
    }
    const grenade = await cls.create(
      {
        width: 80, height: 80, ...position, elevation: 1,
        texture: {src: "systems/the_edge/icons/fragger.png"}
      },
      {parent: canvas.scene}
    );
    return grenade.id;
  }
}