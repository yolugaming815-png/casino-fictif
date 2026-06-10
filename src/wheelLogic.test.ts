import assert from "node:assert/strict";
import test from "node:test";
import { WHEEL_SEGMENTS, canSpinDailyWheel, spinDailyWheel } from "./wheelLogic.ts";

test("WHEEL_SEGMENTS contient les 7 segments attendus avec une somme de poids de 100", () => {
  assert.equal(WHEEL_SEGMENTS.length, 7);
  assert.deepEqual(
    WHEEL_SEGMENTS.map((segment) => segment.id),
    [
      "credits-50",
      "credits-100",
      "credits-250",
      "credits-500",
      "credits-1000",
      "fragments-3",
      "key-rare",
    ],
  );
  assert.deepEqual(
    WHEEL_SEGMENTS.map((segment) => segment.weight),
    [28, 24, 18, 10, 5, 13, 2],
  );

  const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  assert.equal(totalWeight, 100);
});

test("WHEEL_SEGMENTS expose des lots coherents (kind, amount, label)", () => {
  for (const segment of WHEEL_SEGMENTS) {
    assert.ok(segment.label.length > 0);
    assert.ok(segment.amount > 0);
    assert.ok(["credits", "fragments", "key"].includes(segment.kind));
  }

  const creditSegments = WHEEL_SEGMENTS.filter((segment) => segment.kind === "credits");
  assert.deepEqual(
    creditSegments.map((segment) => segment.amount),
    [50, 100, 250, 500, 1000],
  );

  const fragments = WHEEL_SEGMENTS.find((segment) => segment.id === "fragments-3");
  assert.equal(fragments?.amount, 3);

  const key = WHEEL_SEGMENTS.find((segment) => segment.id === "key-rare");
  assert.equal(key?.kind, "key");
  assert.equal(key?.amount, 1);
});

test("spinDailyWheel respecte les frontieres cumulatives des poids", () => {
  const cumulativeStarts: number[] = [];
  let cumulative = 0;
  for (const segment of WHEEL_SEGMENTS) {
    cumulativeStarts.push(cumulative);
    cumulative += segment.weight;
  }

  for (let index = 0; index < WHEEL_SEGMENTS.length; index += 1) {
    const start = cumulativeStarts[index];
    const end = start + WHEEL_SEGMENTS[index].weight;

    const atStart = spinDailyWheel(() => start / 100);
    assert.equal(atStart.segmentIndex, index, `frontiere basse du segment ${index}`);
    assert.equal(atStart.prize, WHEEL_SEGMENTS[index]);

    const justBeforeEnd = spinDailyWheel(() => (end - 0.0001) / 100);
    assert.equal(justBeforeEnd.segmentIndex, index, `frontiere haute du segment ${index}`);
    assert.equal(justBeforeEnd.prize, WHEEL_SEGMENTS[index]);
  }
});

test("spinDailyWheel couvre les extremes du rng", () => {
  const first = spinDailyWheel(() => 0);
  assert.equal(first.segmentIndex, 0);
  assert.equal(first.prize.id, "credits-50");

  const last = spinDailyWheel(() => 0.999999);
  assert.equal(last.segmentIndex, WHEEL_SEGMENTS.length - 1);
  assert.equal(last.prize.id, "key-rare");
});

test("spinDailyWheel est deterministe pour un rng stubbe", () => {
  const a = spinDailyWheel(() => 0.42);
  const b = spinDailyWheel(() => 0.42);

  assert.equal(a.segmentIndex, b.segmentIndex);
  assert.equal(a.prize.id, b.prize.id);
});

test("canSpinDailyWheel autorise un etat null", () => {
  assert.equal(canSpinDailyWheel(null, "2026-06-10"), true);
});

test("canSpinDailyWheel autorise un spin si le dernier date d'hier", () => {
  assert.equal(canSpinDailyWheel({ date: "2026-06-09", spun: true }, "2026-06-10"), true);
});

test("canSpinDailyWheel refuse un second spin le meme jour", () => {
  assert.equal(canSpinDailyWheel({ date: "2026-06-10", spun: true }, "2026-06-10"), false);
});

test("canSpinDailyWheel autorise un spin du jour pas encore consomme", () => {
  assert.equal(canSpinDailyWheel({ date: "2026-06-10", spun: false }, "2026-06-10"), true);
});
