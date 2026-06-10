import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_STATS_KEYS,
  buildPublicStats,
  emptyGameStatsState,
  normalizeGameStatsState,
  recordGameResult,
} from "./statsLogic.ts";

test("emptyGameStatsState couvre les neuf jeux a zero", () => {
  const state = emptyGameStatsState();
  assert.equal(GAME_STATS_KEYS.length, 9);
  for (const key of GAME_STATS_KEYS) {
    assert.deepEqual(state[key], {
      plays: 0,
      totalProfit: 0,
      biggestWin: 0,
      biggestLoss: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  }
});

test("normalizeGameStatsState retombe sur l'etat vide pour une valeur invalide", () => {
  assert.deepEqual(normalizeGameStatsState(undefined), emptyGameStatsState());
  assert.deepEqual(normalizeGameStatsState(null), emptyGameStatsState());
  assert.deepEqual(normalizeGameStatsState("stats"), emptyGameStatsState());
  assert.deepEqual(normalizeGameStatsState(42), emptyGameStatsState());
});

test("normalizeGameStatsState conserve les valeurs valides et assainit le reste", () => {
  const state = normalizeGameStatsState({
    slots: { plays: 12, totalProfit: -340, biggestWin: 900, biggestLoss: -100, currentStreak: 2, bestStreak: 5 },
    mines: { plays: -3, totalProfit: Number.NaN, biggestWin: -50, biggestLoss: 80, currentStreak: 4, bestStreak: 1 },
    hilo: "broken",
  });

  assert.deepEqual(state.slots, {
    plays: 12,
    totalProfit: -340,
    biggestWin: 900,
    biggestLoss: -100,
    currentStreak: 2,
    bestStreak: 5,
  });
  assert.equal(state.mines.plays, 0);
  assert.equal(state.mines.totalProfit, 0);
  assert.equal(state.mines.biggestWin, 0);
  assert.equal(state.mines.biggestLoss, 0);
  assert.equal(state.mines.currentStreak, 4);
  assert.equal(state.mines.bestStreak, 4);
  assert.deepEqual(state.hilo, emptyGameStatsState().hilo);
});

test("recordGameResult enregistre un gain et fait monter la serie", () => {
  let state = emptyGameStatsState();
  state = recordGameResult(state, "slots", 150);
  state = recordGameResult(state, "slots", 50);

  assert.equal(state.slots.plays, 2);
  assert.equal(state.slots.totalProfit, 200);
  assert.equal(state.slots.biggestWin, 150);
  assert.equal(state.slots.biggestLoss, 0);
  assert.equal(state.slots.currentStreak, 2);
  assert.equal(state.slots.bestStreak, 2);
});

test("recordGameResult casse la serie sur une perte et garde biggestLoss negatif", () => {
  let state = emptyGameStatsState();
  state = recordGameResult(state, "blackjack", 100);
  state = recordGameResult(state, "blackjack", -250);

  assert.equal(state.blackjack.plays, 2);
  assert.equal(state.blackjack.totalProfit, -150);
  assert.equal(state.blackjack.biggestWin, 100);
  assert.equal(state.blackjack.biggestLoss, -250);
  assert.equal(state.blackjack.currentStreak, 0);
  assert.equal(state.blackjack.bestStreak, 1);
});

test("recordGameResult laisse la serie inchangee sur un net nul", () => {
  let state = emptyGameStatsState();
  state = recordGameResult(state, "roulette", 75);
  state = recordGameResult(state, "roulette", 0);

  assert.equal(state.roulette.plays, 2);
  assert.equal(state.roulette.totalProfit, 75);
  assert.equal(state.roulette.currentStreak, 1);
  assert.equal(state.roulette.bestStreak, 1);
});

test("recordGameResult n'altere pas les autres jeux ni l'etat d'origine", () => {
  const initial = emptyGameStatsState();
  const next = recordGameResult(initial, "mines", 40);

  assert.equal(initial.mines.plays, 0);
  assert.equal(next.mines.plays, 1);
  assert.deepEqual(next.hilo, initial.hilo);
});

test("buildPublicStats n'expose que les jeux joues", () => {
  let state = emptyGameStatsState();
  state = recordGameResult(state, "rocket", 500);
  state = recordGameResult(state, "rocket", -100);
  state = recordGameResult(state, "cases", -20);

  const publicStats = buildPublicStats(state);
  assert.deepEqual(Object.keys(publicStats).sort(), ["cases", "rocket"]);
  assert.deepEqual(publicStats.rocket, { plays: 2, profit: 400, bestWin: 500, bestStreak: 1 });
  assert.deepEqual(publicStats.cases, { plays: 1, profit: -20, bestWin: 0, bestStreak: 0 });
});
