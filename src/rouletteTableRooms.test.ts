import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import type { OnlineRoomEntry } from "./firebaseClient.ts";

// rouletteTableRooms.ts importe "./rouletteLogic" sans extension (style du repo, resolu par Vite/tsc).
// Sous node:test, on ajoute un hook de resolution qui retente avec l'extension .ts.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return nextResolve(`${specifier}.ts`, context);
      }

      throw error;
    }
  },
});

const {
  ROULETTE_TABLE_BETTING_GRACE_MS,
  ROULETTE_TABLE_BETTING_MS,
  ROULETTE_TABLE_HISTORY_LIMIT,
  ROULETTE_TABLE_MAX_BETS_PER_PLAYER,
  ROULETTE_TABLE_MAX_PLAYERS,
  computeRouletteTableSettlements,
  countRouletteTableBets,
  parseRouletteTableRoom,
} = await import("./rouletteTableRooms.ts");

function makeRouletteTableRoom(overrides: Partial<OnlineRoomEntry> = {}): OnlineRoomEntry {
  return {
    id: "room-table",
    type: "roulette-table",
    game: "Table roulette",
    status: "playing",
    hostUid: "host-1",
    hostName: "Hote",
    players: [
      { uid: "host-1", displayName: "Hote" },
      { uid: "player-2", displayName: "Joueur 2" },
    ],
    playerIds: ["host-1", "player-2"],
    maxPlayers: 8,
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
    russianAliveUids: [],
    russianEliminatedUids: [],
    russianPaidRound: {},
    russianShots: [],
    raw: {},
    ...overrides,
  };
}

test("constantes exportees de la table roulette", () => {
  assert.equal(ROULETTE_TABLE_MAX_PLAYERS, 8);
  assert.equal(ROULETTE_TABLE_BETTING_MS, 20000);
  assert.equal(ROULETTE_TABLE_BETTING_GRACE_MS, 22000);
  assert.equal(ROULETTE_TABLE_MAX_BETS_PER_PLAYER, 8);
  assert.equal(ROULETTE_TABLE_HISTORY_LIMIT, 15);
});

test("parseRouletteTableRoom applique les valeurs par defaut sur un raw vide", () => {
  const view = parseRouletteTableRoom(makeRouletteTableRoom());

  assert.equal(view.phase, "betting");
  assert.equal(view.roundId, 1);
  assert.equal(view.bettingStartedAt, null);
  assert.deepEqual(view.bets, {});
  assert.equal(view.resultNumber, -1);
  assert.equal(view.spunByUid, "");
  assert.deepEqual(view.history, []);
});

test("parseRouletteTableRoom lit les mises valides et filtre le bruit", () => {
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "results",
      rtRoundId: 3.9,
      rtBets: {
        "host-1": {
          displayName: "Hote",
          photoURL: "https://example.com/h.png",
          total: 9999,
          bets: [
            { kind: "straight", number: 7, amount: 100 },
            { kind: "red", number: 99, amount: 50.7 },
            { kind: "inconnue", number: 2, amount: 75 },
            { kind: "black", number: -1, amount: 0 },
            "junk",
          ],
        },
        "player-2": { displayName: "Joueur 2", bets: [] },
        "player-3": "junk",
      },
      rtResultNumber: 37,
      rtSpunByUid: "host-1",
      rtHistory: [0, 36, "x", 12.5, 41, ...Array.from({ length: 20 }, (_, index) => index + 1)],
    },
  });

  const view = parseRouletteTableRoom(room);

  assert.equal(view.phase, "results");
  assert.equal(view.roundId, 3);
  assert.equal(view.resultNumber, -1);
  assert.equal(view.spunByUid, "host-1");
  assert.equal(view.history.length, ROULETTE_TABLE_HISTORY_LIMIT);
  // Valides : [0, 36, 1..20] (22 numeros) -> slice(-15) commence a 6.
  assert.deepEqual(view.history.slice(0, 2), [6, 7]);
  assert.deepEqual(Object.keys(view.bets), ["host-1"]);

  const hostBets = view.bets["host-1"];
  assert.equal(hostBets.uid, "host-1");
  assert.equal(hostBets.displayName, "Hote");
  assert.equal(hostBets.photoURL, "https://example.com/h.png");
  assert.deepEqual(hostBets.bets, [
    { kind: "straight", number: 7, amount: 100 },
    { kind: "red", number: -1, amount: 50 },
  ]);
  assert.equal(hostBets.total, 150);
  assert.equal(countRouletteTableBets(view), 2);
});

test("computeRouletteTableSettlements n'emet RIEN pendant la phase betting (net-at-result)", () => {
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "betting",
      rtRoundId: 4,
      rtBets: {
        "host-1": {
          displayName: "Hote",
          photoURL: "",
          total: 150,
          bets: [
            { kind: "straight", number: 7, amount: 100 },
            { kind: "red", number: -1, amount: 50 },
          ],
        },
      },
      rtResultNumber: -1,
    },
  });

  assert.deepEqual(computeRouletteTableSettlements(room, "host-1"), []);
});

test("computeRouletteTableSettlements emet un seul reglement net en phase results", () => {
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "results",
      rtRoundId: 4,
      rtBets: {
        "host-1": {
          displayName: "Hote",
          photoURL: "",
          total: 150,
          bets: [
            { kind: "straight", number: 7, amount: 100 },
            { kind: "red", number: -1, amount: 50 },
          ],
        },
      },
      rtResultNumber: 7,
      rtSpunByUid: "player-2",
    },
  });

  const settlements = computeRouletteTableSettlements(room, "host-1");

  assert.equal(settlements.length, 1);
  assert.equal(settlements[0].key, "room-table:4:net:host-1");
  // Plein 7 : 100 x 36 = 3600 ; rouge (7 est rouge) : 50 x 2 = 100 ; net = 3700 - 150.
  assert.equal(settlements[0].delta, 3550);
});

test("computeRouletteTableSettlements emet un net negatif quand tout est perdu", () => {
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "results",
      rtRoundId: 5,
      rtBets: {
        "host-1": {
          displayName: "Hote",
          photoURL: "",
          total: 150,
          bets: [
            { kind: "straight", number: 7, amount: 100 },
            { kind: "red", number: -1, amount: 50 },
          ],
        },
      },
      rtResultNumber: 8,
    },
  });

  const settlements = computeRouletteTableSettlements(room, "host-1");

  assert.equal(settlements.length, 1);
  assert.equal(settlements[0].key, "room-table:5:net:host-1");
  assert.equal(settlements[0].delta, -150);
});

test("computeRouletteTableSettlements lit rtLastResults quand la phase results a ete manquee", () => {
  // Le round suivant a deja demarre : rtBets est vide, mais rtLastResults conserve
  // le resultat du tour precedent jusqu'au prochain spin.
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "betting",
      rtRoundId: 5,
      rtBets: {},
      rtResultNumber: -1,
      rtLastResults: {
        roundId: 4,
        outcomes: {
          "host-1": { stake: 150, payout: 3700 },
          "player-2": { stake: 200, payout: 0 },
        },
      },
    },
  });

  const winner = computeRouletteTableSettlements(room, "host-1");
  assert.equal(winner.length, 1);
  assert.equal(winner[0].key, "room-table:4:net:host-1");
  assert.equal(winner[0].delta, 3550);

  const loser = computeRouletteTableSettlements(room, "player-2");
  assert.equal(loser.length, 1);
  assert.equal(loser[0].key, "room-table:4:net:player-2");
  assert.equal(loser[0].delta, -200);
});

test("computeRouletteTableSettlements ne duplique pas le tour courant present dans rtLastResults", () => {
  const room = makeRouletteTableRoom({
    raw: {
      rtPhase: "results",
      rtRoundId: 4,
      rtBets: {
        "host-1": { displayName: "Hote", photoURL: "", total: 50, bets: [{ kind: "red", number: -1, amount: 50 }] },
      },
      rtResultNumber: 7,
      rtLastResults: { roundId: 4, outcomes: { "host-1": { stake: 50, payout: 100 } } },
    },
  });

  const settlements = computeRouletteTableSettlements(room, "host-1");
  assert.equal(settlements.length, 1);
  assert.equal(settlements[0].key, "room-table:4:net:host-1");
  assert.equal(settlements[0].delta, 50);
});

test("computeRouletteTableSettlements ignore les autres joueurs, les nets nuls et les autres types", () => {
  const raw = {
    rtPhase: "results",
    rtRoundId: 2,
    rtBets: {
      "host-1": { displayName: "Hote", photoURL: "", total: 25, bets: [{ kind: "even", number: -1, amount: 25 }] },
    },
    rtResultNumber: 12,
  };

  assert.deepEqual(computeRouletteTableSettlements(makeRouletteTableRoom({ raw }), "player-2"), []);
  assert.deepEqual(computeRouletteTableSettlements(makeRouletteTableRoom({ type: "duel", raw }), "host-1"), []);

  // Net nul (payout == stake) : aucun mouvement, aucune entree.
  const neutral = makeRouletteTableRoom({
    raw: { rtPhase: "betting", rtRoundId: 3, rtBets: {}, rtLastResults: { roundId: 2, outcomes: { "host-1": { stake: 100, payout: 100 } } } },
  });
  assert.deepEqual(computeRouletteTableSettlements(neutral, "host-1"), []);

  // rtLastResults corrompu : ignore.
  const corrupted = makeRouletteTableRoom({
    raw: { rtPhase: "betting", rtRoundId: 3, rtLastResults: { roundId: 0, outcomes: { "host-1": { stake: 100, payout: 300 } } } },
  });
  assert.deepEqual(computeRouletteTableSettlements(corrupted, "host-1"), []);
});
