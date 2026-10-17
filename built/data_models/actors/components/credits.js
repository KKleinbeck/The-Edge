import { DataModelComponent } from "../../abstracts.js";
const { NumberField, SchemaField } = foundry.data.fields;
export default class CreditData extends DataModelComponent {
    static defineSchema() {
        return {
            credits: new NumberField({ initial: 0, integer: true, required: true }),
        };
    }
    // TODO: Remove with v0.17
    static migrateData(source, _options) {
        if ("credits" in source && typeof (source.credits) != "number") {
            source.credits = (source.credits.chids ?? 0) + (source.credits.digital ?? 0);
        }
        return source;
    }
    // Credits related
    addCredits(credits) {
        this.parent.update({
            "system.credits": this.credits + credits,
        });
    }
    payCredits(price) {
        this.parent.update({
            "system.credits": this.credits - price,
        });
    }
}
