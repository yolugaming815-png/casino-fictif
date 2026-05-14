import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePlinkoPayout,
  generatePlinkoPath,
  getFinalSlot,
  getPlinkoMultiplier,
  playPlinko,
  updatePlinkoBalance,
} from "./plinkoLogic.ts";

test("genere le chemin de la bille avec une source aleatoire injectable", () => {
  const values = [0.1, 0.8, 0.2, 0.9];

  assert.deepEqual(generatePlinkoPath(10, () => values.shift() ?? 0.1).slice(0, 4), ["L", "R", "L", "R"]);
});

test("calcule la case finale avec le nombre de pas a droite", () => {
  assert.equal(getFinalSlot(["L", "R", "R", "L", "R"]), 3);
});

test("attribue les multiplicateurs selon la position", () => {
  assert.equal(getPlinkoMultiplier(0, 10), 10);
  assert.equal(getPlinkoMultiplier(1, 10), 5);
  assert.equal(getPlinkoMultiplier(2, 10), 2);
  assert.equal(getPlinkoMultiplier(3, 10), 0.5);
  assert.equal(getPlinkoMultiplier(4, 10), 0.2);
  assert.equal(getPlinkoMultiplier(5, 10), 0.2);
});

test("inverse les multiplicateurs extremes sur telephone", () => {
  const values = Array.from({ length: 11 }, (_, slot) => getPlinkoMultiplier(slot, 10, "mobile"));

  assert.deepEqual(values, [0.2, 0.2, 0.5, 1, 2, 10, 2, 1, 0.5, 0.2, 0.2]);
});

test("donne davantage de cases faibles sur 10 rangees", () => {
  const values = Array.from({ length: 11 }, (_, slot) => getPlinkoMultiplier(slot, 10));
  const count = (multiplier: number) => values.filter((value) => value === multiplier).length;

  assert.equal(Math.max(...values), 10);
  assert.equal(count(0.2), 3);
  assert.equal(count(0.5), 2);
  assert.equal(count(2), 2);
});

test("calcule le gain a partir de la mise et du multiplicateur", () => {
  assert.deepEqual(calculatePlinkoPayout(100, 10), { payout: 1000, net: 900 });
  assert.deepEqual(calculatePlinkoPayout(100, 0.5), { payout: 50, net: -50 });
});

test("met a jour le solde apres un lancer", () => {
  assert.equal(updatePlinkoBalance(1000, 100, 5), 1400);
  assert.equal(updatePlinkoBalance(1000, 100, 0.5), 950);
});

test("joue un lancer complet", () => {
  const values = Array.from({ length: 10 }, () => 0.9);
  const outcome = playPlinko(10, 10, () => values.shift() ?? 0.9);

  assert.equal(outcome.slot, 10);
  assert.equal(outcome.multiplier, 10);
  assert.equal(outcome.payout, 100);
});
