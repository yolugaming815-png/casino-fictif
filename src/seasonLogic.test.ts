import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNetToPeriods,
  getSeasonKey,
  getWeekKey,
  normalizePeriodNet,
  previousSeasonKey,
  previousWeekKey,
  rollPeriodNet,
  seasonLabel,
  weekLabel,
} from "./seasonLogic.ts";

test("getSeasonKey formate annee-mois en heure locale", () => {
  assert.equal(getSeasonKey(new Date(2026, 5, 10)), "2026-06");
  assert.equal(getSeasonKey(new Date(2026, 0, 1, 0, 0, 1)), "2026-01");
  assert.equal(getSeasonKey(new Date(2025, 11, 31, 23, 59, 59)), "2025-12");
});

test("previousSeasonKey gere le passage d'annee", () => {
  assert.equal(previousSeasonKey("2026-06"), "2026-05");
  assert.equal(previousSeasonKey("2026-01"), "2025-12");
  assert.equal(previousSeasonKey("2025-12"), "2025-11");
});

test("getWeekKey suit la semaine ISO avec jeudi pivot", () => {
  assert.equal(getWeekKey(new Date(2026, 5, 10)), "2026-W24");
  assert.equal(getWeekKey(new Date(2026, 5, 7)), "2026-W23");
  assert.equal(getWeekKey(new Date(2026, 5, 8)), "2026-W24");
  assert.equal(getWeekKey(new Date(2026, 0, 1)), "2026-W01");
  assert.equal(getWeekKey(new Date(2025, 11, 29)), "2026-W01");
});

test("getWeekKey gere les annees a 53 semaines", () => {
  assert.equal(getWeekKey(new Date(2020, 11, 31)), "2020-W53");
  assert.equal(getWeekKey(new Date(2021, 0, 3)), "2020-W53");
  assert.equal(getWeekKey(new Date(2021, 0, 4)), "2021-W01");
  assert.equal(getWeekKey(new Date(2016, 0, 1)), "2015-W53");
});

test("previousWeekKey recule de sept jours", () => {
  assert.equal(previousWeekKey(new Date(2026, 5, 10)), "2026-W23");
  assert.equal(previousWeekKey(new Date(2026, 5, 8)), "2026-W23");
  assert.equal(previousWeekKey(new Date(2026, 0, 1)), "2025-W52");
  assert.equal(previousWeekKey(new Date(2021, 0, 4)), "2020-W53");
});

test("seasonLabel et weekLabel rendent des libelles francais", () => {
  assert.equal(seasonLabel("2026-06"), "Juin 2026");
  assert.equal(seasonLabel("2025-12"), "Décembre 2025");
  assert.equal(seasonLabel("2026-01"), "Janvier 2026");
  assert.equal(weekLabel("2026-W24"), "Semaine 24");
  assert.equal(weekLabel("2026-W01"), "Semaine 1");
  assert.equal(weekLabel("2020-W53"), "Semaine 53");
});

test("normalizePeriodNet retombe sur les cles du moment", () => {
  const now = new Date(2026, 5, 10);
  assert.deepEqual(normalizePeriodNet(undefined, now), {
    seasonKey: "2026-06",
    seasonNet: 0,
    weeklyKey: "2026-W24",
    weeklyNet: 0,
  });
  assert.deepEqual(normalizePeriodNet({ seasonKey: "2026-05", seasonNet: 320.4, weeklyKey: "2026-W22", weeklyNet: -80 }, now), {
    seasonKey: "2026-05",
    seasonNet: 320,
    weeklyKey: "2026-W22",
    weeklyNet: -80,
  });
});

test("rollPeriodNet reset la saison au premier du mois", () => {
  const state = { seasonKey: "2026-05", seasonNet: 900, weeklyKey: "2026-W23", weeklyNet: 200 };
  const rolled = rollPeriodNet(state, new Date(2026, 5, 1));
  assert.equal(rolled.seasonKey, "2026-06");
  assert.equal(rolled.seasonNet, 0);
  assert.equal(rolled.weeklyKey, "2026-W23");
  assert.equal(rolled.weeklyNet, 200);
});

test("rollPeriodNet reset la semaine au lundi ISO", () => {
  const state = { seasonKey: "2026-06", seasonNet: 450, weeklyKey: "2026-W23", weeklyNet: 450 };
  const sunday = rollPeriodNet(state, new Date(2026, 5, 7, 23, 59));
  assert.equal(sunday, state);
  const monday = rollPeriodNet(state, new Date(2026, 5, 8, 0, 0, 1));
  assert.equal(monday.weeklyKey, "2026-W24");
  assert.equal(monday.weeklyNet, 0);
  assert.equal(monday.seasonNet, 450);
});

test("rollPeriodNet reset les deux periodes au passage d'annee", () => {
  const state = { seasonKey: "2025-12", seasonNet: 1200, weeklyKey: "2026-W01", weeklyNet: 75 };
  const rolled = rollPeriodNet(state, new Date(2026, 0, 5));
  assert.deepEqual(rolled, { seasonKey: "2026-01", seasonNet: 0, weeklyKey: "2026-W02", weeklyNet: 0 });
});

test("applyNetToPeriods cumule apres rollover", () => {
  const state = { seasonKey: "2026-06", seasonNet: 100, weeklyKey: "2026-W23", weeklyNet: 100 };
  const same = applyNetToPeriods(state, 50, new Date(2026, 5, 7));
  assert.deepEqual(same, { seasonKey: "2026-06", seasonNet: 150, weeklyKey: "2026-W23", weeklyNet: 150 });

  const afterMonday = applyNetToPeriods(state, -30, new Date(2026, 5, 8));
  assert.deepEqual(afterMonday, { seasonKey: "2026-06", seasonNet: 70, weeklyKey: "2026-W24", weeklyNet: -30 });
});
