import THE_EDGE from "../system/config-the-edge.js";

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

  static PARTS = {
    form: {
      template: "systems/the_edge/templates/actors/character/actor-header.hbs"
    }
  }

  get title () { return this.actor.name; } // Override in tandom with option.window.title

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = context.document.system;
    context.prepare = this.actor.prepareSheet()

    const equippedArmour = this.actor.itemTypes["Armour"]?.filter(
      a => a.system.equipped && a.system.layer == "Inner");
    let armourProtection = 0;
    for (const armour of equippedArmour) {
      armourProtection += armour.system.structurePoints;
      for (const attachment of armour.system.attachments) {
        armourProtection += attachment.shell.system.structurePoints;
      }
    }
    const equippedWeapons = this.actor.itemTypes["Weapon"]?.filter(
      a => a.system.equipped
    );

    const credits = this.actor.itemTypes["Credits"]
    const creditsOffline = credits.find(c => c.system?.isSchid)?.system?.value || 0;
    const creditsDigital = credits.find(c => !c.system?.isSchid)?.system?.value || 0;
    const weight =  this.actor._determineWeight();
    const wounds = this.actor.itemTypes["Wounds"];
    context.helpers = {
      armourProtection: armourProtection,
      equippedWeapons: equippedWeapons,
      bodyParts: ["Torso", "Head", "Arms", "Legs"],
      bleeding: wounds.map(x => x.system.bleeding).sum(),
      credits: {"Schids": creditsOffline, "digital": creditsDigital},
      damage: wounds.map(x => x.system.damage).sum(),
      languages: THE_EDGE.languages,
      types: ["Weapon", "Armour", "Ammunition", "Gear", "Consumables"],
      weight: weight,
      overloadLevel: this.actor.overloadLevel,
      weightTillNextOverload: this.actor.weightTillNextOverload,
      hrProgressBarData: [
        {value: context.system.heartRate.min.value, label: "Z1"},
        {value: context.prepare.zones[1].value, label: "Z2"},
        {value: context.prepare.zones[2].value, label: "Z3"},
      ]
    }
    console.log(context)
    return context;
  }
}

