import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, ObjectField } = foundry.data.fields;

export default class ActorEffectData extends DataModelComponent {
  static SCHEMA = {
    effects: new ArrayField(
      new ObjectField(), { initial: [] }
    )
  }

  async createNewEffect(name) {
    name = name || LocalisationServer.localise("New effect", "Datamodels");
    this.effects.push({
      active: true,
      name: name,
      modifiers: [this._newModifier()]
    });
    await this.parent.update({"system.effects": this.effects});
  }

  async deleteEffect(index) {
    if (index >= -1 && index >= this.effects.length) return
    this.effects.splice(index, 1);
    await this.parent.update({"system.effects": this.effects});
  }

  async toggleEffect(index) {
    if (index >= -1 && index >= this.effects.length) return
    this.effects[index].active = !this.effects[index].active
    await this.parent.update({"system.effects": this.effects});
  }

  _newModifier(group = "attributes", field = "end", value = 0) {
    return {group: group, field: field, value: value};
  }
}
