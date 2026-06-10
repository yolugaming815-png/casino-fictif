import assert from "node:assert/strict";
import test from "node:test";
import {
  SOUP_AMOUNT,
  SOUP_COOLDOWN_MS,
  SOUP_THRESHOLD,
  SOUP_TITLE_DURATION_MS,
  STREAK_REWARDS,
  canClaimSoup,
  claimDailyStreak,
  getStreakStatus,
  isSoupTitleActive,
  normalizeDailyStreak,
  previousDateKey,
  normalizeSoup,
} from "./streakLogic.ts";

test("STREAK_REWARDS suit le bareme jour 1 a 7", () => {
  assert.deepEqual(STREAK_REWARDS, [100, 200, 300, 450, 600, 800, 1000]);
});

test("normalizeDailyStreak retombe sur l'etat par defaut", () => {
  assert.deepEqual(normalizeDailyStreak(undefined), { lastClaimDate: "", streak: 0 });
  assert.deepEqual(normalizeDailyStreak(null), { lastClaimDate: "", streak: 0 });
  assert.deepEqual(normalizeDailyStreak({ lastClaimDate: "hier", streak: -4 }), { lastClaimDate: "", streak: 0 });
  assert.deepEqual(normalizeDailyStreak({ lastClaimDate: "2026-06-09", streak: 3.9 }), {
    lastClaimDate: "2026-06-09",
    streak: 3,
  });
});

test("previousDateKey gere les changements de mois et d'annee", () => {
  assert.equal(previousDateKey("2026-06-10"), "2026-06-09");
  assert.equal(previousDateKey("2026-06-01"), "2026-05-31");
  assert.equal(previousDateKey("2026-01-01"), "2025-12-31");
  assert.equal(previousDateKey("2024-03-01"), "2024-02-29");
  assert.equal(previousDateKey("2023-03-01"), "2023-02-28");
});

test("getStreakStatus continue la serie si claim hier", () => {
  const status = getStreakStatus({ lastClaimDate: "2026-06-09", streak: 3 }, "2026-06-10");
  assert.deepEqual(status, { claimedToday: false, nextStreak: 4, nextReward: 450, willReset: false });
});

test("getStreakStatus repart a 1 apres un jour manque", () => {
  const status = getStreakStatus({ lastClaimDate: "2026-06-07", streak: 5 }, "2026-06-10");
  assert.deepEqual(status, { claimedToday: false, nextStreak: 1, nextReward: 100, willReset: true });
});

test("getStreakStatus detecte le claim du jour", () => {
  const status = getStreakStatus({ lastClaimDate: "2026-06-10", streak: 4 }, "2026-06-10");
  assert.equal(status.claimedToday, true);
  assert.equal(status.nextStreak, 4);
  assert.equal(status.willReset, false);
});

test("getStreakStatus demarre une premiere serie sans reset", () => {
  const status = getStreakStatus({ lastClaimDate: "", streak: 0 }, "2026-06-10");
  assert.deepEqual(status, { claimedToday: false, nextStreak: 1, nextReward: 100, willReset: false });
});

test("claimDailyStreak verse la recompense et avance la serie", () => {
  const result = claimDailyStreak({ lastClaimDate: "2026-06-09", streak: 1 }, "2026-06-10");
  assert.deepEqual(result.state, { lastClaimDate: "2026-06-10", streak: 2 });
  assert.equal(result.reward, 200);
});

test("claimDailyStreak plafonne la recompense au jour 7", () => {
  const result = claimDailyStreak({ lastClaimDate: "2026-06-09", streak: 9 }, "2026-06-10");
  assert.equal(result.state.streak, 10);
  assert.equal(result.reward, 1000);
});

test("claimDailyStreak rend 0 si deja claime aujourd'hui", () => {
  const state = { lastClaimDate: "2026-06-10", streak: 4 };
  const result = claimDailyStreak(state, "2026-06-10");
  assert.equal(result.reward, 0);
  assert.deepEqual(result.state, state);
});

test("normalizeSoup retombe sur lastSoupAt 0", () => {
  assert.deepEqual(normalizeSoup(undefined), { lastSoupAt: 0 });
  assert.deepEqual(normalizeSoup({ lastSoupAt: Number.NaN }), { lastSoupAt: 0 });
  assert.deepEqual(normalizeSoup({ lastSoupAt: 1_750_000_000_000 }), { lastSoupAt: 1_750_000_000_000 });
});

test("canClaimSoup exige un solde au plus au seuil et le cooldown ecoule", () => {
  const now = 1_750_000_000_000;
  assert.equal(SOUP_THRESHOLD, 50);
  assert.equal(SOUP_AMOUNT, 200);
  assert.equal(canClaimSoup(20, { lastSoupAt: 0 }, now), true);
  assert.equal(canClaimSoup(SOUP_THRESHOLD, { lastSoupAt: 0 }, now), true);
  assert.equal(canClaimSoup(51, { lastSoupAt: 0 }, now), false);
  assert.equal(canClaimSoup(0, { lastSoupAt: now - SOUP_COOLDOWN_MS + 1 }, now), false);
  assert.equal(canClaimSoup(0, { lastSoupAt: now - SOUP_COOLDOWN_MS }, now), true);
});

test("isSoupTitleActive couvre 24 h apres la soupe", () => {
  const soupAt = 1_750_000_000_000;
  assert.equal(isSoupTitleActive(soupAt, soupAt), true);
  assert.equal(isSoupTitleActive(soupAt, soupAt + SOUP_TITLE_DURATION_MS - 1), true);
  assert.equal(isSoupTitleActive(soupAt, soupAt + SOUP_TITLE_DURATION_MS), false);
  assert.equal(isSoupTitleActive(soupAt, soupAt - 1), false);
  assert.equal(isSoupTitleActive(undefined, soupAt), false);
  assert.equal(isSoupTitleActive(0, soupAt), false);
});
