export default class NewDiceServer {
    static selectFromCritFailEvents(critFailEvents) {
        const table = [];
        for (const elem of critFailEvents) {
            for (let i = 0; i < elem.frequency; ++i)
                table.push(elem.name);
        }
        return table.random();
    }
    static _selectVantageOutcome(vantage, roll1, roll2) {
        if ((vantage == "Advantage" && roll1.netOutcome > roll2.netOutcome) ||
            (vantage == "Disadvantage" && roll1.netOutcome < roll2.netOutcome)) {
            return roll1;
        }
        return roll2;
    }
    // async interpretCheck(type, roll, details = undefined) {
    //   const interpretationParams = this.interpretationParams[type];
    //   const qualityStep = interpretationParams.qualityStep;
    //   let basicQuality = Math.floor(roll.netOutcome / qualityStep);
    //   let outcome = (roll.netOutcome >= 0) ? "Success" : "Failure"
    //   switch (type) {
    //     case "attributes":
    //       if (interpretationParams.crit.includes(roll.diceResult)) {
    //         outcome = "CritSuccess"
    //         basicQuality = Math.max(basicQuality + 2, 2);
    //         roll.netOutcome += 8;
    //       }
    //       if (interpretationParams.critFail.includes(roll.diceResult)) {
    //         outcome = "CritFailure"
    //         basicQuality = Math.min(basicQuality - 2, -2);
    //         roll.netOutcome -= 8;
    //       }
    //       break;
    //     case "proficiencies":
    //       let nCrits = 0;
    //       let nCritFails = 0;
    //       for (const dice of roll.diceResults) {
    //         if (interpretationParams.crit.includes(dice)) ++nCrits;
    //         if (interpretationParams.critFail.includes(dice)) ++nCritFails;
    //       }
    //       basicQuality += 2 * (nCrits - nCritFails);
    //       roll.netOutcome += 8 * (nCrits - nCritFails);
    //       outcome = (roll.netOutcome >= 0) ? "Success" : "Failure"
    //       if (nCrits >= 2) {
    //         basicQuality = Math.max(basicQuality, 7);
    //         outcome = "CritSuccess";
    //       } else if (nCritFails >= 2) {
    //         basicQuality = Math.min(basicQuality, -7);
    //         outcome = "CritFailure";
    //       }
    //       break;
    //     case "weapons":
    //       let damage = [];
    //       let crits = [];
    //       for (let i = 0; i < details.dices; ++i) {
    //         if (!roll.hits[i]) continue;
    //         damage.push((await NewDiceServer.genericRoll(details.damageDice)))
    //         if (interpretationParams.crit.includes(roll.diceResults[i])) {
    //           damage[damage.length-1] += NewDiceServer.max(details.damageDice);
    //           crits.push(true)
    //         } else crits.push(false)
    //       }
    //       let failEvents = [];
    //       const nFailures = roll.diceResults.filter(x => interpretationParams.critFail.includes(x));
    //       if (nFailures.length >= 0.33335 * roll.diceResults.length) {
    //         const failCheck = (await NewDiceServer.genericRoll("1d20"));
    //         if (failCheck == 20 || failCheck > details.critThreshold) {
    //           failEvents.push(this._selectFromCritFailEvents(interpretationParams.critFailTable));
    //         }
    //       }
    //       return [crits, damage, roll.diceResults, roll.hits, failEvents];
    //   }
    //   const interpretation = {outcome: outcome, quality: basicQuality};
    //   foundry.utils.mergeObject(roll, interpretation);
    //   return roll;
    // }
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
    static async attackCheck(dices, threshold, vantage, damageDice, critThreshold) {
        let roll = await this._attackRoll(dices, threshold);
        if (vantage == "Advantage" || vantage == "Disadvantage") {
            const roll2 = await this._attackRoll(dices, threshold);
            roll = this._selectVantageOutcome(vantage, roll, roll2);
        }
        // return this.interpretCheck("weapons", roll,
        //   {damageDice: damageDice, dices: dices, critThreshold: critThreshold}
        // );
    }
    static async _attackRoll(dices, config) {
        const diceRes = [];
        for (let i = 0; i < dices; ++i)
            diceRes.push(await this.genericRoll("1d20"));
        // let hits = diceRes.map(x =>
        //   x <= threshold && !(this.interpretationParams.weapons.critFail.includes(x))
        // );
        // return {diceResults: diceRes, hits: hits, netOutcome: hits.sum()};
    }
    static async genericRoll(rollDescription) {
        const roll = await new Roll(rollDescription).evaluate();
        return roll._total;
    }
    static max(rollDescription) {
        let rolls = rollDescription.replace(/\s/g, '').split("+");
        let result = 0;
        for (const roll of rolls) {
            if (!isNaN(roll)) {
                result += +roll; // Plain numbers are added
                continue;
            }
            const regex = /^(\d*)?d(\d+)([hl])?(\d*)?$/;
            const match = roll.match(regex);
            if (match) {
                let nDices = 1;
                if (match[4] === undefined && match[1] !== undefined) {
                    nDices = match[1];
                }
                else if (match[4] !== undefined) {
                    nDices = match[4];
                }
                let nSides = match[2];
                result += nSides * nDices;
            }
        }
        return result;
    }
}
