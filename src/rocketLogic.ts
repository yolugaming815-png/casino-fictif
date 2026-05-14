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
