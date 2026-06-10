import assert from "node:assert/strict";
import test from "node:test";
import { mulberry32 } from "./seededRng.ts";
import {
  CRASH_GROWTH,
  CRASH_HOUSE_EDGE,
  CRASH_MAX_POINT,
  crashCommitment,
  crashMultiplierAt,
  crashPointToCents,
  crashTimeForMultiplier,
  drawCrashPoint,
  formatCrashPoint,
  normalizeCrashPoint,
  randomCrashSalt,
  verifyCrashCommitment,
} from "./crashMath.ts";

test("crashMultiplierAt demarre a x1.00 et croit de facon monotone", () => {
  assert.equal(crashMultiplierAt(0), 1);
  assert.equal(crashMultiplierAt(-500), 1);

  let previous = 1;
  for (let elapsed = 0; elapsed <= 40000; elapsed += 250) {
    const multiplier = crashMultiplierAt(elapsed);
    assert.ok(multiplier >= previous, `regression a ${elapsed} ms : ${multiplier} < ${previous}`);
    assert.ok(Math.abs(multiplier * 100 - Math.round(multiplier * 100)) < 1e-9, `plus de 2 decimales a ${elapsed} ms : ${multiplier}`);
    previous = multiplier;
  }
});

test("crashMultiplierAt respecte les reperes du design (x2 ~4,6 s, x10 ~15,4 s, x250 ~37 s)", () => {
  assert.ok(Math.abs(crashTimeForMultiplier(2) - 4600) < 100, `x2 : ${crashTimeForMultiplier(2)} ms`);
  assert.ok(Math.abs(crashTimeForMultiplier(10) - 15400) < 100, `x10 : ${crashTimeForMultiplier(10)} ms`);
  assert.ok(Math.abs(crashTimeForMultiplier(CRASH_MAX_POINT) - 37000) < 200, `x250 : ${crashTimeForMultiplier(CRASH_MAX_POINT)} ms`);
});

test("crashTimeForMultiplier est l'inverse de crashMultiplierAt", () => {
  assert.equal(crashTimeForMultiplier(1), 0);
  assert.equal(crashTimeForMultiplier(0.5), 0);

  for (const multiplier of [1.01, 1.5, 2, 4.2, 10, 99.99, CRASH_MAX_POINT]) {
    const elapsed = crashTimeForMultiplier(multiplier);
    const recovered = crashMultiplierAt(elapsed);
    assert.ok(Math.abs(recovered - multiplier) <= 0.01, `aller-retour x${multiplier} : ${recovered}`);
  }

  const exact = 16 * Math.log(2) / Math.log(CRASH_GROWTH);
  assert.equal(crashTimeForMultiplier(2), exact);
});

test("drawCrashPoint applique le house edge et la formule du design", () => {
  assert.equal(drawCrashPoint(() => 0), 1);
  assert.equal(drawCrashPoint(() => CRASH_HOUSE_EDGE - 0.0001), 1);
  assert.equal(drawCrashPoint(() => CRASH_HOUSE_EDGE), 1);
  assert.equal(drawCrashPoint(() => 0.5), 1.94);
  assert.equal(drawCrashPoint(() => 0.9), 9.7);
  assert.equal(drawCrashPoint(() => 0.999), CRASH_MAX_POINT);
  assert.equal(drawCrashPoint(() => 0.9999999), CRASH_MAX_POINT);
});

test("drawCrashPoint reste dans [1, 250] avec une distribution plausible", () => {
  const rng = mulberry32(20260610);
  const draws = Array.from({ length: 10000 }, () => drawCrashPoint(rng));

  assert.ok(draws.every((point) => point >= 1 && point <= CRASH_MAX_POINT));

  const instantCrashes = draws.filter((point) => point === 1).length / draws.length;
  assert.ok(instantCrashes > 0.02 && instantCrashes < 0.08, `crash instantanes : ${instantCrashes}`);

  const reachTwo = draws.filter((point) => point >= 2).length / draws.length;
  assert.ok(reachTwo > 0.44 && reachTwo < 0.53, `proportion >= x2 : ${reachTwo}`);
});

test("crashCommitment produit un SHA-256 hex deterministe", async () => {
  const first = await crashCommitment(2.37, "abcdef0123456789abcdef0123456789");
  const second = await crashCommitment(2.37, "abcdef0123456789abcdef0123456789");

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, await crashCommitment(2.38, "abcdef0123456789abcdef0123456789"));
  assert.notEqual(first, await crashCommitment(2.37, "ffffff0123456789abcdef0123456789"));
});

test("verifyCrashCommitment valide le couple point/sel et rejette le reste", async () => {
  const salt = randomCrashSalt();
  const hash = await crashCommitment(7.41, salt);

  assert.equal(await verifyCrashCommitment(7.41, salt, hash), true);
  assert.equal(await verifyCrashCommitment(7.41, salt, hash.toUpperCase().trim()), true);
  assert.equal(await verifyCrashCommitment(7.42, salt, hash), false);
  assert.equal(await verifyCrashCommitment(7.41, randomCrashSalt(), hash), false);
  assert.equal(await verifyCrashCommitment(7.41, salt, "deadbeef"), false);
});

test("normalizeCrashPoint est sans perte sur les valeurs k/100 (pas de re-floor flottant)", () => {
  // Valeurs historiquement cassees par Math.floor(x * 100) / 100 (1.13 * 100 === 112.999...).
  for (const point of [1.13, 1.14, 1.15, 1.16, 2.01, 2.03, 2.05, 2.07]) {
    assert.equal(normalizeCrashPoint(point), point, `re-floor casse ${point}`);
    assert.equal(formatCrashPoint(point), point.toFixed(2));
  }

  // Exhaustif : tous les tirages possibles de drawCrashPoint (100 a 25000 centiemes).
  for (let cents = 100; cents <= CRASH_MAX_POINT * 100; cents += 1) {
    const point = cents / 100;
    assert.equal(crashPointToCents(point), cents, `centiemes alteres pour ${point}`);
    assert.equal(normalizeCrashPoint(point), point, `normalisation alteree pour ${point}`);
  }

  // Bornes et entrees invalides.
  assert.equal(normalizeCrashPoint(0.5), 1);
  assert.equal(normalizeCrashPoint(9999), CRASH_MAX_POINT);
  assert.equal(normalizeCrashPoint(Number.NaN), 1);
  assert.equal(formatCrashPoint(1), "1.00");
  assert.equal(formatCrashPoint(CRASH_MAX_POINT), "250.00");
});

test("le commitment survit au round-trip de normalisation (valeurs problematiques)", async () => {
  const salt = "abcdef0123456789abcdef0123456789";

  for (const point of [1.13, 1.14, 1.15, 1.16, 2.01, 2.03, 2.05, 2.07, 1.94, 9.7]) {
    const committed = await crashCommitment(point, salt);
    const revealed = await crashCommitment(normalizeCrashPoint(point), salt);
    assert.equal(revealed, committed, `hash divergent apres normalisation pour ${point}`);
    assert.equal(await verifyCrashCommitment(normalizeCrashPoint(point), salt, committed), true);
  }
});

test("randomCrashSalt retourne 16 octets hex uniques", () => {
  const salts = Array.from({ length: 20 }, () => randomCrashSalt());

  for (const salt of salts) {
    assert.match(salt, /^[0-9a-f]{32}$/);
  }

  assert.equal(new Set(salts).size, salts.length);
});
