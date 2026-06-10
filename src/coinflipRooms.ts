import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import type { CasinoUser, OnlineRoomEntry, OnlineRoomPlayer } from "./firebaseClient";
import type { Settlement } from "./onlineSettlement";

export const COINFLIP_MIN_BET = 25;
export const COINFLIP_MAX_PLAYERS = 2;
export const COINFLIP_GAME_NAME = "Pile ou face";

export type CoinflipSide = "heads" | "tails";
export type CoinflipResult = "" | CoinflipSide;

export type CoinflipRoomView = {
  bet: number;
  result: CoinflipResult;
  hostSide: CoinflipSide;
  challengerSide: CoinflipSide;
  winnerUid: string;
  winnerName: string;
};

// Import dynamique : firebaseClient lit import.meta.env au chargement, ce qui casse node:test.
// Les fonctions pures de ce module restent donc importables sans environnement Vite.
async function loadFirebaseClient() {
  return import("./firebaseClient");
}

export function sanitizeCoinflipBet(bet: number): number {
  const parsed = Math.floor(Number(bet));
  if (!Number.isFinite(parsed)) {
    return COINFLIP_MIN_BET;
  }

  return Math.max(COINFLIP_MIN_BET, parsed);
}

export function drawCoinflipResult(rng: () => number = Math.random): CoinflipSide {
  return rng() < 0.5 ? "heads" : "tails";
}

export function parseCoinflipRoom(room: OnlineRoomEntry): CoinflipRoomView {
  const rawBet = room.raw.coinflipBet;
  const rawResult = room.raw.coinflipResult;

  return {
    bet: typeof rawBet === "number" && Number.isFinite(rawBet) ? Math.max(COINFLIP_MIN_BET, Math.floor(rawBet)) : COINFLIP_MIN_BET,
    result: rawResult === "heads" || rawResult === "tails" ? rawResult : "",
    hostSide: "heads",
    challengerSide: "tails",
    winnerUid: room.winnerUid ?? "",
    winnerName: room.winnerName ?? "",
  };
}

export async function createCoinflipRoom(user: CasinoUser, bet: number, invitedPlayer?: OnlineRoomPlayer): Promise<string | null> {
  const { buildBaseRoomDoc, getCasinoDb } = await loadFirebaseClient();
  const db = getCasinoDb();
  if (!db) {
    return null;
  }

  const room = await addDoc(collection(db, "onlineRooms"), {
    ...buildBaseRoomDoc(user, "coinflip", COINFLIP_GAME_NAME, COINFLIP_MAX_PLAYERS, invitedPlayer),
    coinflipBet: sanitizeCoinflipBet(bet),
    coinflipResult: "",
  });

  return room.id;
}

export async function joinAndFlipCoinflip(room: OnlineRoomEntry, user: CasinoUser, rng: () => number = Math.random): Promise<void> {
  const { getCasinoDb, toOnlineRoomPlayer } = await loadFirebaseClient();
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  if (room.hostUid === user.uid) {
    throw new Error("Tu ne peux pas jouer contre toi-meme.");
  }

  if (room.invitedUid && room.invitedUid !== user.uid) {
    throw new Error("Ce pile ou face est prive.");
  }

  const challenger = toOnlineRoomPlayer(user);

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists()) {
      throw new Error("Ce salon n'existe plus.");
    }

    const data = snapshot.data() as Record<string, unknown>;
    const players = Array.isArray(data.players) ? (data.players as OnlineRoomPlayer[]) : [];
    if (data.status !== "waiting" || players.length !== 1) {
      throw new Error("Ce pile ou face est deja lance.");
    }

    if (players.some((player) => player.uid === user.uid)) {
      throw new Error("Tu es deja dans ce salon.");
    }

    const host = players[0];
    const result = drawCoinflipResult(rng);
    const winner = result === "heads" ? host : challenger;

    transaction.update(roomRef, {
      players: [host, challenger],
      playerIds: Array.from(new Set([host.uid, challenger.uid])),
      status: "finished",
      coinflipResult: result,
      winnerUid: winner.uid,
      winnerName: winner.displayName,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Reglement NET-AT-RESULT : un SEUL reglement net par joueur, emis uniquement au
 * statut "finished" (gagnant +mise, perdant -mise). Aucun debit en "waiting" :
 * une room jamais rejointe (puis supprimee) ne coute donc rien a l'hote.
 */
export function computeCoinflipSettlements(room: OnlineRoomEntry, uid: string): Settlement[] {
  if (room.type !== "coinflip" || room.status !== "finished" || !room.playerIds.includes(uid)) {
    return [];
  }

  const view = parseCoinflipRoom(room);
  if (view.result === "" || !view.winnerUid) {
    return [];
  }

  const won = view.winnerUid === uid;
  return [
    {
      key: `${room.id}:cf-net:${uid}`,
      delta: won ? view.bet : -view.bet,
      message: won
        ? `Pile ou face : tu gagnes ${view.bet} jetons !`
        : `Pile ou face : tu perds ta mise de ${view.bet} jetons.`,
    },
  ];
}
