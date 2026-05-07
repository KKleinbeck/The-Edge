import THE_EDGE from "./config-the-edge.js";
export default class DiceServer {
    static selectFromCritFailEvents(critFailEvents) {
        const table = [];
        for (const elem of critFailEvents) {
            for (let i = 0; i < elem.frequency; ++i)
                table.push(elem.name);
        }
        return table.random();
    }
    static async attributeCheck(config) {
        var dieResult = await this._attributeRoll();
        if (config.vantage == "Advantage") {
            const dieResults2 = await this._attributeRoll();
            if (dieResults2 < dieResult)
                dieResult = dieResults2;
        }
        else if (config.vantage == "Disadvantage") {
            const dieResults2 = await this._attributeRoll();
            if (dieResults2 > dieResult)
                dieResult = dieResults2;
        }
        return this.attributeOutcome(dieResult, config);
    }
    static async _attributeRoll() {
        return await this.genericRoll("1d20");
    }
    static attributeOutcome(dieResult, config) {
        const preResult = {
            effectiveThreshold: config.threshold + config.modifier
        };
        if (config.critDice.includes(dieResult)) {
            preResult.effectiveThreshold += config.critBonus;
            preResult.outcome = "CritSuccess";
        }
        else if (config.critFailDice.includes(dieResult)) {
            preResult.effectiveThreshold += config.critFailMalus;
            preResult.outcome = "CritFailure";
            preResult.critFailEvent = this.selectFromCritFailEvents(config.critFailEvents);
        }
        const netOutcome = preResult.effectiveThreshold - dieResult;
        return {
            outcome: netOutcome >= 0 ? "Success" : "Failure",
            quality: Math.floor(netOutcome / config.qualityStep),
            rolls: [dieResult],
            effectiveThreshold: preResult.effectiveThreshold,
            ...preResult
        };
    }
    static async proficiencyCheck(config) {
        var diceResults = await this._proficiencyRoll();
        if (config.vantage == "Advantage") {
            const diceResults2 = await this._proficiencyRoll();
            if (diceResults2.sum() < diceResults.sum())
                diceResults = diceResults2;
        }
        else if (config.vantage == "Disadvantage") {
            const diceResults2 = await this._proficiencyRoll();
            if (diceResults2.sum() > diceResults.sum())
                diceResults = diceResults2;
        }
        return this.proficiencyOutcome(diceResults, config);
    }
    static async _proficiencyRoll() {
        const diceRes = await new Roll("4d20").evaluate();
        const diceResults = diceRes.dice[0].results.map((x) => x.result);
        return diceResults;
    }
    static proficiencyOutcome(diceResults, config) {
        let nCrits = 0, nCritFails = 0;
        for (const dieResult of diceResults) {
            if (config.critDice.includes(dieResult))
                nCrits += 1;
            if (config.critFailDice.includes(dieResult))
                nCritFails += 1;
        }
        const preResult = {
            effectiveThreshold: config.threshold + config.modifier +
                (nCrits * config.critDieBonus) + (nCritFails * config.critFailDieMalus)
        };
        if (nCrits - nCritFails >= 2) {
            preResult.effectiveThreshold += config.critBonus;
            preResult.outcome = "CritSuccess";
        }
        else if (nCritFails - nCrits >= 2) {
            preResult.effectiveThreshold += config.critFailMalus;
            preResult.critFailEvent = this.selectFromCritFailEvents(config.critFailEvents);
            preResult.outcome = "CritFailure";
        }
        const netOutcome = preResult.effectiveThreshold - diceResults.sum();
        return {
            outcome: netOutcome >= 0 ? "Success" : "Failure",
            quality: Math.floor(netOutcome / config.qualityStep),
            rolls: diceResults,
            total: diceResults.sum(),
            effectiveThreshold: preResult.effectiveThreshold,
            ...preResult
        };
    }
    static async attackCheck(config) {
        let [roll, netOutcome] = await this._attackRoll(config);
        if (config.vantage == "Advantage") {
            const [roll2, netOutcome2] = await this._attackRoll(config);
            if (netOutcome2 > netOutcome)
                roll = roll2;
        }
        else if (config.vantage == "Disadvantage") {
            const [roll2, netOutcome2] = await this._attackRoll(config);
            if (netOutcome2 < netOutcome)
                roll = roll2;
        }
        return DiceServer.attackOutcome(roll, config);
    }
    static async _attackRoll(config) {
        const rolls = [];
        let netOutcome = 0;
        for (let i = 0; i < config.nRolls; ++i) {
            const diceResult = await this.genericRoll("1d20");
            const crit = config.critDice.includes(diceResult);
            const hit = diceResult <= config.threshold && !(config.critFailDice.includes(diceResult));
            rolls.push({ crit, diceResult, hit });
            netOutcome += +hit + 2 * (+crit);
        }
        return [rolls, netOutcome];
    }
    static async attackOutcome(rolls, config) {
        let damage = [];
        for (let i = 0; i < config.nRolls; ++i) {
            if (!rolls[i].hit)
                continue;
            damage.push((await DiceServer.genericRoll(config.damageRoll)));
            if (rolls[i].crit) {
                damage[damage.length - 1] += DiceServer.max(config.damageRoll);
            }
        }
        let failEvent = "";
        const nCritFailures = rolls.map(x => x.diceResult).filter(x => config.critFailDice.includes(x));
        if (nCritFailures.length >= 0.33335 * config.nRolls) {
            const failCheck = (await DiceServer.genericRoll("1d20"));
            if (config.critFailDice.includes(failCheck) || failCheck > config.critFailCheckThreshold) {
                failEvent = this.selectFromCritFailEvents(THE_EDGE.combatConfig.critFailTable);
            }
        }
        return { damage, failEvent, rolls };
    }
    static async genericRoll(rollDescription) {
        const roll = await new Roll(rollDescription).evaluate();
        return roll._total;
    }
    static max(rollDescription) {
        const rolls = rollDescription.replace(/\s/g, '').split("+");
        let result = 0;
        for (const roll of rolls) {
            if (!isNaN(+roll)) {
                result += +roll; // Plain numbers are added
                continue;
            }
            const regex = /^(\d*)?d(\d+)([hl])?(\d*)?$/;
            const match = roll.match(regex);
            if (match) {
                let nDices = 1;
                if (match[4] === undefined && match[1] !== undefined) {
                    nDices = +match[1];
                }
                else if (match[4] !== undefined) {
                    nDices = +match[4];
                }
                let nSides = +match[2];
                result += nSides * nDices;
            }
        }
        return result;
    }
}
