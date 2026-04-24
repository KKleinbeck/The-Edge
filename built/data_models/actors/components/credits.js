import { DataModelComponent } from "../../abstracts.js";
const { NumberField, SchemaField } = foundry.data.fields;
export default class CreditData extends DataModelComponent {
    static defineSchema() {
        return {
            credits: new SchemaField({
                chids: new NumberField({ initial: 0, integer: true, required: true }),
                digital: new NumberField({ initial: 0, integer: true, required: true })
            }),
        };
    }
    ;
    // Credits related
    addCredits(chids, digital) {
        this.parent.update({
            "system.credits.chids": this.credits.chids + chids,
            "system.credits.digital": this.credits.digital + digital
        });
    }
    payCredits(price) {
        this.parent.update({ "system.credits.digital": this.credits.digital - price });
        return [0, price];
    }
}
