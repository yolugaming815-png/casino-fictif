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

const UID_A = "uid-alice";
const UID_B = "uid-bob";

test("duelGameKey mappe les noms de rooms existants", () => {
  assert.equal(duelGameKey("Duel Plinko"), "plinko");
  assert.equal(duelGameKey("Duel Plinko avec Alice"), "plinko");
  assert.equal(duelGameKey("Duel Rocket Games"), "rocket");
  assert.equal(duelGameKey("Duel Fusée"), "rocket");
  assert.equal(duelGameKey("Duel Roulette"), "slots");
  assert.equal(duelGameKey("Duel Roulette avec Bob"), "slots");
  assert.equal(duelGameKey("Duel"), "slots");
});

test("duelRoundRng est deterministe par (seed, manche, uid)", () => {
  const seed = 987654321;
  const first = Array.from({ length: 10 }, duelRoundRng(seed, 1, UID_A));
  const replay = Array.from({ length: 10 }, duelRoundRng(seed, 1, UID_A));
  const otherRound = Array.from({ length: 10 }, duelRoundRng(seed, 2, UID_A));
  const otherSeed = Array.from({ length: 10 }, duelRoundRng(seed + 1, 1, UID_A));

  assert.deepEqual(first, replay);
  assert.notDeepEqual(first, otherRound);
  assert.notDeepEqual(first, otherSeed);
  assert.ok(first.every((value) => value >= 0 && value < 1));
});

test("duelRoundRng donne des tirages differents a deux uids (plus d'egalite forcee)", () => {
  const seed = 424242;
  for (const round of [0, 1, 2] as const) {
    const drawsA = Array.from({ length: 10 }, duelRoundRng(seed, round, UID_A));
    const drawsB = Array.from({ length: 10 }, duelRoundRng(seed, round, UID_B));
    assert.notDeepEqual(drawsA, drawsB, `manche ${round} : tirages identiques pour deux uids`);
  }
});

test("duelRoundRng : meme generateur pour tous les uids, donc distribution identique", () => {
  // Equite : chaque uid passe par le meme mulberry32, seule la graine differe.
  // On verifie que les moyennes empiriques de deux uids convergent vers ~0.5
  // (uniforme [0,1)) sans biais dependant du uid.
  const samples = 5000;
  const meanFor = (uid: string) => {
    let sum = 0;
    for (let seed = 0; seed < 50; seed += 1) {
      const rng = duelRoundRng(seed, (seed % 3) as 0 | 1 | 2, uid);
      for (let i = 0; i < samples / 50; i += 1) {
        sum += rng();
      }
    }
    return sum / samples;
  };

  const meanA = meanFor(UID_A);
  const meanB = meanFor(UID_B);
  assert.ok(Math.abs(meanA - 0.5) < 0.02, `moyenne ${UID_A} hors plage : ${meanA}`);
  assert.ok(Math.abs(meanB - 0.5) < 0.02, `moyenne ${UID_B} hors plage : ${meanB}`);
  assert.ok(Math.abs(meanA - meanB) < 0.03, `biais entre uids : ${meanA} vs ${meanB}`);
});

test("playSeededSlotsDuelRound est deterministe par uid et score = payout sur mise 100", () => {
  const first = playSeededSlotsDuelRound(42, 0, UID_A);
  const second = playSeededSlotsDuelRound(42, 0, UID_A);

  assert.deepEqual(first, second);
  assert.equal(first.score, first.outcome.payout);
  assert.equal(first.outcome.payout, DUEL_ROUND_BET * getMultiplier(first.outcome.reels));

  const otherRound = playSeededSlotsDuelRound(42, 1, UID_A);
  const otherSeed = playSeededSlotsDuelRound(43, 0, UID_A);
  assert.ok(
    JSON.stringify(otherRound.outcome.reels) !== JSON.stringify(first.outcome.reels) ||
      JSON.stringify(otherSeed.outcome.reels) !== JSON.stringify(first.outcome.reels),
  );
});

test("playSeededSlotsDuelRound : deux uids ont des manches differentes (le duel peut se departager)", () => {
  // Sur un eventail de seeds, les totaux de 3 manches des deux joueurs doivent
  // differer au moins une fois : un duel slots n'est plus une egalite garantie.
  let totalsDiffer = 0;
  for (const seed of [1, 7, 42, 1234, 98765, 424242, 2147483646]) {
    const totalA = ([0, 1, 2] as const).reduce((sum, round) => sum + playSeededSlotsDuelRound(seed, round, UID_A).score, 0);
    const totalB = ([0, 1, 2] as const).reduce((sum, round) => sum + playSeededSlotsDuelRound(seed, round, UID_B).score, 0);
    if (totalA !== totalB) {
      totalsDiffer += 1;
    }
  }
  assert.ok(totalsDiffer > 0, "tous les duels slots testes finissent a egalite");
});

test("playSeededPlinkoDuelRound est deterministe par uid et score = round(multiplier * 100)", () => {
  const first = playSeededPlinkoDuelRound(2024, 2, UID_A);
  const second = playSeededPlinkoDuelRound(2024, 2, UID_A);

  assert.deepEqual(first, second);
  assert.equal(first.score, Math.round(first.outcome.multiplier * DUEL_ROUND_BET));
  assert.equal(first.outcome.path.length, 10);
  assert.ok(first.outcome.slot >= 0 && first.outcome.slot <= 10);

  const multipliers = getPlinkoMultipliers(10);
  assert.equal(first.outcome.multiplier, multipliers[first.outcome.slot]);
});

test("playSeededPlinkoDuelRound : deux uids ont des trajectoires differentes", () => {
  let pathsDiffer = 0;
  for (const seed of [1, 7, 42, 1234, 98765, 424242, 2147483646]) {
    for (const round of [0, 1, 2] as const) {
      const a = playSeededPlinkoDuelRound(seed, round, UID_A);
      const b = playSeededPlinkoDuelRound(seed, round, UID_B);
      if (JSON.stringify(a.outcome.path) !== JSON.stringify(b.outcome.path)) {
        pathsDiffer += 1;
      }
    }
  }
  assert.ok(pathsDiffer > 0, "toutes les billes plinko des deux uids sont identiques");
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

test("le crash rocket reste PARTAGE entre les deux joueurs (pas de uid dans le hash)", () => {
  // C'est le choix de cible cash-out qui departage en mode rocket : le crash commun
  // garantit l'equite, il ne doit dependre que de (seed, manche).
  const seed = 555;
  const rounds = [0, 1, 2] as const;
  const crashes = rounds.map((round) => seededRocketCrashMultiplier(seed, round));
  const crashesReplay = rounds.map((round) => seededRocketCrashMultiplier(seed, round));

  assert.deepEqual(crashes, crashesReplay);
});
