import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRocketRound,
  generateRocketCrashMultiplier,
  getRocketSuccessProbability,
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
