const { SchemaField } = foundry.data.fields;
export default class ValueSchemaField extends SchemaField {
    constructor(fields, options, context) {
        super(fields, options, context);
    }
    initialize(value, model, options = {}) {
        value = super.initialize(value, model, options);
        for (const required of ["advances", "status"]) {
            if (!(required in value))
                throw new Error(required + " is missing from ValueSchemaField");
        }
        value.value = value.advances + value.status;
        return value;
    }
}
