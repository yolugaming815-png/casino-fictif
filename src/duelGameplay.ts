import { spin } from "./gameLogic";
import type { SpinOutcome } from "./gameLogic";
import { playPlinko } from "./plinkoLogic";
import type { PlinkoOutcome, PlinkoRows } from "./plinkoLogic";
import { evaluateRocketRound, generateRocketCrashMultiplier } from "./rocketLogic";
import { deriveRng } from "./seededRng";

export type DuelGameKey = "slots" | "plinko" | "rocket";

export type DuelRoundIndex = 0 | 1 | 2;

export const DUEL_ROUND_BET = 100;

const DUEL_PLINKO_ROWS: PlinkoRows = 10;

export function duelGameKey(roomGame: string): DuelGameKey {
  const normalized = roomGame.toLowerCase();

  if (normalized.includes("plinko")) {
    return "plinko";
  }

  if (normalized.includes("rocket") || normalized.includes("fusee") || normalized.includes("fusée")) {
    return "rocket";
  }

  return "slots";
}

export function duelRoundRng(duelSeed: number, roundIndex: DuelRoundIndex): () => number {
  return deriveRng(duelSeed, roundIndex);
}

export function playSeededSlotsDuelRound(
  seed: number,
  round: DuelRoundIndex,
): { outcome: SpinOutcome; score: number } {
  const outcome = spin(DUEL_ROUND_BET, duelRoundRng(seed, round));
  return { outcome, score: outcome.payout };
}

export function playSeededPlinkoDuelRound(
  seed: number,
  round: DuelRoundIndex,
): { outcome: PlinkoOutcome; score: number } {
  const outcome = playPlinko(DUEL_ROUND_BET, DUEL_PLINKO_ROWS, duelRoundRng(seed, round));
  return { outcome, score: Math.round(outcome.multiplier * DUEL_ROUND_BET) };
}

export function seededRocketCrashMultiplier(seed: number, round: DuelRoundIndex): number {
  return generateRocketCrashMultiplier(duelRoundRng(seed, round));
}

export function scoreRocketDuelRound(crash: number, playerTarget: number): number {
  return evaluateRocketRound(DUEL_ROUND_BET, playerTarget, crash).payout;
}
