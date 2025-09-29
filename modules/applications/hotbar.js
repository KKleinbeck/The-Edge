import THE_EDGE from "../system/config-the-edge.js"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

// export default class TheEdgeHotbar extends HandlebarsApplicationMixin(ApplicationV2) {
export default class TheEdgeHotbar extends foundry.applications.ui.Hotbar { // In v13: foundry.applications.ui.Hotbar
  constructor (options) {
    super(options);

    const actors = this.getActors();
    this.selectedActorId = Object.keys(actors)[0];
  }

  get template() {
    return "systems/the_edge/modules/applications/templates/hotbar.hbs"
  }

  async getData(options) {
    const context = {};
    console.log("==================================")
    console.log("Context")
    context.selectedActorId = this.selectedActorId;
    context.actors = this.getActors();
    context.attributes = THE_EDGE.attrs;

    const actor = game.actors.get(this.selectedActorId);
    context.counters = actor.system.counters;
    console.log(context)
    return context;
  }

  getActors() {
    const actors = {};
    for (const actor of game.actors) {
      if (actor.isOwner) {
        actors[actor.id] = actor.name;
      }
    }
    return actors;
  }

  async _onClickMacro(event) {
  }
}