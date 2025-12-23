import THE_EDGE from "../system/config-the-edge.js"
import { TheEdgePlayableSheet } from "../actors/playable-sheet.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class TheEdgeHotbar extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor (options) {
    super(options);
    this.nWeaponsShown = 1;
    this.weaponSelectedIndex = 0;
    this.token = undefined;

    this.proficiencies = {};
    for (const group of Object.values(game.model.Actor.character.proficiencies)) {
      this.proficiencies = Object.assign(this.proficiencies, group);
    }
    this.proficiencySearchHistory = [];
    for (const prof of Object.keys(this.proficiencies)) {
      // Initialise search history with first proficiency
      const obj = {name: prof, dices: this.proficiencies[prof].dices};
      this.proficiencySearchHistory.push(obj);
      break;
    }
    this.searchCandidate = undefined;
    this.searchBuffer = "";
  }

  static DEFAULT_OPTIONS = {
    // ...foundry.applications.ui.Hotbar.DEFAULT_OPTIONS,
    id: "hotbar",
    tag: "aside",
    classes: [
      ...foundry.applications.ui.Hotbar.DEFAULT_OPTIONS.classes,
      "the_edge", "the_edge-hotbar"
    ],
    window: {
      frame: false,
      positioned: false
    },
    actions: {
      reloadActor: TheEdgeHotbar._onReloadActor,
      rollAttack: TheEdgeHotbar._onRollAttack,
      rollAttr: TheEdgeHotbar._onRollAttr,
      rollProficiency: TheEdgeHotbar._onRollProficiency,
      rollSearchProficiency: TheEdgeHotbar._onRollSearchProficiency,
      scrollWeaponsDown: TheEdgeHotbar._onScrollWeaponsDown,
      scrollWeaponsUp: TheEdgeHotbar._onScrollWeaponsUp,
      searchProficiency: TheEdgeHotbar._onSearchProficiency,
    }
  };

  /** @override */
  static PARTS = {
    hotbar: {
      root: true,
      template: "systems/the_edge/modules/applications/templates/hotbar.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.selectedActorId = this.selectedActorId;
    context.attributes = THE_EDGE.attrs;

    const actor = this.getActor();
    this.selectedActorId = actor?.id;
    context.selectedActorId = this.selectedActorId;
    context.selectedActorName = actor?.name ?? "No Actor Selected";
    context.counters = actor?.system.counters;
    context.actor = actor;

    const equippedArmour = actor?.itemTypes["Armour"]?.filter(
      a => a.system.equipped && a.system.layer == "Inner") ?? [];
    context.armourProtection = 0;
    for (const armour of equippedArmour) {
      context.armourProtection += armour.system.structurePoints;
      for (const attachment of armour.system.attachments) {
        context.armourProtection += attachment.shell.system.structurePoints;
      }
    }

    context.equippedWeapons = actor?.itemTypes["Weapon"]?.filter(
      w => w.system.equipped) ?? [];
    context.weaponsScroll = context.equippedWeapons.length > this.nWeaponsShown;
    if (context.weaponsScroll) {
      const actualList = [];
      for (let i = 0; i < this.nWeaponsShown; i++) {
        actualList.push(context.equippedWeapons[
          (i + this.weaponSelectedIndex) % context.equippedWeapons.length
        ]);
      }
      context.equippedWeapons = actualList;
    }
    context.proficiencySearchHistory = this.proficiencySearchHistory;
    context.searchCandidate = this.searchCandidate;
    return context;
  }

  getActor() {
    const controlled = canvas.tokens?.controlled;
    if (controlled?.length) {
      this.token = controlled[0];
      return controlled[0].actor;
    }

    const tokens = canvas.scene?.tokens ?? [];
    for (const token of tokens) {
      const actor = token.actor;
      if (actor.isOwner && actor.type == "character") {
        this.token = token;
        return actor;
      }
    }
    return undefined;
  }

  async _onRender(_context, _options){
    const input = this.element.querySelector("input[name='proficiency']")
    input?.addEventListener("keypress", async ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        this._saveSearchAndReset();
      } else if (ev.key.length === 1) {
        // The combination of these three lines prevents the automatic
        // input handling and we can manually handle it
        ev.preventDefault();
        ev.cancelBubble = true;
        ev.stopPropagation();
        this.searchBuffer += ev.key;
        this._updateSearchCandidate();
        this.render(true);
      }
    });
    input?.addEventListener("keydown", async ev => {
      if (ev.key === "Backspace") {
        ev.preventDefault();
        ev.cancelBubble = true;
        ev.stopPropagation();
        this.searchBuffer = this.searchBuffer.slice(0, -1);
        this._updateSearchCandidate();
        this.render(true);
      }
    });

    if (this.searchBuffer) {
      input.value = this.searchBuffer;
      input.focus();
    }
  }

  _saveSearchAndReset() {
    if (this.searchCandidate) {
      this.proficiencySearchHistory.splice(0, 0, this.searchCandidate);
    }
    const hotbar = window.document.getElementById("hotbar-lowered-right");
    const nProficienciesShown = Math.floor((hotbar.clientHeight - 40) / 31) - 1;
    this.proficiencySearchHistory.splice(
      nProficienciesShown,
    );

    this.searchCandidate = undefined;
    this.searchBuffer = "";
    this.render(true);
  }

  _updateSearchCandidate() {
    this.searchCandidate = undefined;
    for (const prof of Object.keys(this.proficiencies)) {
      if (prof.toLowerCase().includes(this.searchBuffer.toLowerCase())) {
        this.searchCandidate = {
          name: prof, dices:
          this.proficiencies[prof].dices
        };
        break;
      }
    }
  }

  _onResize() {
    const hotbar = window.document.getElementById("hotbar-lowered-right");
    this.nWeaponsShown = Math.floor((hotbar.clientHeight - 40) / 31);
    this.render(true);
  }

  static async _onRollAttack(event, target) {
    TheEdgePlayableSheet.rollAttack.call(this.token.sheet, event, target);
  }

  static async _onRollAttr(event, target) {
    TheEdgePlayableSheet.rollAttribute.call(this.token.sheet, event, target);
  }

  static async _onRollSearchProficiency(event, target) {
    this._saveSearchAndReset();
    TheEdgeHotbar._onRollProficiency.call(this, event, target);
  }

  static async _onRollProficiency(event, target) {
    TheEdgePlayableSheet.rollProficiency.call(this.token.sheet, event, target);
  }

  static async _onScrollWeaponsDown(_event, _target) {
    this.weaponSelectedIndex += 1;
    this.render(true);
  }

  static async _onScrollWeaponsUp(_event, _target) {
    this.weaponSelectedIndex -= 1;
    this.render(true);
  }

  static async _onReloadActor(_event, _target) {
    this.render(true);
    this.weaponSelectedIndex = 0;
  }

  static async _onSearchProficiency(_event, target) {
    var input = target.querySelector("input[name='proficiency']");
    // Manually bring input into focus
    input.focus();
  }
}