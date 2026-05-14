export const PLINKO_ROWS = [8, 10, 12] as const;

export type PlinkoRows = (typeof PLINKO_ROWS)[number];
export type PlinkoStep = "L" | "R";

export type PlinkoOutcome = {
  path: PlinkoStep[];
  slot: number;
  multiplier: number;
  payout: number;
  net: number;
};

export type PlinkoProbability = {
  slot: number;
  multiplier: number;
  combinations: number;
  probability: number;
};

const PLINKO_MULTIPLIERS: Record<PlinkoRows, readonly number[]> = {
  8: [10, 5, 0.5, 0.2, 0.2, 0.2, 0.5, 5, 10],
  10: [10, 5, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 5, 10],
  12: [10, 5, 0.5, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2, 0.5, 0.5, 5, 10],
};

export function generatePlinkoPath(rows: PlinkoRows, rng: () => number = Math.random): PlinkoStep[] {
  return Array.from({ length: rows }, () => (rng() < 0.5 ? "L" : "R"));
}

export function getFinalSlot(path: readonly PlinkoStep[]): number {
  return path.filter((step) => step === "R").length;
}

export function getPlinkoMultiplier(slot: number, rows: PlinkoRows): number {
  if (slot < 0 || slot > rows) {
    throw new Error("Case Plinko invalide.");
  }

  return PLINKO_MULTIPLIERS[rows][slot];
}

export function calculatePlinkoPayout(bet: number, multiplier: number): { payout: number; net: number } {
  const payout = bet * multiplier;
  return {
    payout,
    net: payout - bet,
  };
}

export function playPlinko(bet: number, rows: PlinkoRows, rng: () => number = Math.random): PlinkoOutcome {
  const path = generatePlinkoPath(rows, rng);
  const slot = getFinalSlot(path);
  const multiplier = getPlinkoMultiplier(slot, rows);
  const payout = calculatePlinkoPayout(bet, multiplier);

  return {
    path,
    slot,
    multiplier,
    ...payout,
  };
}

export function updatePlinkoBalance(balance: number, bet: number, multiplier: number): number {
  return balance + calculatePlinkoPayout(bet, multiplier).net;
}

export function getPlinkoProbabilities(rows: PlinkoRows): PlinkoProbability[] {
  const totalPaths = 2 ** rows;

  return Array.from({ length: rows + 1 }, (_, slot) => {
    const combinations = binomial(rows, slot);

    return {
      slot,
      multiplier: getPlinkoMultiplier(slot, rows),
      combinations,
      probability: combinations / totalPaths,
    };
  });
}

function binomial(n: number, k: number): number {
  let result = 1;

  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - index + 1)) / index;
  }

  return result;
}
