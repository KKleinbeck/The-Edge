import { DataModelComponent } from "../../abstracts.js";

const { StringField } = foundry.data.fields;

export default class DescriptionData extends DataModelComponent {
  static defineSchema() {
    return {
      description: new StringField({ initial: "" }),
      gmDescription: new StringField({ initial: "" })
    };
  }
}