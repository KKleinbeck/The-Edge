import Aux from "../system/auxilliaries.js";
import NewChatServer from "../system/new_chat_server.js";
import CheckDialog from "./meta-check-dialog.js";
import DiceServer from "../system/dice_server.js";
import LocalisationServer from "../system/localisation_server.js";
import THE_EDGE from "../system/config-the-edge.js";

const { renderTemplate } = foundry.applications.handlebars;

export default class DialogCombatics extends CheckDialog {
  declare checkData: IAttackRollQuery
  declare vantage: TVantage

  constructor (checkData: IAttackRollQuery, options: foundryAny) {
    super(options);
    this.checkData = checkData;
  }

  static async start(checkData: IAttackRollQuery) {
    const template = "systems/the_edge/templates/dialogs/basic-rolls.hbs";
    const handToHandLevel: number = checkData.actor.system.weapons.general["Hand-to-Hand combat"].value;
    const strainMaxUseReduction = checkData.actor.system.strain.maxUseReduction.status;
    const html = await renderTemplate(template, {
      chance: Aux.asChance(Aux.attackSuccessChance(
        checkData.threshold, checkData.actor.system.attackDiceParameters
      ), true, 0),
      maxStrain: THE_EDGE.combatConfig.handToHandMaxStrain(handToHandLevel, strainMaxUseReduction),
      strainHintType: "Combatics strain"
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

    const dieResult: number = await Aux.promptInput(
      LocalisationServer.localise("Cheat attack roll", "dialog")
    );
    const diceParameters: IAttackDiceParameters = this.checkData.actor.system.attackDiceParameters;
    const crit: boolean = diceParameters.critDice.includes(dieResult);
    const hit: boolean = crit || (
      dieResult <= this.checkData.threshold && !diceParameters.critFailDice.includes(dieResult)
    );
    var damage: number[] = hit ? [await DiceServer.genericRoll(this.checkData.damageRoll)] : [];
    if (crit) damage[0] += DiceServer.max(this.checkData.damageRoll);

    var attackRollResult: IAttackRollResult = {
      damage: damage, failEvent: "", rolls: [{crit, dieResult, hit}],
    };

    this._transmitRoll(threshold, attackRollResult);
  }

  async attackCallback(): Promise<void> {
    const promptResult: IRollPromptResult = this.promptResult;
    const threshold: number = this.checkData.threshold + promptResult.modifier + promptResult.strain;
    
    const prompt: IAttackRollPrompt = {
      threshold, nRolls: 1, vantage: this.vantage, damageRoll: this.checkData.damageRoll
    }
    const attackRollResult: IAttackRollResult = await this.checkData.actor.system.rollAttackCheck(prompt);
    this.checkData.actor.system.applyStrain(promptResult.strain);

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
    const details: IDetailsWeaponCheck = {
      ...this.checkData,
      ...attackRollResult,
      ...this.promptResult,
      damageType: "HandToHand",
      isMelee: true,
      threshold: threshold,
    };
    NewChatServer.transmitEvent(
      "WEAPON CHECK", details, config
    );
  }

  // Helpers for rendering
  onValueChanged(_id: string, _value: number): void { this._onChanceChanged(); }
  onVantageChanged(): void { this._onChanceChanged(); }

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