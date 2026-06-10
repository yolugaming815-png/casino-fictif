import { spin } from "./gameLogic";
import type { SpinOutcome } from "./gameLogic";
import { playPlinko } from "./plinkoLogic";
import type { PlinkoOutcome, PlinkoRows } from "./plinkoLogic";
import { evaluateRocketRound, generateRocketCrashMultiplier } from "./rocketLogic";
import { deriveRng, hashSeed, mulberry32 } from "./seededRng";

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

/**
 * RNG d'une manche de duel, PERSONNEL a chaque joueur : le uid entre dans le hash,
 * donc chaque joueur a ses propres tirages (meme generateur mulberry32, donc meme
 * distribution — equitable) tout en restant deterministe et verifiable par l'autre
 * client a partir de (duelSeed, roundIndex, uid).
 *
 * Sans le uid, les jeux sans decision joueur (slots, plinko) produisaient des scores
 * strictement identiques pour les deux joueurs : egalite systematique.
 */
export function duelRoundRng(duelSeed: number, roundIndex: DuelRoundIndex, uid: string): () => number {
  return mulberry32(hashSeed(duelSeed, roundIndex, uid));
}

export function playSeededSlotsDuelRound(
  seed: number,
  round: DuelRoundIndex,
  uid: string,
): { outcome: SpinOutcome; score: number } {
  const outcome = spin(DUEL_ROUND_BET, duelRoundRng(seed, round, uid));
  return { outcome, score: outcome.payout };
}

export function playSeededPlinkoDuelRound(
  seed: number,
  round: DuelRoundIndex,
  uid: string,
): { outcome: PlinkoOutcome; score: number } {
  const outcome = playPlinko(DUEL_ROUND_BET, DUEL_PLINKO_ROWS, duelRoundRng(seed, round, uid));
  return { outcome, score: Math.round(outcome.multiplier * DUEL_ROUND_BET) };
}

/**
 * Crash rocket d'une manche : PARTAGE entre les deux joueurs (pas de uid dans le
 * hash, volontairement). C'est le choix de cible cash-out de chaque joueur qui
 * departage — le crash commun est la condition d'equite du mode rocket.
 */
export function seededRocketCrashMultiplier(seed: number, round: DuelRoundIndex): number {
  return generateRocketCrashMultiplier(deriveRng(seed, round));
}

export function scoreRocketDuelRound(crash: number, playerTarget: number): number {
  return evaluateRocketRound(DUEL_ROUND_BET, playerTarget, crash).payout;
}
