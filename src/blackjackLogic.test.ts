import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBlackjackPayout,
  compareHands,
  handValue,
  isBlackjack,
  type Card,
} from "./blackjackLogic.ts";

const card = (rank: Card["rank"], suit: Card["suit"] = "♠"): Card => ({ rank, suit });

test("calcule la valeur d'une main avec figures", () => {
  assert.equal(handValue([card("K"), card("9")]), 19);
  assert.equal(handValue([card("Q"), card("J")]), 20);
});

test("detecte un blackjack naturel uniquement avec deux cartes", () => {
  assert.equal(isBlackjack([card("A"), card("K")]), true);
  assert.equal(isBlackjack([card("A"), card("5"), card("5")]), false);
});

test("compare joueur et croupier", () => {
  assert.equal(compareHands([card("10"), card("9")], [card("10"), card("8")]), "player_win");
  assert.equal(compareHands([card("10"), card("6")], [card("10"), card("8")]), "dealer_win");
  assert.equal(compareHands([card("10"), card("8")], [card("K"), card("8")]), "push");
});

test("gere les As comme 1 ou 11", () => {
  assert.equal(handValue([card("A"), card("9")]), 20);
  assert.equal(handValue([card("A"), card("9"), card("5")]), 15);
  assert.equal(handValue([card("A"), card("A"), card("9")]), 21);
});

test("paie les gains selon le resultat", () => {
  assert.deepEqual(
    calculateBlackjackPayout(100, [card("A"), card("K")], [card("10"), card("8")]),
    {
      result: "player_blackjack",
      multiplier: 2.5,
      payout: 250,
      net: 150,
      label: "Blackjack naturel",
    },
  );
  assert.equal(calculateBlackjackPayout(50, [card("10"), card("9")], [card("10"), card("8")]).net, 50);
  assert.equal(calculateBlackjackPayout(50, [card("10"), card("8")], [card("K"), card("8")]).net, 0);
  assert.equal(calculateBlackjackPayout(50, [card("10"), card("6")], [card("K"), card("8")]).net, -50);
});
