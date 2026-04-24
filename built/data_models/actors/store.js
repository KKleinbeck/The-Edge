import { generateDataModelWithComponents } from "../abstracts.js";
import CreditData from "./components/credits.js";
const { BooleanField, NumberField } = foundry.data.fields;
export default class StoreData extends generateDataModelWithComponents(CreditData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.tradeFactor = new NumberField({ initial: 1 });
        schema.isStorage = new BooleanField({ initial: false });
        schema.buysFromPlayer = new BooleanField({ initial: false });
        return schema;
    }
}
