export default class MovementCalculator {
  static determineBestPattern(
    actions: number,
    distance: number,
    speeds: number[],
    costs: number[],
  ): IMovementOption {
    const initialPattern = MovementCalculator.getFirstGuessForPattern(
      actions,
      distance,
      speeds,
      costs,
    );

    const [strainCost, pattern] = MovementCalculator._getBestPatternRecursive(
      distance,
      initialPattern,
      speeds,
      costs,
    );
    return { actions, pattern, strainCost };
  }

  static getFirstGuessForPattern(
    actions: number,
    distance: number,
    speeds: number[],
    costs: number[],
  ): number[] {
    const distanceMissingFromStride = distance - speeds[0] * actions;

    if (distanceMissingFromStride < 0) return new Array(actions).fill(0);

    const dcDd1 = (speeds[1] - speeds[0]) / costs[1];
    const dcDd2 = (speeds[2] - speeds[0]) / costs[2];
    const betterSpeedIndex = dcDd1 <= dcDd2 ? 1 : 2;

    const nFasterSteps = Math.min(
      actions,
      Math.floor(
        distanceMissingFromStride / (speeds[betterSpeedIndex] - speeds[0]),
      ),
    );

    const initialPattern = [
      ...new Array(nFasterSteps).fill(betterSpeedIndex),
      ...new Array(actions - nFasterSteps).fill(0),
    ];
    return initialPattern;
  }

  static _getBestPatternRecursive(
    distance: number,
    currentPattern: number[],
    speeds: number[],
    costs: number[],
  ): [number, number[]] {
    if (
      MovementCalculator._calculateTotalFromPattern(currentPattern, speeds) >=
      distance
    ) {
      return [
        MovementCalculator._calculateTotalFromPattern(currentPattern, costs),
        currentPattern,
      ];
    }

    let bestCost = Infinity;
    let bestPattern = [...currentPattern];

    for (const [fromIdx, toIdx] of [
      [0, 1],
      [1, 2],
    ] as const) {
      if (currentPattern.includes(fromIdx)) {
        const newPattern = [...currentPattern];
        newPattern[currentPattern.indexOf(fromIdx)] = toIdx;
        const [cost, resolvedPattern] =
          MovementCalculator._getBestPatternRecursive(
            distance,
            newPattern,
            speeds,
            costs,
          );

        if (cost < bestCost) {
          bestCost = cost;
          bestPattern = resolvedPattern;
        }
      }
    }

    return [bestCost, bestPattern];
  }

  static _calculateTotalFromPattern(
    pattern: number[],
    values: number[],
  ): number {
    return pattern.reduce((sum, digit) => sum + values[digit], 0);
  }
}
