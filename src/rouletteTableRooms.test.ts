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

test("computeRouletteTableSettlements debite chaque mise pendant la phase betting", () => {
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

  const settlements = computeRouletteTableSettlements(room, "host-1");

  assert.equal(settlements.length, 2);
  assert.equal(settlements[0].key, "room-table:4:bet:0");
  assert.equal(settlements[0].delta, -100);
  assert.equal(settlements[1].key, "room-table:4:bet:1");
  assert.equal(settlements[1].delta, -50);
});

test("computeRouletteTableSettlements credite la somme des payouts en phase results", () => {
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

  assert.equal(settlements.length, 3);
  assert.deepEqual(
    settlements.map((settlement) => settlement.key),
    ["room-table:4:bet:0", "room-table:4:bet:1", "room-table:4:result"],
  );
  // Plein 7 : 100 x 36 = 3600 ; rouge (7 est rouge) : 50 x 2 = 100.
  assert.equal(settlements[2].delta, 3700);
});

test("computeRouletteTableSettlements n'emet pas de credit quand tout est perdu", () => {
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

  assert.equal(settlements.length, 2);
  assert.ok(settlements.every((settlement) => settlement.delta < 0));
});

test("computeRouletteTableSettlements ignore les autres joueurs et les autres types de room", () => {
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
});
