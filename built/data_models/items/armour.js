import Aux from "../../system/auxilliaries.js";
import DialogArmourAttachment from "../../dialogs/dialog-attachOuterArmour.js";
import LocalisationServer from "../../system/localisation_server.js";
import NotificationServer from "../../system/notifications.js";
import THE_EDGE from "../../system/config-the-edge.js";
import { generateDataModelWithComponents } from "../abstracts.js";
import DescriptionData from "./components/description.js";
import EmbeddedSkillsData from "./components/embedded-skills.js";
import EquipableData from "./components/equipable.js";
import NonstackableData from "./components/nonstackable.js";
const { ArrayField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;
export default class ArmourData extends generateDataModelWithComponents(DescriptionData, EmbeddedSkillsData, EquipableData, NonstackableData) {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.bodyPart = new StringField({ initial: "Torso" });
        schema.layer = new StringField({ initial: "Inner" });
        schema.structurePoints = new NumberField({ initial: 10, integer: true });
        schema.structurePointsOriginal = new NumberField({
            initial: 10,
            integer: true,
        });
        schema.attachmentPoints = new SchemaField({
            max: new NumberField({ initial: 0, integer: true }),
            used: new NumberField({ initial: 0, integer: true }),
        });
        schema.attachments = new ArrayField(new ObjectField(), { initial: [] });
        schema.protection = new SchemaField({
            energy: new SchemaField({
                absorption: new NumberField({ initial: 0, integer: true }),
                threshold: new NumberField({ initial: 0, integer: true }),
            }),
            kinetic: new SchemaField({
                absorption: new NumberField({ initial: 0, integer: true }),
                threshold: new NumberField({ initial: 0, integer: true }),
            }),
            elemental: new SchemaField({
                absorption: new NumberField({ initial: 0, integer: true }),
                threshold: new NumberField({ initial: 0, integer: true }),
            }),
        });
        return schema;
    }
    async toggleEquipped() {
        if (this.structurePoints <= 0 &&
            this.structurePointsOriginal > 0) {
            NotificationServer.notify({ id: "EquipBroken" });
            return undefined;
        }
        const newValue = (this.layer == "Outer" ?
            await this._toggleEquippedOuter() :
            !this.equipped);
        await this.parent.update({ "system.equipped": newValue });
        if (newValue) {
            Hooks.call("onModifierEvent", "onEquip", {
                actor: this.parent.actor,
                itemId: this.parent.id
            });
        }
        return newValue;
    }
    async _toggleEquippedOuter() {
        if (this.equipped) {
            const parent = this.parent.actor.items.get(this.attachments[0].armourId);
            const innerArmour = this.parent.actor.items.get(this.attachments[0].armourId);
            await this.parent.update({ "system.attachments": [] }, { render: false });
            await innerArmour.system.detachShell(this.parent);
            return false;
        }
        else {
            const attachableArmour = this._findAttachableArmour();
            if (attachableArmour.length == 0) {
                NotificationServer.notify({ id: "No attachable armour" });
                return undefined;
            }
            const dialogResult = await DialogArmourAttachment.start({
                actor: this.parent.actor,
                tokenId: this.parent.actor.token?.id,
                shellId: this.parent.id,
                attachable: attachableArmour,
            });
            if (dialogResult?.selectedArmourId) {
                const targetArmour = this.parent.actor.items.get(dialogResult.selectedArmourId);
                const canAttach = targetArmour.system._attachOuterArmour(this.parent);
                if (!canAttach)
                    return undefined;
                // Store outer armour information into the shells attachment list
                await this.parent.update({
                    "system.attachments": [{
                            actorId: this.parent.actor.id,
                            tokenId: this.parent.actor.token?.id,
                            armourId: dialogResult.selectedArmourId
                        }],
                }, { render: false });
                return true;
            }
        }
        return undefined;
    }
    _findAttachableArmour() {
        const bodyTarget = this.bodyPart;
        const size = this.attachmentPoints.max;
        return this.parent.actor.itemTypes["Armour"].filter((armour) => {
            if (armour.system.layer == "Outer")
                return false;
            if (armour.system.attachmentPoints.max -
                armour.system.attachmentPoints.used <
                size)
                return false;
            else if (armour.system.bodyPart.includes(bodyTarget))
                return true;
            else if (armour.system.bodyPart == "Entire")
                return true;
            else if (armour.system.bodyPart == "Below_Neck" && bodyTarget != "Head")
                return true;
            return false;
        });
    }
    _attachOuterArmour(shell) {
        const armour = this.parent;
        const availableAttachment = armour.system.attachmentPoints.max - armour.system.attachmentPoints.used;
        if (shell.system.attachmentPoints.max > availableAttachment) {
            NotificationServer.notify({ id: "Missing Attachment points", details: {
                    available: availableAttachment,
                    needed: shell.system.attachmentPoints.max,
                } });
            return false;
        }
        const attachments = armour.system.attachments;
        attachments.push({
            actorId: this.parent.actor?.id,
            tokenId: this.parent.actor?.token?.id,
            shellId: shell.id,
            shell: shell,
        });
        armour.update({
            "system.attachments": attachments,
            "system.attachmentPoints.used": armour.system.attachmentPoints.used + shell.system.attachmentPoints.max,
        });
        return true;
    }
    async detachShell(shell) {
        const newAttachments = this.attachments.filter((x) => x.shellId != shell.id);
        await this.parent.update({
            "system.attachments": newAttachments,
            "system.attachmentPoints.used": this.attachmentPoints.used - shell.system.attachmentPoints.max,
        });
    }
    async protect(damage, penetration, damageType, location, protectionLog) {
        const protectedLoc = this.bodyPart;
        const isProtective = THE_EDGE.cover_map[protectedLoc].includes(location);
        if (!isProtective)
            return [damage, penetration];
        // Process inner armour first
        if (this.layer == "Inner") {
            for (const attachment of this.attachments) {
                const actor = Aux.getActor(attachment.actorId, attachment.tokenId);
                const shell = actor.items.get(attachment.shellId);
                if (shell.system.structurePointsOriginal == 0)
                    continue;
                [damage, penetration] = await shell.system.protect(damage, penetration, damageType, location, protectionLog);
            }
        }
        if (damageType == "HandToHand" ||
            damageType == "fall" ||
            damageType == "impact") {
            damageType = "kinetic";
        }
        const protection = this.protection[damageType];
        protectionLog[this.parent.name] = Math.min(damage, protection.absorption);
        damage = Math.max(0, damage - protection.absorption);
        const update = {};
        if (damage <= protection.threshold) {
            update["system.structurePoints"] = Math.max(0, this.structurePoints - damage);
            protectionLog[this.parent.name] += damage;
            damage = Math.max(0, Math.min(penetration, protection.threshold));
        }
        else {
            // TODO: It could be that structurePoints < Threshold => propagate damage
            update["system.structurePoints"] = Math.max(0, this.structurePoints - protection.threshold);
            protectionLog[this.parent.name] += protection.threshold;
            damage -= Math.max(protection.threshold - penetration, 0);
        }
        penetration = Math.max(penetration - protection.threshold, 0);
        if (update["system.structurePoints"] == 0) {
            this._handleArmourBreaking();
        }
        await this.parent.update(update);
        if (this.parent.sheet.rendered) {
            this.parent.sheet.render(true);
        }
        return [damage, penetration];
    }
    async _handleArmourBreaking() {
        NotificationServer.notify({ id: "Destroyed", details: { name: this.parent.name } });
        await this.parent.update({ name: this.parent.name + " - " + LocalisationServer.localise("broken") });
        await this.toggleEquipped();
        Hooks.call("onModifierEvent", "onDestroyed", {
            actor: this.parent.actor,
            itemId: this.parent.id
        });
    }
}
