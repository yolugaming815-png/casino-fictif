export const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, number) => number);
export const ROULETTE_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33,
  1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;
export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteBetKind =
  | "straight"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high"
  | "dozen1"
  | "dozen2"
  | "dozen3";

export type RouletteBet = {
  kind: RouletteBetKind;
  number?: number;
};

export type RouletteOutcome = {
  number: number;
  color: "green" | "red" | "black";
  multiplier: number;
  payout: number;
  net: number;
  isWin: boolean;
  label: string;
};

export function spinRouletteNumber(rng: () => number = Math.random): number {
  const value = Math.min(Math.max(rng(), 0), 0.999999999);
  return Math.floor(value * 37);
}

export function getRouletteColor(number: number): RouletteOutcome["color"] {
  if (number === 0) {
    return "green";
  }

  return RED_NUMBERS.has(number) ? "red" : "black";
}

export function evaluateRouletteBet(bet: RouletteBet, amount: number, number: number): RouletteOutcome {
  const multiplier = getRouletteMultiplier(bet, number);
  const payout = amount * multiplier;

  return {
    number,
    color: getRouletteColor(number),
    multiplier,
    payout,
    net: payout - amount,
    isWin: multiplier > 0,
    label: getRouletteLabel(bet),
  };
}

export function playRoulette(bet: RouletteBet, amount: number, rng: () => number = Math.random): RouletteOutcome {
  return evaluateRouletteBet(bet, amount, spinRouletteNumber(rng));
}

export function updateRouletteBalance(balance: number, amount: number, outcome: RouletteOutcome): number {
  return balance - amount + outcome.payout;
}

export type PlacedRouletteBet = RouletteBet & {
  amount: number;
};

export type RouletteBetResult = {
  bet: PlacedRouletteBet;
  multiplier: number;
  payout: number;
  net: number;
  isWin: boolean;
  label: string;
};

export type RouletteRoundOutcome = {
  number: number;
  color: "green" | "red" | "black";
  totalStake: number;
  totalPayout: number;
  net: number;
  results: RouletteBetResult[];
};

export const ROULETTE_RECENT_LIMIT = 12;

export function evaluateRouletteBets(bets: PlacedRouletteBet[], number: number): RouletteRoundOutcome {
  const results = bets.map((bet) => {
    const outcome = evaluateRouletteBet(bet, bet.amount, number);

    return {
      bet,
      multiplier: outcome.multiplier,
      payout: outcome.payout,
      net: outcome.net,
      isWin: outcome.isWin,
      label: outcome.label,
    };
  });

  const totalStake = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPayout = results.reduce((sum, result) => sum + result.payout, 0);

  return {
    number,
    color: getRouletteColor(number),
    totalStake,
    totalPayout,
    net: totalPayout - totalStake,
    results,
  };
}

export function playRouletteRound(bets: PlacedRouletteBet[], rng: () => number = Math.random): RouletteRoundOutcome {
  return evaluateRouletteBets(bets, spinRouletteNumber(rng));
}

export function getRouletteHotNumbers(recent: readonly number[]): { number: number; count: number }[] {
  const counts = new Map<number, number>();

  for (const number of recent) {
    counts.set(number, (counts.get(number) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((first, second) => second[1] - first[1] || first[0] - second[0])
    .slice(0, 3)
    .map(([number, count]) => ({ number, count }));
}

export function getRouletteColdNumbers(recent: readonly number[]): number[] {
  const seen = new Set(recent);

  return ROULETTE_NUMBERS.filter((number) => !seen.has(number)).slice(0, 3);
}

export function getRouletteColorStats(recent: readonly number[]): {
  red: number;
  black: number;
  green: number;
  even: number;
  odd: number;
} {
  const stats = { red: 0, black: 0, green: 0, even: 0, odd: 0 };

  for (const number of recent) {
    stats[getRouletteColor(number)] += 1;

    if (number !== 0) {
      if (number % 2 === 0) {
        stats.even += 1;
      } else {
        stats.odd += 1;
      }
    }
  }

  return stats;
}

function getRouletteMultiplier(bet: RouletteBet, number: number): number {
  if (bet.kind === "straight") {
    return bet.number === number ? 36 : 0;
  }

  if (number === 0) {
    return 0;
  }

  if (bet.kind === "red") {
    return getRouletteColor(number) === "red" ? 2 : 0;
  }

  if (bet.kind === "black") {
    return getRouletteColor(number) === "black" ? 2 : 0;
  }

  if (bet.kind === "even") {
    return number % 2 === 0 ? 2 : 0;
  }

  if (bet.kind === "odd") {
    return number % 2 === 1 ? 2 : 0;
  }

  if (bet.kind === "low") {
    return number >= 1 && number <= 18 ? 2 : 0;
  }

  if (bet.kind === "high") {
    return number >= 19 && number <= 36 ? 2 : 0;
  }

  if (bet.kind === "dozen1") {
    return number >= 1 && number <= 12 ? 3 : 0;
  }

  if (bet.kind === "dozen2") {
    return number >= 13 && number <= 24 ? 3 : 0;
  }

  return number >= 25 && number <= 36 ? 3 : 0;
}

function getRouletteLabel(bet: RouletteBet): string {
  const labels: Record<RouletteBetKind, string> = {
    straight: `Numero ${bet.number ?? 0}`,
    red: "Rouge",
    black: "Noir",
    even: "Pair",
    odd: "Impair",
    low: "1-18",
    high: "19-36",
    dozen1: "1re douzaine",
    dozen2: "2e douzaine",
    dozen3: "3e douzaine",
  };

  return labels[bet.kind];
}
