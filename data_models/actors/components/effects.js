import LocalisationServer from "../../../modules/system/localisation_server.js";
import { DataModelComponent } from "../../abstracts.js";

const { ObjectField, TypedObjectField } = foundry.data.fields;

export default class ActorEffectData extends DataModelComponent {
  // TODO: Validator for inner object field?
  static SCHEMA = {
    effects: new TypedObjectField(
      new ObjectField(), { initial: {} }
    )
  }

  async createNewEffect(name) {
    name = name || LocalisationServer.localise("New effect", "Datamodels");
    const update = {};
    update[`system.effects.${foundry.utils.randomID()}`] = {
      active: true,
      name: name,
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
    if (id in this.effects) {
      const update = {};
      update[`system.effects.${id}.active`] = !this.effects[id].active;
      await this.parent.update(update);
    }
  }

  _findEffectsByName(name) {
    // Returns all effect IDs by their Name.
    const result = [];
    for (const [candidate, details] of Object.entries(this.effects)) {
      if (name === details.name) result.push(candidate);
    }
    return result;
  }

  _newModifier(group = "attributes", field = "end", value = 0) {
    return {group: group, field: field, value: value};
  }
}
