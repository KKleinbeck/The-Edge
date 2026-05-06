import Aux from "../system/auxilliaries.js";
import NewChatServer from "../system/new_chat_server.js";
import DiceServer from "../system/dice_server.js";
import LocalisationServer from "../system/localisation_server.js";
import SliderMixin from "../mixins/slider-mixin.js";
import THE_EDGE from "../system/config-the-edge.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

export default class DialogCombatics extends SliderMixin(DialogV2){
  declare checkData: IAttackRollQuery
  declare vantage: VantageType

  constructor (checkData: IAttackRollQuery, options: foundryAny) {
    super(options);
    this.checkData = checkData;
    this.vantage = "Nothing";
  }

  _onRender(context: any, options: any): void {
    super._onRender(context, options);
    this.element.querySelector(".vantage-hook")!.addEventListener("change", (event: Event) => {
      if(!(event.target instanceof HTMLSelectElement)) return;
      this.vantage = event.target.value as VantageType;
      this._onChanceChanged();
    });
  }

  static async start(checkData: IAttackRollQuery) {
    const template = "systems/the_edge/templates/dialogs/combatics.hbs";
    const handToHandLevel: number = checkData.actor.system.getWeaponLevel("Hand-to-Hand combat");
    const strainMaxUseReduction = checkData.actor.system.strain.maxUseReduction.status;
    const html = await renderTemplate(template, {
      chance: Aux.asChance(Aux.attackSuccessChance(
        checkData.threshold, checkData.actor.system.attackDiceParameters
      ), true, 0),
      maxStrain: THE_EDGE.combatConfig.handToHandMaxStrain(handToHandLevel, strainMaxUseReduction)
    });
    const content = document.createElement("div");
    content.innerHTML = html;

    const buttons = [
      {
        action: "roll",
        icon: "fa-solid fa-hand-fist",
        label: LocalisationServer.localise("Attack", "Dialog"),
      },
    ]
    if (game.user.isGM) {
      buttons.push({
        action: "cheat",
        icon: "",
        label: LocalisationServer.localise("Cheat", "Dialog"),
      })
    }

    return new DialogCombatics(checkData, {
      window: { title: checkData.name + " " + game.i18n.localize("CHECK") },
      content: content,
      buttons: buttons,
      position: {width: 300},
      submit: (result: any, dialog: DialogCombatics) => {
        if (result === "cheat") {
          dialog.cheatCallback();
          return;
        }

        dialog.attackCallback();
      }
    }).render({ force: true });
  }

  async cheatCallback(): Promise<void> {
    const sliderValues = this.getSliderValues();
    const threshold: number = this.checkData.threshold + (Object.values(sliderValues).sum() as number);

    const roll: number = await Aux.promptInput(
      LocalisationServer.localise("Cheat attack roll", "dialog")
    );
    const diceParameters: IAttackDiceParameters = this.checkData.actor.system.attackDiceParameters;
    const isCrit: boolean = diceParameters.critDice.includes(roll);
    const isHit: boolean = isCrit || (
      roll <= this.checkData.threshold && !diceParameters.critFailDice.includes(roll)
    );
    var damage: number[] = isHit ? [await DiceServer.genericRoll(this.checkData.damageRoll)] : [];
    if (isCrit) damage[0] += await DiceServer.max(this.checkData.damageRoll);

    var attackRollResult: IAttackRollResult = {
      crits: [isCrit], damage: damage ,diceResults: [roll], failEvent: "", hits: [isHit],
    };

    this._transmitRoll(threshold, attackRollResult);
  }

  async attackCallback(): Promise<void> {
    const sliderValues = this.getSliderValues();
    const threshold: number = this.checkData.threshold + (Object.values(sliderValues).sum() as number);
    
    const prompt: IAttackRollPrompt = {
      threshold, nRolls: 1, vantage: this.vantage, damageRoll: this.checkData.damageRoll
    }
    const attackRollResult: IAttackRollResult = await this.checkData.actor.system.rollAttackCheck(prompt);
    // TODO apply strain

    this._transmitRoll(threshold, attackRollResult);
  }

  _transmitRoll(threshold: number, attackRollResult: IAttackRollResult) {
    const config: IChatServerConfig = {
      speaker: {
        actor: this.checkData.actor.id,
        scene: this.checkData.sceneId,
        token: this.checkData.token.id
      }
    }
    console.log(
      {...this.checkData, ...attackRollResult, threshold: threshold}
    )
    const details = {
      ...this.checkData,
      ...attackRollResult,
      threshold: threshold,
      vantage: this.vantage,
      weaponType: "Melee"
    };
    NewChatServer.transmitEvent(
      "WEAPON CHECK", details, config
    );
  }

  // Helpers for rendering
  onValueChanged(_id: string, _value: number): void { this._onChanceChanged(); }

  _onChanceChanged() {
    const sliderValues = this.getSliderValues();
    const threshold: number = this.checkData.threshold + (Object.values(sliderValues).sum() as number);

    const chanceElement = this.element.querySelector(".chance-hook");
    if (!chanceElement) return;

    var chance = Aux.attackSuccessChance(threshold, this.checkData.actor.system.attackDiceParameters);
    if (this.vantage == "Advantage") chance = 1 - (1 - chance)**2;
    else if (this.vantage == "Disadvantage") chance = chance**2;
    chanceElement.innerHTML = Aux.asChance(chance, true, 0) as string;
  }
}