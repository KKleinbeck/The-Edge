import { DataModelComponent } from "../../abstracts.js";

const { NumberField, SchemaField } = foundry.data.fields;

export default class StatusEffectData extends DataModelComponent {
  static SCHEMA = {
    statusEffects: new SchemaField({
      "injuries arms": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "injuries head": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "injuries legs": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "injuries torso": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "pain": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "painThreshold": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "overload": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "overloadThreshold": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "vertigo": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "bloodlossThreshold": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) }),
      "bloodlossStepSize": new SchemaField({status: new NumberField({ initial: 0, integer: true, required: true }) })
    })
  }
}
