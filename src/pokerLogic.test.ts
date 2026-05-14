import test from "node:test";
import assert from "node:assert/strict";
import { comparePokerHands, evaluatePokerHand } from "./pokerLogic.ts";

test("detecte une paire et une double paire", () => {
  assert.equal(evaluatePokerHand(["A♠", "A♥", "9♣", "6♦", "3♠", "2♥", "K♣"]).rank, "pair");
  assert.equal(evaluatePokerHand(["A♠", "A♥", "9♣", "9♦", "3♠", "2♥", "K♣"]).rank, "two-pair");
});

test("detecte les grosses combinaisons", () => {
  assert.equal(evaluatePokerHand(["10♠", "J♠", "Q♠", "K♠", "A♠", "2♥", "3♣"]).rank, "straight-flush");
  assert.equal(evaluatePokerHand(["7♠", "7♥", "7♦", "7♣", "A♠", "2♥", "3♣"]).rank, "four-kind");
  assert.equal(evaluatePokerHand(["K♠", "K♥", "K♦", "5♣", "5♠", "2♥", "3♣"]).rank, "full-house");
});

test("compare deux mains de poker", () => {
  const flush = evaluatePokerHand(["A♠", "9♠", "7♠", "4♠", "2♠", "K♥", "3♣"]);
  const straight = evaluatePokerHand(["9♠", "8♥", "7♣", "6♦", "5♠", "A♥", "3♣"]);

  assert.equal(comparePokerHands(flush, straight) > 0, true);
});
