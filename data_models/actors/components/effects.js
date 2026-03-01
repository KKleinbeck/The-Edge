import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { ArrayField, ObjectField, TypedObjectField } = foundry.data.fields;

export default class ActorEffectData extends DataModelComponent {
  // TODO: Validator for inner object field?
  static SCHEMA = {
    effects: new TypedObjectField(
      new ObjectField(), { initial: {} }
    )
  }

  async createNewEffect(name) {
    name = name || LocalisationServer.localise("New effect", "Datamodels");
    const existing = this._findEffects(name);
    const update = {};
    update["system.effects." + name + `_${existing.length}`] = {
      active: true,
      modifiers: [this._newModifier()]
    };
    await this.parent.update(update);
  }

  async deleteEffect(id) {
    if (id in this.effects) {
      delete this.effects[id];
      await this.parent.update({"system.effects": this.effects}, {recursive: false});
    }
  }

  async toggleEffect(id) {
    console.log(id)
    if (id in this.effects) {
      const update = {};
      update[`system.effects.${id}.active`] = !this.effects[id].active;
      await this.parent.update(update);
    }
  }

  _findEffects(name) {
    // Returns all effects under the given name.
    // Internally effects are represented as NAME_ID
    const result = [];
    for (const candidate of Object.keys(this.effects)) {
      if (name === candidate.rsplit("_")[0]) result.push(candidate);
    }
    return result;
  }

  _newModifier(group = "attributes", field = "end", value = 0) {
    return {group: group, field: field, value: value};
  }
}
