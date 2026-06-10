/** @deprecated Utiliser PLINKO_ROW_OPTIONS (V2). */
export const PLINKO_ROWS = [10] as const;

export const PLINKO_ROW_OPTIONS = [8, 12, 16] as const;
export const PLINKO_AUTO_DROP_OPTIONS = [10, 25, 50] as const;

export type PlinkoRowsV2 = (typeof PLINKO_ROW_OPTIONS)[number];
export type PlinkoRows = 8 | 10 | 12 | 16;
export type PlinkoRisk = "low" | "medium" | "high";
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

/** @deprecated L'API V2 n'a plus de paramètre layout (tables identiques desktop/mobile). */
export type PlinkoLayout = "desktop" | "mobile";

const PLINKO_MULTIPLIERS: Record<10, readonly number[]> = {
  10: [10, 5, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 5, 10],
};

const MOBILE_PLINKO_MULTIPLIERS: Record<10, readonly number[]> = {
  10: [0.2, 0.2, 0.5, 1, 2, 10, 2, 1, 0.5, 0.2, 0.2],
};

function mirrorTable(half: readonly number[]): readonly number[] {
  return [...half, ...half.slice(0, -1).reverse()];
}

export const PLINKO_MULTIPLIER_TABLES: Record<PlinkoRisk, Record<PlinkoRowsV2, readonly number[]>> = {
  low: {
    8: mirrorTable([5.6, 2.1, 1.1, 1, 0.5]),
    12: mirrorTable([10, 3, 1.6, 1.4, 1.1, 1, 0.5]),
    16: mirrorTable([16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5]),
  },
  medium: {
    8: mirrorTable([13, 3, 1.3, 0.7, 0.4]),
    12: mirrorTable([33, 11, 4, 2, 1.1, 0.6, 0.3]),
    16: mirrorTable([70, 22, 9, 4.5, 2.4, 1.5, 1, 0.6, 0.35]),
  },
  high: {
    8: mirrorTable([29, 4, 1.5, 0.3, 0.2]),
    12: mirrorTable([170, 24, 8.1, 2, 0.7, 0.2, 0.2]),
    16: mirrorTable([110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3]),
  },
};

export function generatePlinkoPath(rows: PlinkoRows, rng: () => number = Math.random): PlinkoStep[] {
  return Array.from({ length: rows }, () => (rng() < 0.5 ? "L" : "R"));
}

export function getFinalSlot(path: readonly PlinkoStep[]): number {
  return path.filter((step) => step === "R").length;
}

/** @deprecated Utiliser getPlinkoMultiplierV2 (risque + rangées, sans layout). */
export function getPlinkoMultiplier(slot: number, rows: PlinkoRows, layout: PlinkoLayout = "desktop"): number {
  if (slot < 0 || slot > rows) {
    throw new Error("Case Plinko invalide.");
  }

  return getPlinkoMultipliers(rows, layout)[slot];
}

/** @deprecated Utiliser getPlinkoMultipliersV2 (risque + rangées, sans layout). */
export function getPlinkoMultipliers(rows: PlinkoRows, layout: PlinkoLayout = "desktop"): readonly number[] {
  if (rows !== 10) {
    throw new Error("Rangées Plinko legacy invalides.");
  }

  return layout === "mobile" ? MOBILE_PLINKO_MULTIPLIERS[rows] : PLINKO_MULTIPLIERS[rows];
}

export function getPlinkoMultipliersV2(rows: PlinkoRowsV2, risk: PlinkoRisk): readonly number[] {
  return PLINKO_MULTIPLIER_TABLES[risk][rows];
}

export function getPlinkoMultiplierV2(slot: number, rows: PlinkoRowsV2, risk: PlinkoRisk): number {
  if (slot < 0 || slot > rows) {
    throw new Error("Case Plinko invalide.");
  }

  return getPlinkoMultipliersV2(rows, risk)[slot];
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

export function getPlinkoProbabilitiesV2(rows: PlinkoRowsV2, risk: PlinkoRisk): PlinkoProbability[] {
  const totalPaths = 2 ** rows;

  return Array.from({ length: rows + 1 }, (_, slot) => {
    const combinations = binomial(rows, slot);

    return {
      slot,
      multiplier: getPlinkoMultiplierV2(slot, rows, risk),
      combinations,
      probability: combinations / totalPaths,
    };
  });
}

/** @deprecated Utiliser getPlinkoProbabilitiesV2 (risque + rangées, sans layout). */
export function getPlinkoProbabilities(rows: PlinkoRows, layout: PlinkoLayout = "desktop"): PlinkoProbability[] {
  const totalPaths = 2 ** rows;

  return Array.from({ length: rows + 1 }, (_, slot) => {
    const combinations = binomial(rows, slot);

    return {
      slot,
      multiplier: getPlinkoMultiplier(slot, rows, layout),
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
