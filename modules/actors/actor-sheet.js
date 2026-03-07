import Aux from "../system/auxilliaries.js";
import ChatServer from "../system/chat_server.js";
import DialogMedicine from "../dialogs/dialog-medicine.js";
import DialogItemDeletion from "../dialogs/dialog-item-deletion.js";
import DialogArmourAttachment from "../dialogs/dialog-attachOuterArmour.js";
import EffectModifierMixin from "../mixins/effect-modifier-mixin.js";
import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";

const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets;

export class TheEdgeActorSheet extends EffectModifierMixin(HandlebarsApplicationMixin(ActorSheetV2)) {
  constructor(...args) {
    super(...args);
    this.effectIsExpanded = {
      statusEffects: Array(this.actor.system.statusEffects.lastRects).fill(false),
      effects: Array(this.actor.system.effects.length).fill(false),
    };
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    position: {
      width: 740,
      height: 800,
    },
    form: {
      submitOnChange: true,
    },
    classes: ["the_edge", "actor"],
    actions: {
      itemControl: TheEdgeActorSheet._onItemControl,
      effectControl: TheEdgeActorSheet._onEffectControl,
      skillControl: TheEdgeActorSheet._onSkillControl,
      counterControl: TheEdgeActorSheet.onCounterControl,
    },
  }

  get title () { return this.actor.name; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.userIsGM = game.user.isGM;
    context.actor = this.actor;
    context.system = context.document.system;
    for (const key of Object.keys(context.system.attributes)) {
      let n = context.system.attributes[key].advances;
      context.system.attributes[key].cost = THE_EDGE.attrCost(n),
      context.system.attributes[key].refund = n == 0 ? 0 : THE_EDGE.attrCost(n-1)
    }

    context.profGroups = []
    context.profGroups.push({
      physical: Object.keys(context.system.proficiencies["physical"]),
      social: Object.keys(context.system.proficiencies["social"]),
      technical: Object.keys(context.system.proficiencies["technical"]),
    })
    context.profGroups.push({
      environmental: Object.keys(context.system.proficiencies["environmental"]),
      knowledge: Object.keys(context.system.proficiencies["knowledge"]),
      mental: Object.keys(context.system.proficiencies["mental"]),
    })

    context.definedEffects = THE_EDGE.definedEffects;
    Object.entries(this.actor.itemTypes).forEach(([type, entries]) => {
      context[type] = entries;
    })
    context.effectIsExpanded = this.effectIsExpanded;
    return context;
  }
  
  // Actions
  static async _onItemControl(event, target) {
    event.preventDefault();

    // Obtain event data
    const itemElement = target.closest(".item");
    const item = this.actor.items.get(itemElement?.dataset.itemId);

    // Handle different actions
    switch ( target.dataset.subaction ) {
      case "create":
        const itemType = target.dataset.type;
        const cls = getDocumentClass("Item");
        return cls.create({name: LocalisationServer.localise("New", "item"), type: itemType}, {parent: this.actor});
      case "edit":
        return item?.sheet.render(true);
      case "post":
        ChatServer.transmitEvent("Post Item", {item: item});
        break;
      case "increase":
        this.actor.addOrCreateVantage(item);
        break;
      case "decrease":
        this.actor.decrementVantage(item);
        break;
      case "delete":
        if (item.type.includes("vantage")) this.actor.deleteVantage(item);
        else if (item.type == "Wounds") this.actor.system.deleteWound(item);
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
        await this.actor.update({});
        break;
      case "consume":
        switch (item.system.current_type) {
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
                // TODO new Effect interface
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

  static async _onEffectControl(event, target) {
    event.preventDefault();

    // Obtain event data
    const effectElement = target.closest(".effect-hook");
    const index = effectElement?.dataset.index || ""; 
    const source = effectElement?.dataset.source || ""; 

    // Handle different actions
    switch ( target.dataset.subaction ) {
      case "create":
        this.actor.system.createNewEffect();
        this.effectIsExpanded[target.dataset.source].push(false);
        break
      case "delete":
        // TODO: proper movement animations
        this.actor.system.deleteEffect(index);
        this.effectIsExpanded[source].splice(index, 1);
        break
      case "edit":
        if (["itemEffects", "skillEffects"].includes(effectElement.dataset.source)) {
          const id = effectElement?.dataset.id || ""; 
          const item = this.actor.items.get(id);
          return item?.sheet.render(true);
        }
        break
      case "toggleShowContent":
        this.effectIsExpanded[source][index] = !this.effectIsExpanded[source][index];
        const container = effectElement.parentElement;
        const content = effectElement.querySelector(".content");
        if (!effectElement.classList.contains('expanded')) {
          this.expandItem(effectElement, content, container);
        } else {
          this.collapseItem(effectElement, content, container);
        }
        break
      case "toggle-active":
        if (effectElement.dataset.source == "effects") {
          this.actor.system.toggleEffect(index);
        }
        break
    }
  }

  getModifiers(target) {
    const effectIndex = target.closest(".effect-hook").dataset.index;
    const modifiers = this.actor.system.effects[effectIndex].modifiers;
    return {modifiers: modifiers, context: {effectIndex: effectIndex}};
  }

  async updateModifiers(modifiers, context) {
    const effects = this.actor.system.effects;
    effects[context.effectIndex].modifiers = modifiers;
    this.actor.update({"system.effects": effects});
  };
  
  // TODO: Refactor into an animator class
  expandItem(item, content, container) {
    const DURATION = 300;
    // First: do FLIP measurement
    const items = [...container.children];
    const firstRects = items.map(el => el.getBoundingClientRect());

    item.classList.add('expanded');

    requestAnimationFrame(() => {
      const lastRects = items.map(el => el.getBoundingClientRect());

      items.forEach((el, i) => {
        const dx = firstRects[i].left - lastRects[i].left;
        const dy = firstRects[i].top - lastRects[i].top;

        el.animate([
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: `translate(0,0)` }
        ], {
          duration: DURATION,
          easing: 'ease'
        });
      });

      // AFTER layout animation finishes → expand content
      setTimeout(() => {
        this.revealContent(content);
        item.querySelector(".chevron-hook").classList.add("rotate180");
      }, DURATION);
    });
  }

  collapseItem(item, content, container) {
    const DURATION = 300;
    item.querySelector(".chevron-hook").classList.remove("rotate180");
    this.hideContent(content);

    setTimeout(() => {
      const items = [...container.children];
      const firstRects = items.map(el => el.getBoundingClientRect());

      item.classList.remove('expanded');

      requestAnimationFrame(() => {
        const lastRects = items.map(el => el.getBoundingClientRect());

        items.forEach((el, i) => {
          const dx = firstRects[i].left - lastRects[i].left;
          const dy = firstRects[i].top - lastRects[i].top;

          el.animate([
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: `translate(0,0)` }
          ], {
            duration: DURATION,
            easing: 'ease'
          });
        });
      });

    }, DURATION);
  }

  revealContent(content) {
    content.style.height = "0px";
    content.style.opacity = "0";

    const fullHeight = content.scrollHeight;

    requestAnimationFrame(() => {
      content.style.height = fullHeight + "px";
      content.style.opacity = "1";
    });

    content.addEventListener('transitionend', () => {
      content.style.height = "auto";
    }, { once: true });
  }

  hideContent(content) {
    content.style.height = content.scrollHeight + "px";

    requestAnimationFrame(() => {
      content.style.height = "0px";
      content.style.opacity = "0";
    });
  }
  
  static async _onSkillControl(event, target) {
    event.preventDefault();

    // Obtain event data
    const skillElement = target.closest(".skill");
    const skillID = skillElement?.dataset.itemId;
    const skill = this.actor.items.get(skillID);

    // Handle different actions
    switch ( target.dataset.subaction ) {
      case "increase":
        return this.actor.skillLevelIncrease(skillID);
      case "decrease":
        return this.actor.skillLevelDecrease(skillID);
      case "delete":
        return this.actor.deleteSkill(skillID);
      case "toggle-active":
        skill.toggleActive();
        break;
      case "post":
        ChatServer.transmitEvent("Post Skill",
          {name: skill.name, type: skill.type, description: skill.system.description}
        );
        break;
      case "roll":
        const hrChange = Aux.parseHrCostStr(
          skill.system.hrCost, skill.name,
          this.actor.system.heartRate.value,
          this.actor.system.heartRate.max.value,
          this.actor.getHRZone()
        )
        if (hrChange) {
          if (game.combat && this.actor._id == game.combat.combatant.actorId) {
            game.the_edge.combatLog.addAction(skill.name, hrChange);
          } else {
            const hrThen = this.actor.system.heartRate.value;
            await this.actor.applyStrains([hrChange]);
            const hrNow = this.actor.system.heartRate.value;
            ChatServer.transmitEvent("Combat Action",
              {actor: this.actor.name, skill: skill.name, hrThen: hrThen, hrNow: hrNow}
            );
          }
        }
        
        if (skill.type == "Medicalskill") {
          DialogProficiency.start({
            proficiency: skill.system.basis, actor: this.actor, actorId: this.actor.id
          })
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

  static onCounterControl(event, target) {
    event.preventDefault();

    // Obtain event data
    const counterElement = target.closest(".counter");
    const index = +counterElement?.dataset.index;

    // Handle different actions
    const counters = this.actor.system.counters || [];
    switch ( target.dataset.subaction ) {
      case "create-counter":
        counters.push({
          name: LocalisationServer.localise("New Counter", "item"),
          value: 1, max: 1
        })
        break;
      
      case "delete":
        counters.splice(index, 1);
        break;

      case "increase-counter":
        counters[index].max += 1;
        break;

      case "decrease-counter":
        if (counters[index].max == 1) return;
        counters[index].max -= 1;
        counters[index].value = Math.min(
          counters[index].value, counters[index].max
        );
        break;
      
      case "deplete-counter":
        counters[index].value = 0;
        break;
      
      case "use":
        const level = 1 + +target.dataset.level;
        counters[index].value = (counters[index].value < level) ? level : level - 1;
        break;
    }
    this.actor.update({"system.counters": counters});
  }

  // Specific listeners
  _onRender(context, options) {
    super._onRender(context, options)

    const counterNames = this.element.querySelectorAll(".counter-name");
    for (const counter of counterNames) {
      counter.addEventListener("change", (ev) => this._onCounterChange(ev, "name"))
    }

    if (ui.hotbar.token?.actor?.id == this.actor.id) {
      ui.hotbar.render(true);
    }
    
    const progressBarInputs = this.element.querySelectorAll(".counter-input");
    for (const input of progressBarInputs) {
      input.addEventListener("change", (ev) => {
        this._onCounterChange(ev, ev.target.dataset.subtype)
      })
    }

    const effectNames = this.element.querySelectorAll(".effect-name-hook");
    for (const effectName of effectNames) {
      effectName.addEventListener("change", (ev) => {
        const effectElement = ev.target.closest(".effect-hook");
        const update = {};
        update[`system.effects.${effectElement.dataset.id}.name`] = ev.target.value;
        this.actor.update(update, {render: false});
      })
    }

    const quantityItems = this.element.querySelectorAll(".quantity-input");
    for (const input of quantityItems) {
      input.addEventListener("change", (ev) => {
        this._onItemQuantiyChange(ev);
      })
    }

    this.element.querySelectorAll(".dynamic-size").forEach(input => {
      this._adjustInputWidth(input);
      input.addEventListener('input', () => this._adjustInputWidth(input));
    })
  }

  _adjustInputWidth(input) {
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    span.style.position = 'absolute';
    span.style.font = getComputedStyle(input).font;
    span.textContent = input.value || input.placeholder || '';
    document.body.appendChild(span);
    const width = span.offsetWidth + 20;
    document.body.removeChild(span);
    input.style.width = `${width}px`;
  }

  async _onCounterChange(event, changeId) {
    const target = event.target;
    const counterElement = target.closest(".counter");
    const index = +counterElement?.dataset.index;

    const counters = this.actor.system.counters || [];
    switch (changeId) {
      case "value":
        counters[index].value = Math.min(+target.value, +target.dataset.max);
        break;
      
      case "max":
        counters[index].max = +target.value;
        counters[index].value = Math.min(counters[index].value, +target.value);
        break;
      
      case "name":
        counters[index].name = target.value;
        break;
    }
    this.actor.update({"system.counters": counters});
  }

  async _onItemQuantiyChange(ev) {
    const target = ev.target;
    const itemDetails = target.closest(".item");
    const newQuantity = target.valueAsNumber;
    // Todo: Prevent negative quantities (do nothing)
    // Todo: Quantity == 0: Deletion dialog
    if (newQuantity && newQuantity > 0) {
      const item = this.actor.items.get(itemDetails.dataset.itemId);
      item.update({"system.quantity": newQuantity});
    }
  }

  // Item dropping
  async _onDropItem(event, data) {
    const item = (await Item.implementation.fromDropData(data)).toObject();
    switch (item.type) {
      case "Weapon":
      case "Armour":
      case "Effect":
        return super._onDropItem(event, data)

      case "Ammunition":
      case "Gear":
      case "Consumables":
        return this._onDropStackableItem(event, data, item)
      
      case "Advantage":
      case "Disadvantage":
        this.actor.addOrCreateVantage(item);
        break;
      
      case "Skill":
      case "Combatskill":
      case "Medicalskill":
      case "Languageskill":
        const createNew = this.actor.learnSkill(item);
        return createNew ? super._onDropItem(event, data) : undefined;
      
      case "Credits":
        if (item.system.isChid) {
          this.actor.update({"system.credits.chids": this.actor.system.credits.chids + item.system.value})
        } else this.actor.update({"system.credits.digital": this.actor.system.credits.digital + item.system.value})
        return false;
    }
  }

  _onDropStackableItem(event, data, item) {
    const existingCopy = this._itemExists(item);
    if (existingCopy) {
      existingCopy.update({"system.quantity": existingCopy.system.quantity + 1});
      return existingCopy;
    }
    return super._onDropItem(event, data)
  }

  _itemExists(item) {
    return this.actor.findItem(item);
  }
}

