import assert from "node:assert/strict";
import test from "node:test";
import { QUICK_BET_CHIPS, clampBet, doubleBet, halveBet } from "./quickBet.ts";

test("expose les jetons rapides standards", () => {
  assert.deepEqual([...QUICK_BET_CHIPS], [10, 25, 50, 100, 250]);
});

test("clampBet garde une mise valide telle quelle", () => {
  assert.equal(clampBet(50, 10, 500), 50);
  assert.equal(clampBet(10, 10, 500), 10);
  assert.equal(clampBet(500, 10, 500), 500);
});

test("clampBet borne la mise entre min et max", () => {
  assert.equal(clampBet(3, 10, 500), 10);
  assert.equal(clampBet(9999, 10, 500), 500);
  assert.equal(clampBet(-25, 10, 500), 10);
});

test("clampBet arrondit a l'entier inferieur", () => {
  assert.equal(clampBet(42.9, 10, 500), 42);
  assert.equal(clampBet(10.4, 10, 500), 10);
});

test("clampBet retombe sur min pour une valeur invalide", () => {
  assert.equal(clampBet(Number.NaN, 10, 500), 10);
  assert.equal(clampBet(Number.POSITIVE_INFINITY, 10, 500), 10);
});

test("clampBet privilegie min quand max passe dessous", () => {
  assert.equal(clampBet(50, 10, 4), 10);
});

test("halveBet divise par deux sans casser le plancher", () => {
  assert.equal(halveBet(100, 10, 500), 50);
  assert.equal(halveBet(25, 10, 500), 12);
  assert.equal(halveBet(10, 10, 500), 10);
});

test("doubleBet double sans depasser le plafond", () => {
  assert.equal(doubleBet(100, 10, 500), 200);
  assert.equal(doubleBet(300, 10, 500), 500);
  assert.equal(doubleBet(10, 10, 500), 20);
});
