import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// progressionLogic.ts importe ses voisins sans extension (style Vite/Bundler) : on ajoute
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
  MAX_LEVEL,
  addXp,
  availableBets,
  levelFromXp,
  levelPerks,
  levelTitle,
  levelUpCost,
  normalizeProgression,
  totalXpForLevel,
  xpForWager,
  xpProgress,
} = await import("./progressionLogic.ts");

test("levelUpCost suit exactement la formule Math.round(500 * level^1.6)", () => {
  assert.equal(levelUpCost(1), 500);
  assert.equal(levelUpCost(2), Math.round(500 * Math.pow(2, 1.6)));
  assert.equal(levelUpCost(5), Math.round(500 * Math.pow(5, 1.6)));
  assert.equal(levelUpCost(10), Math.round(500 * Math.pow(10, 1.6)));
  assert.equal(levelUpCost(50), Math.round(500 * Math.pow(50, 1.6)));
});

test("levelUpCost est strictement croissant", () => {
  for (let level = 1; level < MAX_LEVEL; level += 1) {
    assert.ok(
      levelUpCost(level + 1) > levelUpCost(level),
      `cout non croissant entre ${level} et ${level + 1}`,
    );
  }
});

test("totalXpForLevel cumule les couts pour atteindre le niveau", () => {
  assert.equal(totalXpForLevel(1), 0);
  assert.equal(totalXpForLevel(2), levelUpCost(1));
  assert.equal(totalXpForLevel(3), levelUpCost(1) + levelUpCost(2));

  let expected = 0;
  for (let level = 1; level < 10; level += 1) {
    expected += levelUpCost(level);
  }
  assert.equal(totalXpForLevel(10), expected);
});

test("totalXpForLevel est strictement croissant jusqu'a MAX_LEVEL", () => {
  for (let level = 1; level < MAX_LEVEL; level += 1) {
    assert.ok(totalXpForLevel(level + 1) > totalXpForLevel(level));
  }
});

test("levelFromXp(totalXpForLevel(n)) === n pour tous les niveaux", () => {
  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    assert.equal(levelFromXp(totalXpForLevel(level)), level);
  }
});

test("levelFromXp reste au niveau courant juste avant le palier suivant", () => {
  for (let level = 1; level < MAX_LEVEL; level += 1) {
    assert.equal(levelFromXp(totalXpForLevel(level + 1) - 1), level);
  }
});

test("levelFromXp gere les entrees limites", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(-100), 1);
  assert.equal(levelFromXp(Number.NaN), 1);
  assert.equal(levelFromXp(Number.MAX_SAFE_INTEGER), MAX_LEVEL);
});

test("xpProgress renvoie le niveau, l'avancement et le ratio", () => {
  const start = xpProgress(0);
  assert.equal(start.level, 1);
  assert.equal(start.current, 0);
  assert.equal(start.required, levelUpCost(1));
  assert.equal(start.ratio, 0);

  const mid = xpProgress(totalXpForLevel(3) + 100);
  assert.equal(mid.level, 3);
  assert.equal(mid.current, 100);
  assert.equal(mid.required, levelUpCost(3));
  assert.ok(Math.abs(mid.ratio - 100 / levelUpCost(3)) < 1e-9);
});

test("xpProgress plafonne au niveau maximum avec un ratio de 1", () => {
  const maxed = xpProgress(totalXpForLevel(MAX_LEVEL) + 999999);
  assert.equal(maxed.level, MAX_LEVEL);
  assert.equal(maxed.ratio, 1);
});

test("xpForWager arrondit la mise avec un minimum de 1", () => {
  assert.equal(xpForWager(10), 10);
  assert.equal(xpForWager(0), 1);
  assert.equal(xpForWager(-50), 1);
  assert.equal(xpForWager(10.6), 11);
});

test("addXp ajoute le montant sans modifier l'etat d'origine", () => {
  const state = { xp: 100, lastLevelSeen: 1 };
  const next = addXp(state, 50);

  assert.equal(next.xp, 150);
  assert.equal(next.lastLevelSeen, 1);
  assert.equal(state.xp, 100);
});

test("addXp ignore les montants nuls ou negatifs", () => {
  const state = { xp: 100, lastLevelSeen: 2 };
  assert.equal(addXp(state, 0), state);
  assert.equal(addXp(state, -10), state);
  assert.equal(addXp(state, Number.NaN), state);
});

test("normalizeProgression renvoie le defaut pour les valeurs invalides", () => {
  const fallback = { xp: 0, lastLevelSeen: 1 };
  assert.deepEqual(normalizeProgression(undefined), fallback);
  assert.deepEqual(normalizeProgression(null), fallback);
  assert.deepEqual(normalizeProgression("xp"), fallback);
  assert.deepEqual(normalizeProgression({}), fallback);
  assert.deepEqual(normalizeProgression({ xp: "abc", lastLevelSeen: Number.NaN }), fallback);
});

test("normalizeProgression assainit les champs valides", () => {
  assert.deepEqual(normalizeProgression({ xp: 1234.7, lastLevelSeen: 5 }), {
    xp: 1234,
    lastLevelSeen: 5,
  });
  assert.deepEqual(normalizeProgression({ xp: -50, lastLevelSeen: 0 }), {
    xp: 0,
    lastLevelSeen: 1,
  });
  assert.deepEqual(normalizeProgression({ xp: 10, lastLevelSeen: 500 }), {
    xp: 10,
    lastLevelSeen: MAX_LEVEL,
  });
});

test("levelTitle renvoie le titre du palier atteint", () => {
  assert.equal(levelTitle(1), "Novice");
  assert.equal(levelTitle(2), "Novice");
  assert.equal(levelTitle(3), "Habitué");
  assert.equal(levelTitle(4), "Habitué");
  assert.equal(levelTitle(5), "Flambeur");
  assert.equal(levelTitle(8), "Gros Joueur");
  assert.equal(levelTitle(10), "High Roller");
  assert.equal(levelTitle(13), "Magnat");
  assert.equal(levelTitle(16), "Nabab");
  assert.equal(levelTitle(20), "Légende du Casino");
  assert.equal(levelTitle(MAX_LEVEL), "Légende du Casino");
});

test("availableBets debloque les mises aux bons niveaux", () => {
  assert.deepEqual(availableBets(1), [10, 25, 50, 100]);
  assert.deepEqual(availableBets(2), [10, 25, 50, 100, 150]);
  assert.deepEqual(availableBets(6), [10, 25, 50, 100, 150]);
  assert.deepEqual(availableBets(7), [10, 25, 50, 100, 150, 250]);
  assert.deepEqual(availableBets(12), [10, 25, 50, 100, 150, 250, 500]);
  assert.deepEqual(availableBets(20), [10, 25, 50, 100, 150, 250, 500, 1000]);
  assert.deepEqual(availableBets(MAX_LEVEL), [10, 25, 50, 100, 150, 250, 500, 1000]);
});

test("levelPerks accorde les pubs bonus aux niveaux 5/10/15", () => {
  assert.equal(levelPerks(1).extraDailyAds, 0);
  assert.equal(levelPerks(4).extraDailyAds, 0);
  assert.equal(levelPerks(5).extraDailyAds, 1);
  assert.equal(levelPerks(9).extraDailyAds, 1);
  assert.equal(levelPerks(10).extraDailyAds, 2);
  assert.equal(levelPerks(14).extraDailyAds, 2);
  assert.equal(levelPerks(15).extraDailyAds, 3);
  assert.equal(levelPerks(MAX_LEVEL).extraDailyAds, 3);
});

test("levelPerks debloque le coffre Prestige au niveau 10", () => {
  assert.equal(levelPerks(9).prestigeChestUnlocked, false);
  assert.equal(levelPerks(10).prestigeChestUnlocked, true);
  assert.equal(levelPerks(MAX_LEVEL).prestigeChestUnlocked, true);
});

test("levelPerks expose la mise maximale du niveau", () => {
  assert.equal(levelPerks(1).maxBet, 100);
  assert.equal(levelPerks(2).maxBet, 150);
  assert.equal(levelPerks(7).maxBet, 250);
  assert.equal(levelPerks(12).maxBet, 500);
  assert.equal(levelPerks(20).maxBet, 1000);
});
