interface IThrowingOutcome {
  distance: number;
  dir: number;
  description: string;
}

interface IRollDistribution {
  distribution: number[];
  mean: number;
  std: number;
}

type ParsedTerm =
  | { kind: "constant"; value: number }
  | { kind: "dice"; count: number; sides: number; lo: number; hi: number };

interface IRollOutcome extends IThrowingOutcome {}
