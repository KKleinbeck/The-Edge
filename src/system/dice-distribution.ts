const TERM = String.raw`\d+(?:d\d+(?:(?:kh|kl|dh|dl)\d+)?)?`;
const FULL_PATTERN = new RegExp(String.raw`^\s*${TERM}(?:\s*\+\s*${TERM})*\s*$`, "i");
const TERM_PATTERN = /^(\d+)(?:d(\d+)(?:(kh|kl|dh|dl)(\d+))?)?$/i;

export default class DiceDistribution {
  static validate(input: string): boolean {
    return DiceDistribution._parse(input) !== null;
  }

  static calculateDistribution(input: string, threshold = 200): IRollDistribution {
    const terms = DiceDistribution._parse(input);
    if (terms === null) {
      throw new Error(`Invalid dice formula: "${input}"`);
    }

    const { mean, std } = DiceDistribution._computeMeanAndStd(terms);
    const maxResult = terms.reduce((acc, t) => acc + DiceDistribution._maxOfTerm(t), 0);
    const distribution =
      maxResult > threshold ? [] : DiceDistribution._computeDistribution(terms);

    return { distribution, mean, std };
  }

  static toNormalisedMap(distribution: number[], length: number = 40): Record<number, number> {
    const binSize = Math.ceil(distribution.length / length);

    const result = {};
    for (var i = 0; i <= length; ++i) {
      result[i * binSize] = 0
      for (var j = 0; j < binSize; ++j) {
        if (i * binSize + j < distribution.length) {
          result[i * binSize] += distribution[i * binSize + j];
        }
      }
    }
    return result;
  }

  // MARK: parsing
  private static _parse(input: string): ParsedTerm[] | null {
    if (typeof input !== "string" || !FULL_PATTERN.test(input)) return null;

    const terms: ParsedTerm[] = [];
    for (const raw of input.split("+")) {
      const m = TERM_PATTERN.exec(raw.trim());
      if (!m) return null;

      const first = Number(m[1]);
      if (!Number.isSafeInteger(first)) return null;

      if (m[2] === undefined) {
        terms.push({ kind: "constant", value: first });
        continue;
      }

      const count = first;
      const sides = Number(m[2]);
      if (!Number.isSafeInteger(sides) || sides < 1) return null;

      let lo = 0;
      let hi = count;
      if (m[3] !== undefined) {
        const k = Number(m[4]);
        if (!Number.isSafeInteger(k) || k > count) return null;
        switch (m[3].toLowerCase()) {
          case "kh": lo = count - k; hi = count; break;
          case "kl": lo = 0; hi = k; break;
          case "dh": lo = 0; hi = count - k; break;
          case "dl": lo = k; hi = count; break;
        }
      }
      terms.push({ kind: "dice", count, sides, lo, hi });
    }
    return terms;
  }

  private static _maxOfTerm(t: ParsedTerm): number {
    return t.kind === "constant" ? t.value : (t.hi - t.lo) * t.sides;
  }

  // MARK: mean and std
  private static _computeMeanAndStd(terms: ParsedTerm[]): { mean: number; std: number } {
    let mean = 0;
    let variance = 0;
    for (const t of terms) {
      const s = DiceDistribution._termMeanAndStd(t);
      mean += s.mean;
      variance += s.std * s.std;
    }
    return { mean, std: Math.sqrt(variance) };
  }

  private static _termMeanAndStd(t: ParsedTerm): { mean: number; std: number } {
    if (t.kind === "constant") return { mean: t.value, std: 0 };

    const { count, sides, lo, hi } = t;
    const kept = hi - lo;
    if (kept === 0) return { mean: 0, std: 0 };

    if (kept === count) {
      return {
        mean: (count * (sides + 1)) / 2,
        std: Math.sqrt((count * (sides * sides - 1)) / 12),
      };
    }

    const logFact = DiceDistribution._logFactorials(count);
    let state: (number[] | null)[] = new Array(count + 1).fill(null);
    state[0] = [1, 0, 0];

    for (let v = 1; v <= sides; v++) {
      const p = 1 / (sides - v + 1);
      const next: (number[] | null)[] = new Array(count + 1).fill(null);
      for (let used = 0; used <= count; used++) {
        const cur = state[used];
        if (!cur) continue;
        const m = count - used;
        for (let c = 0; c <= m; c++) {
          const w = DiceDistribution._binomPmf(m, c, p, logFact);
          if (w === 0) continue;
          const a = v * DiceDistribution._keptInRange(used, used + c, lo, hi);
          const target = (next[used + c] ??= [0, 0, 0]);
          target[0] += w * cur[0];
          target[1] += w * (cur[1] + a * cur[0]);
          target[2] += w * (cur[2] + 2 * a * cur[1] + a * a * cur[0]);
        }
      }
      state = next;
    }

    const [m0, m1, m2] = state[count]!;
    const mean = m1 / m0;
    const variance = Math.max(0, m2 / m0 - mean * mean);
    return { mean, std: Math.sqrt(variance) };
  }

  // MARK: distribution
  private static _computeDistribution(terms: ParsedTerm[]): number[] {
    let result: number[] = [1];
    for (const t of terms) {
      result = DiceDistribution._convolve(result, DiceDistribution._termDistribution(t));
    }
    return result;
  }

  private static _termDistribution(t: ParsedTerm): number[] {
    if (t.kind === "constant") {
      const d = new Array(t.value + 1).fill(0);
      d[t.value] = 1;
      return d;
    }

    const { count, sides, lo, hi } = t;
    const kept = hi - lo;
    if (kept === 0) return [1];

    if (kept === count) {
      const die = [0, ...new Array(sides).fill(1 / sides)];
      let result = [1];
      for (let i = 0; i < count; i++) result = DiceDistribution._convolve(result, die);
      return result;
    }

    const maxSum = kept * sides;
    const logFact = DiceDistribution._logFactorials(count);
    let state: (number[] | null)[] = new Array(count + 1).fill(null);
    state[0] = new Array(maxSum + 1).fill(0);
    state[0]![0] = 1;

    for (let v = 1; v <= sides; v++) {
      const p = 1 / (sides - v + 1);
      const next: (number[] | null)[] = new Array(count + 1).fill(null);
      for (let used = 0; used <= count; used++) {
        const cur = state[used];
        if (!cur) continue;
        const m = count - used;
        for (let c = 0; c <= m; c++) {
          const w = DiceDistribution._binomPmf(m, c, p, logFact);
          if (w === 0) continue;
          const shift = v * DiceDistribution._keptInRange(used, used + c, lo, hi);
          const target = (next[used + c] ??= new Array(maxSum + 1).fill(0));
          for (let s = 0; s + shift <= maxSum; s++) {
            if (cur[s] !== 0) target[s + shift] += cur[s] * w;
          }
        }
      }
      state = next;
    }
    return state[count]!;
  }

  // MARK: helpers
  private static _keptInRange(from: number, to: number, lo: number, hi: number): number {
    return Math.max(0, Math.min(to, hi) - Math.max(from, lo));
  }

  private static _convolve(a: number[], b: number[]): number[] {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      if (a[i] === 0) continue;
      for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    }
    return out;
  }

  private static _logFactorials(n: number): number[] {
    const lf = new Array(n + 1).fill(0);
    for (let i = 2; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
    return lf;
  }

  private static _binomPmf(m: number, c: number, p: number, logFact: number[]): number {
    if (p >= 1) return c === m ? 1 : 0;
    const logP =
      logFact[m] - logFact[c] - logFact[m - c] + c * Math.log(p) + (m - c) * Math.log1p(-p);
    return Math.exp(logP);
  }
}