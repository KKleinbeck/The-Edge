import Aux from "../system/auxilliaries.js"

export class TheEdgeItem extends Item {
  static defaultImages = {
    Weapon: "systems/the_edge/icons/rifle.png",
    Armour: "systems/the_edge/icons/helmet.png",
    Ammunition: "systems/the_edge/icons/ammunition.png",
    Advantage: "systems/the_edge/icons/advantage.png",
    Disadvantage: "systems/the_edge/icons/disadvantage.png",
    Skill: "systems/the_edge/icons/skill.png",
    Combatskill: "systems/the_edge/icons/combat_skill.png",
    Medicalskill: "systems/the_edge/icons/medical_skill.png",
    Languageskill: "systems/the_edge/icons/speech.png",
    Gear: "systems/the_edge/icons/gear.png",
    Consumables: "systems/the_edge/icons/consumables.png",
  }


  static defaultIcon(data: foundryAny) {
    if (!data.img || data.img == "") {
      if (data.type in this.defaultImages) {
        data.img = this.defaultImages[data.type]
      } else {
        data.img = "systems/the_edge/icons/rifle.png"
      }
    }
  }


  static async create(data: foundryAny, options: foundryAny) {
    this.defaultIcon(data)
    return await super.create(data, options)
  }


  get isTemplate(): boolean {
    return !!this.getFlag("the_edge", "isTemplate");
  }


  async useOne() {
    if (this.system.quantity > 1) {
      await this.update({"system.quantity": this.system.quantity - 1});
    } else await this.delete();
  }


  effectHooks(field: TEventNames, details: Record<string, any>): void {
    for (const modifier of this.system.modifiers) {
      if (modifier.field === field) {
        Aux.evalOnEventWith(modifier.value, details, this.id);
      }
    }
  }
}