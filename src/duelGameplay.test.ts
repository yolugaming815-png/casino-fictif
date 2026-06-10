import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { getMultiplier } from "./gameLogic.ts";
import { getPlinkoMultipliers } from "./plinkoLogic.ts";

// duelGameplay.ts importe ses voisins sans extension (style Vite/Bundler) : on ajoute
// l'extension .ts a la volee pour que node --test resolve ces specifiers.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (typeof specifier === "string" && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  DUEL_ROUND_BET,
  duelGameKey,
  duelRoundRng,
  playSeededPlinkoDuelRound,
  playSeededSlotsDuelRound,
  scoreRocketDuelRound,
  seededRocketCrashMultiplier,
} = await import("./duelGameplay.ts");

test("duelGameKey mappe les noms de rooms existants", () => {
  assert.equal(duelGameKey("Duel Plinko"), "plinko");
  assert.equal(duelGameKey("Duel Plinko avec Alice"), "plinko");
  assert.equal(duelGameKey("Duel Rocket Games"), "rocket");
  assert.equal(duelGameKey("Duel Fusée"), "rocket");
  assert.equal(duelGameKey("Duel Roulette"), "slots");
  assert.equal(duelGameKey("Duel Roulette avec Bob"), "slots");
  assert.equal(duelGameKey("Duel"), "slots");
});

test("duelRoundRng est identique pour les deux joueurs et change par manche", () => {
  const seed = 987654321;
  const playerOne = Array.from({ length: 10 }, duelRoundRng(seed, 1));
  const playerTwo = Array.from({ length: 10 }, duelRoundRng(seed, 1));
  const otherRound = Array.from({ length: 10 }, duelRoundRng(seed, 2));

  assert.deepEqual(playerOne, playerTwo);
  assert.notDeepEqual(playerOne, otherRound);
  assert.ok(playerOne.every((value) => value >= 0 && value < 1));
});

test("playSeededSlotsDuelRound est deterministe et score = payout sur mise 100", () => {
  const first = playSeededSlotsDuelRound(42, 0);
  const second = playSeededSlotsDuelRound(42, 0);

  assert.deepEqual(first, second);
  assert.equal(first.score, first.outcome.payout);
  assert.equal(first.outcome.payout, DUEL_ROUND_BET * getMultiplier(first.outcome.reels));

  const otherRound = playSeededSlotsDuelRound(42, 1);
  const otherSeed = playSeededSlotsDuelRound(43, 0);
  assert.ok(
    JSON.stringify(otherRound.outcome.reels) !== JSON.stringify(first.outcome.reels) ||
      JSON.stringify(otherSeed.outcome.reels) !== JSON.stringify(first.outcome.reels),
  );
});

test("playSeededPlinkoDuelRound est deterministe et score = round(multiplier * 100)", () => {
  const first = playSeededPlinkoDuelRound(2024, 2);
  const second = playSeededPlinkoDuelRound(2024, 2);

  assert.deepEqual(first, second);
  assert.equal(first.score, Math.round(first.outcome.multiplier * DUEL_ROUND_BET));
  assert.equal(first.outcome.path.length, 10);
  assert.ok(first.outcome.slot >= 0 && first.outcome.slot <= 10);

  const multipliers = getPlinkoMultipliers(10);
  assert.equal(first.outcome.multiplier, multipliers[first.outcome.slot]);
});

test("seededRocketCrashMultiplier est deterministe et borne entre 1 et 5", () => {
  for (const seed of [1, 7, 123456, 2147483646]) {
    for (const round of [0, 1, 2] as const) {
      const crash = seededRocketCrashMultiplier(seed, round);
      assert.equal(crash, seededRocketCrashMultiplier(seed, round));
      assert.ok(crash >= 1 && crash <= 5, `crash hors plage : ${crash}`);
      assert.equal(crash, Math.round(crash * 10) / 10);
    }
  }
});

test("scoreRocketDuelRound paie 100 x target si le crash tient, sinon 0", () => {
  assert.equal(scoreRocketDuelRound(3.4, 2.5), 250);
  assert.equal(scoreRocketDuelRound(2.5, 2.5), 250);
  assert.equal(scoreRocketDuelRound(2.4, 2.5), 0);
  assert.equal(scoreRocketDuelRound(1, 5), 0);
  assert.equal(scoreRocketDuelRound(5, 5), DUEL_ROUND_BET * 5);
});

test("les deux joueurs d'un duel rocket partagent le meme crash par manche", () => {
  const seed = 555;
  const rounds = [0, 1, 2] as const;
  const crashesPlayerOne = rounds.map((round) => seededRocketCrashMultiplier(seed, round));
  const crashesPlayerTwo = rounds.map((round) => seededRocketCrashMultiplier(seed, round));

  assert.deepEqual(crashesPlayerOne, crashesPlayerTwo);
});
