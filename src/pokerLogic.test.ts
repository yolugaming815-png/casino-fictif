import test from "node:test";
import assert from "node:assert/strict";
import {
  comparePokerHands,
  completeCommunityCards,
  evaluatePokerHand,
  parsePokerRoomExtras,
  pokerBlindPositions,
  sitngoBlindLevel,
  sitngoBlinds,
  splitPokerPot,
} from "./pokerLogic.ts";

test("detecte une paire et une double paire", () => {
  assert.equal(evaluatePokerHand(["A♠", "A♥", "9♣", "6♦", "3♠", "2♥", "K♣"]).rank, "pair");
  assert.equal(evaluatePokerHand(["A♠", "A♥", "9♣", "9♦", "3♠", "2♥", "K♣"]).rank, "two-pair");
});

test("complete les cartes communes jusqu'au showdown", () => {
  const completed = completeCommunityCards(["A♠", "K♥", "Q♣"], ["2♠", "3♥", "4♦"]);

  assert.deepEqual(completed.communityCards, ["2♠", "3♥", "4♦", "A♠", "K♥"]);
  assert.deepEqual(completed.deck, ["Q♣"]);
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

test("calcule les blinds sit & go par niveau", () => {
  assert.deepEqual(sitngoBlinds(0), { smallBlind: 25, bigBlind: 50 });
  assert.deepEqual(sitngoBlinds(1), { smallBlind: 50, bigBlind: 100 });
  assert.deepEqual(sitngoBlinds(3), { smallBlind: 200, bigBlind: 400 });
  assert.deepEqual(sitngoBlinds(-2), { smallBlind: 25, bigBlind: 50 });
});

test("monte les blinds toutes les handsPerLevel mains", () => {
  assert.equal(sitngoBlindLevel(1, 4), 0);
  assert.equal(sitngoBlindLevel(3, 4), 0);
  assert.equal(sitngoBlindLevel(4, 4), 1);
  assert.equal(sitngoBlindLevel(7, 4), 1);
  assert.equal(sitngoBlindLevel(8, 4), 2);
  assert.equal(sitngoBlindLevel(5, 0), 5);
});

test("place les blinds selon le dealer", () => {
  assert.deepEqual(pokerBlindPositions(2, 0), { smallBlindIndex: 0, bigBlindIndex: 1, firstToActIndex: 0 });
  assert.deepEqual(pokerBlindPositions(2, 1), { smallBlindIndex: 1, bigBlindIndex: 0, firstToActIndex: 1 });
  assert.deepEqual(pokerBlindPositions(4, 0), { smallBlindIndex: 1, bigBlindIndex: 2, firstToActIndex: 3 });
  assert.deepEqual(pokerBlindPositions(3, 2), { smallBlindIndex: 0, bigBlindIndex: 1, firstToActIndex: 2 });
  assert.deepEqual(pokerBlindPositions(5, 3), { smallBlindIndex: 4, bigBlindIndex: 0, firstToActIndex: 1 });
});

test("partage le pot entre les gagnants", () => {
  assert.deepEqual(splitPokerPot(300, ["a"]), { a: 300 });
  assert.deepEqual(splitPokerPot(305, ["a", "b"]), { a: 153, b: 152 });
  assert.deepEqual(splitPokerPot(0, ["a"]), {});
  assert.deepEqual(splitPokerPot(100, []), {});
});

test("parse les champs poker etendus avec valeurs par defaut", () => {
  const defaults = parsePokerRoomExtras({});

  assert.equal(defaults.mode, "cash");
  assert.equal(defaults.buyIn, 500);
  assert.deepEqual(defaults.stacks, {});
  assert.equal(defaults.smallBlind, 25);
  assert.equal(defaults.bigBlind, 50);
  assert.equal(defaults.dealerIndex, 0);
  assert.equal(defaults.minRaise, 50);
  assert.equal(defaults.blindLevel, 0);
  assert.equal(defaults.handsPerLevel, 4);
  assert.deepEqual(defaults.eliminatedUids, []);

  const parsed = parsePokerRoomExtras({
    pokerMode: "sitngo",
    pokerBuyIn: 750,
    pokerStacks: { a: 900, b: 1100, c: "oops" },
    pokerSmallBlind: 50,
    pokerBigBlind: 100,
    pokerDealerIndex: 2,
    pokerMinRaise: 150,
    pokerBlindLevel: 1,
    pokerHandsPerLevel: 6,
    pokerEliminatedUids: ["x", 42],
  });

  assert.equal(parsed.mode, "sitngo");
  assert.equal(parsed.buyIn, 750);
  assert.deepEqual(parsed.stacks, { a: 900, b: 1100 });
  assert.equal(parsed.smallBlind, 50);
  assert.equal(parsed.bigBlind, 100);
  assert.equal(parsed.dealerIndex, 2);
  assert.equal(parsed.minRaise, 150);
  assert.equal(parsed.blindLevel, 1);
  assert.equal(parsed.handsPerLevel, 6);
  assert.deepEqual(parsed.eliminatedUids, ["x"]);
});
