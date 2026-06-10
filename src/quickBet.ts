export const QUICK_BET_CHIPS = [10, 25, 50, 100, 250] as const;

export function clampBet(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  const floored = Math.floor(value);
  return Math.max(min, Math.min(floored, max));
}

export function halveBet(value: number, min: number, max: number): number {
  return clampBet(value / 2, min, max);
}

export function doubleBet(value: number, min: number, max: number): number {
  return clampBet(value * 2, min, max);
}
