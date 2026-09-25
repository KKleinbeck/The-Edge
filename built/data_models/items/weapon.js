import { generateDataModelWithComponents } from "../abstracts.js";
import THE_EDGE from "../../system/config-the-edge.js";
import DescriptionData from "./components/description.js";
import EmbeddedSkillsData from "./components/embedded-skills.js";
import EquipableData from "./components/equipable.js";
import NonstackableData from "./components/nonstackable.js";
const { ArrayField, BooleanField, NumberField, ObjectField, SchemaField, StringField, } = foundry.data.fields;
export default class WeaponData extends generateDataModelWithComponents(DescriptionData, EmbeddedSkillsData, EquipableData, NonstackableData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.type = new StringField({ initial: "Pulse Rifle" });
        schema.isElemental = new BooleanField({ initial: false });
        schema.multipleTargets = new BooleanField({ initial: false });
        schema.fireModes = new ArrayField(new ObjectField(), {
            initial: [
                {
                    name: "Single",
                    damage: "1d20",
                    cost: 1,
                    dices: 1,
                    precisionPenalty: [0, 0],
                },
            ],
        });
        schema.reloadDuration = new NumberField({ initial: 1, integer: true });
        schema.leadAttr1 = new SchemaField({
            name: new StringField({ initial: "str" }),
            value: new NumberField({ initial: 10, integer: true }),
        });
        schema.leadAttr2 = new SchemaField({
            name: new StringField({ initial: "str" }),
            value: new NumberField({ initial: 10, integer: true }),
        });
        schema.rangeChart = new SchemaField({
            less_2m: new ArrayField(new NumberField({ initial: 0, integer: true }), {
                initial: [0, 0],
            }),
            less_10m: new ArrayField(new NumberField({ initial: 0, integer: true }), {
                initial: [0, 0],
            }),
            less_25m: new ArrayField(new NumberField({ initial: 0, integer: true }), {
                initial: [0, 0],
            }),
            less_100m: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
            more_100m: new ArrayField(new NumberField({ initial: 0, integer: true }), { initial: [0, 0] }),
        });
        schema.attachments = new ArrayField(new ObjectField(), { initial: [] });
        schema.ammunitionType = new StringField({ initial: "small" });
        schema.ammunitionID = new StringField({ initial: "" });
        return schema;
    }
    unloadAmmunition() {
        const ammu = this.parent.actor.items.get(this.ammunitionID);
        const unloadedCopy = this.parent.actor.findItem(ammu);
        if (unloadedCopy) {
            ammu.delete();
            unloadedCopy.update({
                "system.quantity": unloadedCopy.system.quantity + 1,
            });
        }
        else {
            ammu.update({ "system.loaded": false });
        }
        this.parent.update({ "system.ammunitionID": "" });
    }
    get damageType() {
        if (this.isElemental)
            return "elemental";
        if (Object.keys(THE_EDGE.characterSchema.weapons.energy).includes(this.type)) {
            return "energy";
        }
        return "kinetic";
    }
    // TODO: Remove with v0.17
    static migrateData(source, _options) {
        if ("less_1km" in (source.rangeChart ?? {})) {
            const newRangeChart = {};
            if ("less_20m" in source.rangeChart)
                newRangeChart["less_10m"] = source.rangeChart.less_20m;
            if ("less_200m" in source.rangeChart)
                newRangeChart["less_25m"] = source.rangeChart.less_200m;
            if ("less_1km" in source.rangeChart)
                newRangeChart["less_100m"] = source.rangeChart.less_1km;
            if ("more_1km" in source.rangeChart)
                newRangeChart["more_100m"] = source.rangeChart.more_1km;
        }
        return super.migrateData(source);
    }
    get modifiers() {
        return this.effect;
    }
}
