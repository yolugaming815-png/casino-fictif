import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRocketCashOut,
  evaluateRocketRound,
  generateRocketCrashMultiplier,
  getRocketMultiplierAtProgress,
  getRocketProgressForMultiplier,
  getRocketSuccessProbability,
  normalizeRocketTarget,
  playRocketRound,
} from "./rocketLogic.ts";

test("genere un crash multiplier entre 1.0 et 5.0", () => {
  assert.equal(generateRocketCrashMultiplier(() => 0), 1);
  assert.equal(generateRocketCrashMultiplier(() => 0.999), 5);
});

test("gagne si la fusee atteint la cible", () => {
  const outcome = evaluateRocketRound(100, 2, 2.6);

  assert.equal(outcome.success, true);
  assert.equal(outcome.payout, 200);
  assert.equal(outcome.net, 100);
});

test("perd si la fusee retombe avant la cible", () => {
  const outcome = evaluateRocketRound(100, 3, 2.4);

  assert.equal(outcome.success, false);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
});

test("joue une manche complete", () => {
  const outcome = playRocketRound(25, 2, () => 0.8);

  assert.equal(outcome.crashMultiplier, 3.4);
  assert.equal(outcome.success, true);
});

test("calcule les probabilites theoriques", () => {
  assert.ok(getRocketSuccessProbability(2) > getRocketSuccessProbability(3));
  assert.ok(getRocketSuccessProbability(3) > getRocketSuccessProbability(5));
  assert.equal(getRocketSuccessProbability(5), 0);
});

test("normalise une cible saisie librement", () => {
  assert.equal(normalizeRocketTarget(1.6), 2);
  assert.equal(normalizeRocketTarget(2.84), 2.8);
  assert.equal(normalizeRocketTarget(5.4), 5);
});

test("la courbe de progression est bornee et monotone", () => {
  assert.equal(getRocketMultiplierAtProgress(0), 1);
  assert.equal(getRocketMultiplierAtProgress(1), 5);
  assert.equal(getRocketMultiplierAtProgress(-0.5), 1);
  assert.equal(getRocketMultiplierAtProgress(1.5), 5);

  let previous = getRocketMultiplierAtProgress(0);
  for (let step = 1; step <= 100; step += 1) {
    const current = getRocketMultiplierAtProgress(step / 100);
    assert.ok(current >= previous);
    previous = current;
  }
});

test("aller-retour entre multiplicateur et progression", () => {
  const samples = [1, 1.25, 2, 2.37, 3.5, 4.99, 5];

  for (const multiplier of samples) {
    const progress = getRocketProgressForMultiplier(multiplier);
    assert.ok(progress >= 0 && progress <= 1);
    assert.ok(Math.abs(getRocketMultiplierAtProgress(progress) - multiplier) < 1e-9);
  }
});

test("gagne en encaissant juste avant le crash", () => {
  const outcome = evaluateRocketCashOut(100, 1.99, 2);

  assert.equal(outcome.mode, "manual");
  assert.equal(outcome.success, true);
  assert.equal(outcome.payout, 199);
  assert.equal(outcome.net, 99);
});

test("perd si l'encaissement tombe pile sur le crash", () => {
  const outcome = evaluateRocketCashOut(100, 2, 2);

  assert.equal(outcome.success, false);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
});

test("perd sans encaissement", () => {
  const outcome = evaluateRocketCashOut(100, null, 4.2);

  assert.equal(outcome.success, false);
  assert.equal(outcome.cashOutMultiplier, null);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
});
