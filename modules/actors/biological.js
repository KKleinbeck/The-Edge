import THE_EDGE from "../system/config-the-edge.js";
import { TheEdgeBaseActor } from "./actor.js";

export class TheEdgeBiologicalActor extends TheEdgeBaseActor {
  prepareSheet() {
    const preparedData = super.prepareSheet();

    const sys = this.system;
    foundry.utils.mergeObject(preparedData, {
      attrs: THE_EDGE.attrs,
      canAdvance: true,
      zones: {
        1: {value: this.hrZone1(), tooltip: "75% Max Heart Rate".replace(/[ ]/g, "\u00a0")},
        2: {value: this.hrZone2(), tooltip: "90% Max Heart Rate".replace(/[ ]/g, "\u00a0")}
      },
      speeds: {
        Stride: { 
          value: this.getStrideSpeed(),
          tooltip: "Min(5 + Spd/6, 75% foc)".replace(/[ ]/g, "\u00a0")
         },
        Run: { 
          value: this.getRunSpeed(),
          tooltip: "Min(7 + Spd/3, 125% Foc)".replace(/[ ]/g, "\u00a0")
         },
        Sprint: { 
          value: this.getSprintSpeed(),
          tooltip: "Min(8 + Spd/1.5, 175% Foc)".replace(/[ ]/g, "\u00a0")
         }
      },
      herotoken: Array(sys.heroToken.max).fill(false).fill(true, 0, sys.heroToken.available)
    });
    return preparedData;
  }

  async updateHr(newHr) {
    const zone = this.getHRZone();
    await this.update({"system.heartRate.value": newHr});
    const newZone = this.getHRZone();
    if (newZone != zone) {this.updateStrain()}
  }

  getHRZone(hr = undefined) {
    hr = hr ? hr : this.system.heartRate.value;
    if (hr < this.hrZone1()) return 1;
    if (hr < this.hrZone2()) return 2;
    return 3;
  }

  hrZone1() {return 5 * Math.floor(this.system.heartRate.max.value * 75 / 500)}
  hrZone2() {return 5 * Math.floor(this.system.heartRate.max.value * 90 / 500)}
}