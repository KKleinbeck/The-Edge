export default class ProficiencyConfig {
  static rollOutcome(proficiency, ql) {
    const outcome = {};
    switch (proficiency) {
      case "throwing":
        if (ql >= 7) {
          outcome.distance = 0;
          outcome.dir = 0;
          outcome.description = "Object lands at target with further benefits";
        } else if (ql == 6) {
          outcome.distance = 0;
          outcome.dir = 0;
          outcome.description = "Object lands exactly at target";
        } else if (ql >= 1) {
          outcome.distance = 9 - 1.5*ql;
          outcome.dir = [0, 1, 2, 3, 4, 5, 6, 7].random();

          const dir = [
            "north", "north east", "east", "south east",
            "south", "south west", "west", "north west"
          ][outcome.dir];
          outcome.description = `Object lands ${outcome.distance}m ${dir} of target`;
        } else if (ql >= -5) {
          outcome.distance = 7 + ql;
          outcome.dir = [0, 1].random();

          const dir = ["behind", "infront"][outcome.dir];
          outcome.description = `Object lands ${outcome.distance}m ${dir} of you`;
        } else if (ql == -6) {
          outcome.distance = 0;
          outcome.dir = 0;
          outcome.description = "You dropped the object";
        } else if (ql <= -7) {
          outcome.distance = 0;
          outcome.dir = 0;
          outcome.description = "Something went very really bad";
        }
        break;
    }
    return outcome;
  }
}