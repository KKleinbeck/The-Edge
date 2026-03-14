import ChatServer from "../../modules/system/chat_server.js";
import { DataModelComponent } from "../abstracts.js";

const { ArrayField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

export default class CharacterBaseData extends DataModelComponent {
  static defineSchema() {
    return {
      biography: new HTMLField(),
      heroToken: new SchemaField({
        max: new NumberField({ initial: 2, min: 0, required: true }),
        available: new NumberField({ initial: 1, min: 0, required: true }),
      }),
      height: new NumberField({ initial: 170, integer: true, required: true, min: 0 }),
      PracticeHours: new SchemaField({
        used: new NumberField({ initial: 0, integer: true, required: true, min: 0 }),
        max: new NumberField({ initial: 50000, integer: true, required: true, min: 0 })
      }),
      AdvantagePoints: new SchemaField({
        used: new NumberField({ initial: 0, integer: true, required: true }),
        max: new NumberField({ initial: 0, integer: true, required: true })
      }),
      counters: new ArrayField(
        new SchemaField({
          name: new StringField({ initial: "" }),
          value: new NumberField({ initial: 1, integer: true, min: 0 }),
          max: new NumberField({ initial: 1, integer: true, min: 0 }),
        }),
        { initial: [] }
      ),
    };
  };

  // Hero Token related
  async useHeroToken(reason = "generic") {
    await this.parent.update({"system.heroToken.available": this.heroToken.available - 1});
    ChatServer.transmitEvent("Hero Token", {name: this.parent.name, reason: reason});
  }

  async regenerateHeroToken() {
    await this.parent.update({"system.heroToken.available": this.heroToken.available + 1});
  }
}