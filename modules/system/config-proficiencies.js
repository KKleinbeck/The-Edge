export default class ProficiencyConfig {
  static rollOutcome(proficiency, ql) {
    switch (proficiency) {
        case "throwing":
            if (ql >= 7) return "Object lands at target with further benefits";
            if (ql == 6) return "Object lands exactly at target";
            if (ql >= 0) {
                let dir = [
                    "north", "north east", "east", "south east",
                    "south", "south west", "west", "north west"
                ].random()
                return `Object lands ${18 - 3 * ql}m ${dir} of target`;
            }
            if (ql >= -5) {
                let dir = [
                    "north", "north east", "east", "south east",
                    "south", "south west", "west", "north west"
                ].random()
                return `Object lands ${12 + 2 * ql}m ${dir} of you`;
            }
            if (ql == -6) return "You dropped the object";
            if (ql <= -7) return "Something went very really bad"
            break;
    }
  }
}