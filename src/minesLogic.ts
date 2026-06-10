export const MINES_GRID_SIZE = 25;
export const MINES_COLUMNS = 5;
export const MINES_OPTIONS = [3, 5, 10] as const;

export type MinesCount = (typeof MINES_OPTIONS)[number];

export const MINES_HOUSE_EDGE = 0.97;

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateMinePositions(mines: MinesCount, rng: () => number = Math.random): number[] {
  const cells = Array.from({ length: MINES_GRID_SIZE }, (_, index) => index);

  for (let i = 0; i < mines; i += 1) {
    const j = i + Math.floor(rng() * (MINES_GRID_SIZE - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return cells.slice(0, mines);
}

export function getMinesMultiplier(mines: MinesCount, safeReveals: number): number {
  if (safeReveals <= 0) {
    return 1;
  }

  if (safeReveals > MINES_GRID_SIZE - mines) {
    throw new Error("Nombre de cases sures Mines invalide.");
  }

  let multiplier = MINES_HOUSE_EDGE;

  for (let i = 0; i < safeReveals; i += 1) {
    multiplier *= (MINES_GRID_SIZE - i) / (MINES_GRID_SIZE - mines - i);
  }

  return roundToTwoDecimals(multiplier);
}

export function getMinesMultiplierTable(mines: MinesCount): number[] {
  return Array.from({ length: MINES_GRID_SIZE - mines }, (_, index) => getMinesMultiplier(mines, index + 1));
}

export function evaluateMinesCashOut(
  bet: number,
  mines: MinesCount,
  safeReveals: number,
): { multiplier: number; payout: number; net: number } {
  const multiplier = getMinesMultiplier(mines, safeReveals);
  const payout = roundToTwoDecimals(bet * multiplier);

  return {
    multiplier,
    payout,
    net: roundToTwoDecimals(payout - bet),
  };
}

export function isMine(positions: readonly number[], cell: number): boolean {
  return positions.includes(cell);
}
