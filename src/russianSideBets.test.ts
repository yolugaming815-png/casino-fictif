import assert from "node:assert/strict";
import test from "node:test";
import type { OnlineRoomEntry } from "./firebaseClient.ts";
import {
  RUSSIAN_SIDE_BET_MAX,
  RUSSIAN_SIDE_BET_MIN,
  computeRussianSideBetSettlements,
  parseRussianSideBets,
} from "./russianSideBets.ts";

function makeRussianRoom(overrides: Partial<OnlineRoomEntry> = {}): OnlineRoomEntry {
  return {
    id: "room-russe",
    type: "russian-roulette",
    game: "Roulette russe",
    status: "playing",
    hostUid: "host-1",
    hostName: "Hote",
    players: [
      { uid: "host-1", displayName: "Hote" },
      { uid: "player-2", displayName: "Joueur 2" },
    ],
    playerIds: ["host-1", "player-2"],
    maxPlayers: 6,
    duelScores: {},
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
    russianAliveUids: ["host-1", "player-2"],
    russianEliminatedUids: [],
    russianPaidRound: {},
    russianShots: [],
    raw: {},
    ...overrides,
  };
}

test("bornes exportees du pari spectateur", () => {
  assert.equal(RUSSIAN_SIDE_BET_MIN, 25);
  assert.equal(RUSSIAN_SIDE_BET_MAX, 10000);
});

test("parseRussianSideBets lit les paris valides depuis raw", () => {
  const room = makeRussianRoom({
    raw: {
      russianSideBets: {
        "spec-1": { displayName: "Specta", targetUid: "host-1", targetName: "Hote", amount: 100, odds: 4, round: 2 },
        "spec-2": { displayName: "", targetUid: "player-2", targetName: "Joueur 2", amount: 50.9, odds: 3.7, round: 1 },
      },
    },
  });

  const bets = parseRussianSideBets(room);
  assert.equal(bets.length, 2);

  const first = bets.find((bet) => bet.spectatorUid === "spec-1");
  assert.deepEqual(first, {
    spectatorUid: "spec-1",
    displayName: "Specta",
    targetUid: "host-1",
    targetName: "Hote",
    amount: 100,
    odds: 4,
    round: 2,
  });

  const second = bets.find((bet) => bet.spectatorUid === "spec-2");
  assert.equal(second?.displayName, "Spectateur anonyme");
  assert.equal(second?.amount, 50);
  assert.equal(second?.odds, 3);
});

test("parseRussianSideBets ignore les entrees corrompues", () => {
  const room = makeRussianRoom({
    raw: {
      russianSideBets: {
        "spec-null": null,
        "spec-string": "pas un objet",
        "spec-sans-cible": { displayName: "X", amount: 100, odds: 3, round: 1 },
        "spec-montant-zero": { displayName: "X", targetUid: "host-1", targetName: "Hote", amount: 0, odds: 3, round: 1 },
        "spec-odds-zero": { displayName: "X", targetUid: "host-1", targetName: "Hote", amount: 100, odds: 0, round: 1 },
        "spec-ok": { displayName: "X", targetUid: "host-1", targetName: "Hote", amount: 100, odds: 3, round: 1 },
      },
    },
  });

  const bets = parseRussianSideBets(room);
  assert.equal(bets.length, 1);
  assert.equal(bets[0].spectatorUid, "spec-ok");
});

test("parseRussianSideBets sans champ russianSideBets", () => {
  assert.deepEqual(parseRussianSideBets(makeRussianRoom()), []);
  assert.deepEqual(parseRussianSideBets(makeRussianRoom({ raw: { russianSideBets: "oops" } })), []);
});

test("computeRussianSideBetSettlements n'emet RIEN pendant la partie (net-at-result)", () => {
  const room = makeRussianRoom({
    raw: {
      russianSideBets: {
        "spec-1": { displayName: "Specta", targetUid: "host-1", targetName: "Hote", amount: 200, odds: 4, round: 1 },
      },
    },
  });

  assert.deepEqual(computeRussianSideBetSettlements(room, "spec-1"), []);
});

test("computeRussianSideBetSettlements regle en net au finished : +(odds-1) x mise ou -mise", () => {
  const room = makeRussianRoom({
    status: "finished",
    winnerUid: "host-1",
    winnerName: "Hote",
    raw: {
      russianSideBets: {
        "spec-1": { displayName: "Specta", targetUid: "host-1", targetName: "Hote", amount: 200, odds: 4, round: 1 },
        "spec-2": { displayName: "Autre", targetUid: "player-2", targetName: "Joueur 2", amount: 100, odds: 3, round: 1 },
      },
    },
  });

  const winning = computeRussianSideBetSettlements(room, "spec-1");
  assert.equal(winning.length, 1);
  assert.equal(winning[0].key, "room-russe:sidebet-net:spec-1");
  assert.equal(winning[0].delta, 600);

  const losing = computeRussianSideBetSettlements(room, "spec-2");
  assert.equal(losing.length, 1);
  assert.equal(losing[0].key, "room-russe:sidebet-net:spec-2");
  assert.equal(losing[0].delta, -100);
});

test("computeRussianSideBetSettlements ignore les autres cas", () => {
  const betRaw = {
    russianSideBets: {
      "spec-1": { displayName: "Specta", targetUid: "host-1", targetName: "Hote", amount: 200, odds: 4, round: 1 },
    },
  };

  assert.deepEqual(computeRussianSideBetSettlements(makeRussianRoom({ raw: betRaw }), "inconnu"), []);
  assert.deepEqual(computeRussianSideBetSettlements(makeRussianRoom({ type: "poker", raw: betRaw }), "spec-1"), []);

  // Finished sans winnerUid : resultat pas encore observable, on n'emet rien
  // (le debit viendra avec le reglement net quand le vainqueur sera ecrit).
  assert.deepEqual(computeRussianSideBetSettlements(makeRussianRoom({ status: "finished", raw: betRaw }), "spec-1"), []);

  // Gagnant a odds 1 : net nul, aucune entree.
  const evenOdds = makeRussianRoom({
    status: "finished",
    winnerUid: "host-1",
    raw: {
      russianSideBets: {
        "spec-1": { displayName: "Specta", targetUid: "host-1", targetName: "Hote", amount: 200, odds: 1, round: 1 },
      },
    },
  });
  assert.deepEqual(computeRussianSideBetSettlements(evenOdds, "spec-1"), []);
});
