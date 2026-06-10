export const ROCKET_MIN_TARGET = 2;
export const ROCKET_MAX_TARGET = 5;

export type RocketTarget = number;

export type RocketOutcome = {
  crashMultiplier: number;
  target: RocketTarget;
  success: boolean;
  payout: number;
  net: number;
};

export function generateRocketCrashMultiplier(rng: () => number = Math.random): number {
  const clamped = Math.min(Math.max(rng(), 0), 0.999999999);
  const weighted = 1 + (clamped ** 2.2) * 4;
  return Math.round(weighted * 10) / 10;
}

export function evaluateRocketRound(
  bet: number,
  target: RocketTarget,
  crashMultiplier: number,
): RocketOutcome {
  const success = crashMultiplier >= target;
  const payout = success ? bet * target : 0;

  return {
    crashMultiplier,
    target,
    success,
    payout,
    net: payout - bet,
  };
}

export function playRocketRound(
  bet: number,
  target: RocketTarget,
  rng: () => number = Math.random,
): RocketOutcome {
  return evaluateRocketRound(bet, target, generateRocketCrashMultiplier(rng));
}

export function getRocketSuccessProbability(target: RocketTarget): number {
  const threshold = Math.max(0, Math.min(1, (target - 1) / 4));
  return Math.max(0, Math.min(1, 1 - threshold ** (1 / 2.2)));
}

export function normalizeRocketTarget(target: number): RocketTarget {
  const clamped = Math.min(Math.max(target, ROCKET_MIN_TARGET), ROCKET_MAX_TARGET);
  return Math.round(clamped * 10) / 10;
}

export type RocketMode = "target" | "manual";

export type RocketManualOutcome = {
  mode: "manual";
  crashMultiplier: number;
  cashOutMultiplier: number | null;
  success: boolean;
  payout: number;
  net: number;
};

export function getRocketMultiplierAtProgress(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const multiplier = 1 + 4 * clamped ** 2.2;
  return Math.min(Math.max(Math.round(multiplier * 100) / 100, 1), 5);
}

export function getRocketProgressForMultiplier(multiplier: number): number {
  const clamped = Math.min(Math.max(multiplier, 1), 5);
  return ((clamped - 1) / 4) ** (1 / 2.2);
}

export function evaluateRocketCashOut(
  bet: number,
  cashOutMultiplier: number | null,
  crashMultiplier: number,
): RocketManualOutcome {
  const success = cashOutMultiplier !== null && cashOutMultiplier < crashMultiplier;
  const payout = success && cashOutMultiplier !== null ? Math.round(bet * cashOutMultiplier) : 0;

  return {
    mode: "manual",
    crashMultiplier,
    cashOutMultiplier,
    success,
    payout,
    net: payout - bet,
  };
}
