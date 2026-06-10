import assert from "node:assert/strict";
import test from "node:test";
import {
  COINFLIP_MIN_BET,
  computeCoinflipSettlements,
  drawCoinflipResult,
  parseCoinflipRoom,
  sanitizeCoinflipBet,
} from "./coinflipRooms.ts";
import type { OnlineRoomEntry } from "./firebaseClient.ts";

function makeCoinflipRoom(overrides: Partial<OnlineRoomEntry> = {}, raw: Record<string, unknown> = {}): OnlineRoomEntry {
  return {
    id: "room-1",
    type: "coinflip",
    game: "Pile ou face",
    status: "finished",
    hostUid: "host-1",
    hostName: "Hote",
    players: [
      { uid: "host-1", displayName: "Hote" },
      { uid: "guest-1", displayName: "Invite" },
    ],
    playerIds: ["host-1", "guest-1"],
    maxPlayers: 2,
    duelScores: {},
    winnerUid: "host-1",
    winnerName: "Hote",
    pokerPhase: "waiting",
    pokerDeck: [],
    pokerHands: {},
    communityCards: [],
    foldedPlayerIds: [],
    pokerActions: {},
    pokerPot: 0,
    pokerCurrentBet: 0,
    pokerContributions: {},
    pokerPaidByPlayer: {},
    pokerHandId: 0,
    pokerWinnerUids: [],
    pokerWinnerNames: [],
    pokerWinnerHandCards: [],
    pokerShowdownResults: [],
    russianBet: 25,
    russianPot: 0,
    russianRound: 1,
    russianAliveUids: [],
    russianEliminatedUids: [],
    russianPaidRound: {},
    russianShots: [],
    raw: { coinflipBet: 100, coinflipResult: "heads", ...raw },
    ...overrides,
  };
}

test("drawCoinflipResult : heads sous 0.5, tails au-dessus", () => {
  assert.equal(drawCoinflipResult(() => 0), "heads");
  assert.equal(drawCoinflipResult(() => 0.49), "heads");
  assert.equal(drawCoinflipResult(() => 0.5), "tails");
  assert.equal(drawCoinflipResult(() => 0.99), "tails");
});

test("sanitizeCoinflipBet : plancher 25 et arrondi entier", () => {
  assert.equal(sanitizeCoinflipBet(100), 100);
  assert.equal(sanitizeCoinflipBet(100.9), 100);
  assert.equal(sanitizeCoinflipBet(10), COINFLIP_MIN_BET);
  assert.equal(sanitizeCoinflipBet(-50), COINFLIP_MIN_BET);
  assert.equal(sanitizeCoinflipBet(Number.NaN), COINFLIP_MIN_BET);
});

test("parseCoinflipRoom : lit bet/result depuis raw, host=heads challenger=tails", () => {
  const view = parseCoinflipRoom(makeCoinflipRoom());
  assert.equal(view.bet, 100);
  assert.equal(view.result, "heads");
  assert.equal(view.hostSide, "heads");
  assert.equal(view.challengerSide, "tails");
  assert.equal(view.winnerUid, "host-1");
  assert.equal(view.winnerName, "Hote");
});

test("parseCoinflipRoom : valeurs par defaut sur raw invalide", () => {
  const view = parseCoinflipRoom(
    makeCoinflipRoom({ winnerUid: undefined, winnerName: undefined }, { coinflipBet: "abc", coinflipResult: "pile" }),
  );
  assert.equal(view.bet, COINFLIP_MIN_BET);
  assert.equal(view.result, "");
  assert.equal(view.winnerUid, "");
});

test("computeCoinflipSettlements : debit pour les deux joueurs, credit 2x pour le gagnant", () => {
  const room = makeCoinflipRoom();

  const winnerSettlements = computeCoinflipSettlements(room, "host-1");
  assert.equal(winnerSettlements.length, 2);
  assert.deepEqual(
    winnerSettlements.map((settlement) => [settlement.key, settlement.delta]),
    [
      ["room-1:cf-bet:host-1", -100],
      ["room-1:cf-win", 200],
    ],
  );

  const loserSettlements = computeCoinflipSettlements(room, "guest-1");
  assert.equal(loserSettlements.length, 1);
  assert.equal(loserSettlements[0].key, "room-1:cf-bet:guest-1");
  assert.equal(loserSettlements[0].delta, -100);
});

test("computeCoinflipSettlements : rien pour un non-joueur, une room non finie ou sans resultat", () => {
  const room = makeCoinflipRoom();
  assert.deepEqual(computeCoinflipSettlements(room, "spectator-1"), []);
  assert.deepEqual(computeCoinflipSettlements(makeCoinflipRoom({ status: "waiting" }), "host-1"), []);
  assert.deepEqual(computeCoinflipSettlements(makeCoinflipRoom({}, { coinflipResult: "" }), "host-1"), []);
  assert.deepEqual(computeCoinflipSettlements(makeCoinflipRoom({ type: "duel" }), "host-1"), []);
  assert.deepEqual(computeCoinflipSettlements(makeCoinflipRoom({ winnerUid: undefined }), "host-1"), []);
});
