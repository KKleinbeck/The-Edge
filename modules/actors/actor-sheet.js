import Aux from "../system/auxilliaries.js";
import DialogMedicine from "../dialogs/dialog-medicine.js";
import DialogItemDeletion from "../dialogs/dialog-item-deletion.js";
import DialogArmourAttachment from "../dialogs/dialog-attachOuterArmour.js";
import LocalisationServer from "../system/localisation_server.js";
import ChatServer from "../system/chat_server.js";

const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets;

export class TheEdgeActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    position: {
      width: 740,
      height: 800,
    },
    form: {
      submitOnChange: true,
    },
    window: {title: ""},
    classes: ["the_edge", "actor"],
    actions: {
      itemControl: TheEdgeActorSheet._onItemControl
    },
  }

  get title () { return this.actor.name; } // Override in tandom with option.window.title

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = context.document.system;
    context.prepare = this.actor.prepareSheet()
    return context;
  }

  static async _onItemControl(event, target) {
    event.preventDefault();
    console.log("Lorem")

    // Obtain event data
    const itemElement = target.closest(".item");
    const item = this.actor.items.get(itemElement?.dataset.itemId);

    // Handle different actions
    switch ( target.dataset.subaction ) {
      case "create":
        const itemType = target.dataset.type;
        const cls = getDocumentClass("Item");
        return cls.create({name: LocalisationServer.localise("New", "item"), type: itemType}, {parent: this.actor});
      case "create-effect":
        const clsEffect = getDocumentClass("Item");
        return clsEffect.create({name: LocalisationServer.localise("New effect", "item"), type: "Effect"}, {parent: this.actor});
      case "edit":
        return item?.sheet.render(true);
      case "post":
        ChatServer.transmitEvent("Post Item",
          {name: item.name, description: item.system.description}
        );
        break;
      case "increase":
        this.actor.addOrCreateVantage(item);
        break;
      case "decrease":
        this.actor.decrementVantage(item);
        break;
      case "delete":
        if (item.type.includes("vantage")) this.actor.deleteVantage(item);
        else if (item.type == "Wounds") this.actor.deleteWound(item);
        else DialogItemDeletion.start({item: item, actor: this.actor});
        break;
      case "toggle-active":
        item.toggleActive();
        break;
      case "toggle-equip":
        if (item.type == "Armour") {
          if (item.system.structurePoints <= 0) {
            let msg = LocalisationServer.parsedLocalisation("EquipBroken", "Notifications")
            ui.notifications.notify(msg)
            return undefined;
          }
          
          if (item.system.layer == "Outer") {
            if (item.system.equipped) {
              const parent = this.actor.items.get(item.system.attachments[0].armourId);
              await Aux.detachFromParent(parent, item._id, item.system.attachmentPoints.max);
              await item.update({"system.attachments": []})
              await item.toggleEquipped();
              break;
            } else {
              const attachableArmour = this._findAttachableArmour(item);
              if (attachableArmour.length == 0) {
                let msg = LocalisationServer.localise("No attachable armour", "Notifications")
                ui.notifications.notify(msg)
                break;
              }
              DialogArmourAttachment.start(
                {actor: this.actor, tokenId: this.token?.id, shellId: item.id, attachable: attachableArmour}
              )
              break;
            }
          }
        }
        await item.toggleEquipped();
        await this.actor.updateStatus();
        this.render();
        break;
      case "consume":
        switch (item.system.subtype) {
          case "medicine":
            const wounds = this.actor.itemTypes["Wounds"];
            DialogMedicine.start({medicineItem: item, wounds: wounds, actor: this.actor});
            break;

          case "grenade":
            ChatServer.transmitEvent("grenade sheet based", {
              actorId: this.actor?.id, tokenId: this.token?.id, grenade: item, details: item.system.subtypes.grenade
            })
            item.useOne();
            break;
          
          default:
            const effectNames = this.actor.itemTypes["Effect"].map(x => x.name)
            if (effectNames.includes(item.name)) {
              // TODO Notification server
              const msg = LocalisationServer.localise("Effect already exists", "Notifications")
              ui.notifications.notify(msg)
            } else {
              const hasEffects = item.system.effects.length > 0;
              if (hasEffects) {
                const clsEffect = getDocumentClass("Item");
                const newEffect = await clsEffect.create(
                  {name: item.name, type: "Effect"}, 
                  {parent: this.actor, "system.effects": item.system.effects}
                );
                newEffect.update({
                  "system.effects": item.system.effects, "system.description": item.system.description,
                  "system.gm_description": item.system.gm_description
                })
                this.render();
              }
              ChatServer.transmitEvent("General Consume", {
                details: {actorName: this.actor.name, item: item.name}, hasEffects: hasEffects
              })
              item.useOne();
            }
        }
        break;
    }
  }

  _findAttachableArmour(outerShell) {
    const bodyTarget = outerShell.system.bodyPart;
    const size = outerShell.system.attachmentPoints.max;
    return this.actor.itemTypes["Armour"].filter(armour => {
      if (armour.system.layer == "Outer") return false;
      if (armour.system.attachmentPoints.max - armour.system.attachmentPoints.used < size) return false;

      else if (armour.system.bodyPart.includes(bodyTarget)) return true;
      else if (armour.system.bodyPart == "Entire") return true;
      else if (armour.system.bodyPart == "Below_Neck" && bodyTarget != "Head") return true;
      return false
    })
  }
}

