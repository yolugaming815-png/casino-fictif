import assert from "node:assert/strict";
import test from "node:test";
import {
  canPlaceBet,
  createReels,
  evaluateReels,
  getMultiplier,
  type Reels,
} from "./gameLogic.ts";

test("3x 7 paie x50", () => {
  assert.equal(getMultiplier(["7️⃣", "7️⃣", "7️⃣"]), 50);
  assert.equal(evaluateReels(["7️⃣", "7️⃣", "7️⃣"], 10).payout, 500);
});

test("3x etoile paie x20", () => {
  assert.equal(getMultiplier(["⭐", "⭐", "⭐"]), 20);
  assert.equal(evaluateReels(["⭐", "⭐", "⭐"], 25).net, 475);
});

test("les autres triples paient x10", () => {
  assert.equal(getMultiplier(["🍒", "🍒", "🍒"]), 10);
  assert.equal(getMultiplier(["🍋", "🍋", "🍋"]), 10);
  assert.equal(getMultiplier(["🔔", "🔔", "🔔"]), 10);
});

test("deux symboles identiques paient x2", () => {
  assert.equal(getMultiplier(["🍒", "🍒", "⭐"]), 2);
  assert.equal(getMultiplier(["🔔", "7️⃣", "🔔"]), 2);
  assert.equal(evaluateReels(["🍒", "🍋", "🍒"], 50).net, 50);
});

test("trois symboles differents perdent la mise", () => {
  const outcome = evaluateReels(["🍒", "🍋", "🔔"], 100);

  assert.equal(outcome.multiplier, 0);
  assert.equal(outcome.payout, 0);
  assert.equal(outcome.net, -100);
});

test("la generation aleatoire accepte une source RNG injectable", () => {
  const values = [0, 0.2, 0.99];
  const reels = createReels(() => values.shift() ?? 0) satisfies Reels;

  assert.deepEqual(reels, ["🍒", "🍋", "🍉"]);
});

test("une mise est possible uniquement si le solde suffit", () => {
  assert.equal(canPlaceBet(50, 50), true);
  assert.equal(canPlaceBet(49, 50), false);
});
