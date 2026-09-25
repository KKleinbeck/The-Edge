import Aux from "../system/auxilliaries.js";
export class TheEdgeItem extends Item {
    static defaultImages = {
        Weapon: "systems/the_edge/icons/rifle.png",
        Armour: "systems/the_edge/icons/helmet.png",
        Ammunition: "systems/the_edge/icons/ammunition.png",
        Advantage: "systems/the_edge/icons/advantage.png",
        Disadvantage: "systems/the_edge/icons/disadvantage.png",
        Skill: "systems/the_edge/icons/skill.png",
        Combatskill: "systems/the_edge/icons/combat_skill.png",
        Medicalskill: "systems/the_edge/icons/medical_skill.png",
        Languageskill: "systems/the_edge/icons/speech.png",
        Gear: "systems/the_edge/icons/gear.png",
        Consumables: "systems/the_edge/icons/consumables.png",
    };
    static defaultIcon(data) {
        if (!data.img || data.img == "") {
            if (data.type in this.defaultImages) {
                data.img = this.defaultImages[data.type];
            }
            else {
                data.img = "systems/the_edge/icons/rifle.png";
            }
        }
    }
    static async create(data, options) {
        this.defaultIcon(data);
        return await super.create(data, options);
    }
    get isTemplate() {
        return !!this.getFlag("the_edge", "isTemplate");
    }
    async useOne() {
        if (this.system.quantity > 1) {
            await this.update({ "system.quantity": this.system.quantity - 1 });
        }
        else
            await this.delete();
    }
    async delete() {
        // Handle special deletion logic before calling parent delete
        if (this.type === "Armour") {
            await this._handleArmourDeletion();
        }
        else if (this.type === "Weapon") {
            if (this.system.ammunitionID && this.actor) {
                this.system.unloadAmmunition();
            }
        }
        return super.delete();
    }
    async _handleArmourDeletion() {
        const actor = this.actor;
        if (!actor)
            return;
        if (this.system.layer === "Inner") {
            // Unequip and clear attachments of all shells attached to this inner armour
            for (const attachmentData of this.system.attachments) {
                const attachment = actor.items.get(attachmentData.shellId);
                if (attachment) {
                    await attachment.system.toggleEquipped();
                }
            }
        }
        else if (this.system.equipped === true && this.system.attachments.length > 0) {
            // Detach this outer armour from its inner armour
            const innerArmour = actor.items.get(this.system.attachments[0].armourId);
            if (innerArmour) {
                await innerArmour.system.detachShell(this);
            }
        }
    }
    effectHooks(field, details) {
        for (const modifier of this.system.modifiers) {
            if (modifier.field === field) {
                Aux.evalOnEventWith(modifier.value, details, this.id);
            }
        }
    }
}
