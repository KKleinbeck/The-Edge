const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets;

export class TheEdgeActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    position: {
      width: 740,
      height: 800,
    },
    form: {
      submitOnChange: true,
    },
    window: {title: ""},
    classes: ["the_edge", "actor"],
    actions: {},
  }

  get title () { return this.actor.name; } // Override in tandom with option.window.title

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = context.document.system;
    context.prepare = this.actor.prepareSheet()
    return context;
  }
}

