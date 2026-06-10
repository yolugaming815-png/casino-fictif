import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import type { CasinoUser, OnlineRoomEntry } from "./firebaseClient";
import type { Settlement } from "./onlineSettlement";

export const RUSSIAN_SIDE_BET_MIN = 25;
export const RUSSIAN_SIDE_BET_MAX = 10000;

export type RussianSideBet = {
  spectatorUid: string;
  displayName: string;
  targetUid: string;
  targetName: string;
  amount: number;
  odds: number;
  round: number;
};

export function parseRussianSideBets(room: OnlineRoomEntry): RussianSideBet[] {
  const rawSideBets = room.raw.russianSideBets && typeof room.raw.russianSideBets === "object" ? (room.raw.russianSideBets as Record<string, unknown>) : {};

  return Object.entries(rawSideBets).flatMap(([spectatorUid, value]) => {
    if (!value || typeof value !== "object") {
      return [];
    }

    const bet = value as Record<string, unknown>;
    const amount = typeof bet.amount === "number" && Number.isFinite(bet.amount) ? Math.floor(bet.amount) : 0;
    const odds = typeof bet.odds === "number" && Number.isFinite(bet.odds) ? Math.floor(bet.odds) : 0;

    if (typeof bet.targetUid !== "string" || !bet.targetUid || amount <= 0 || odds <= 0) {
      return [];
    }

    return [
      {
        spectatorUid,
        displayName: typeof bet.displayName === "string" && bet.displayName ? bet.displayName : "Spectateur anonyme",
        targetUid: bet.targetUid,
        targetName: typeof bet.targetName === "string" ? bet.targetName : "",
        amount,
        odds,
        round: typeof bet.round === "number" && Number.isFinite(bet.round) ? Math.max(1, Math.floor(bet.round)) : 1,
      },
    ];
  });
}

export async function placeRussianSideBet(room: OnlineRoomEntry, user: CasinoUser, targetUid: string, amount: number): Promise<void> {
  // Import dynamique : firebaseClient depend de import.meta.env (Vite) et casse l'execution sous node:test.
  const { getCasinoDb, parseOnlineRoom } = await import("./firebaseClient");
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  const betAmount = Math.floor(Number(amount));

  if (!Number.isFinite(betAmount) || betAmount < RUSSIAN_SIDE_BET_MIN || betAmount > RUSSIAN_SIDE_BET_MAX) {
    throw new Error(`Le pari spectateur doit etre entre ${RUSSIAN_SIDE_BET_MIN} et ${RUSSIAN_SIDE_BET_MAX.toLocaleString("fr-FR")} credits.`);
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette partie n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());

    if (freshRoom.type !== "russian-roulette" || freshRoom.status !== "playing") {
      throw new Error("Cette roulette russe n'est pas en cours.");
    }

    if (freshRoom.playerIds.includes(user.uid)) {
      throw new Error("Les joueurs de la partie ne peuvent pas parier en spectateur.");
    }

    if (!freshRoom.russianAliveUids.includes(targetUid)) {
      throw new Error("Ce joueur n'est plus en lice.");
    }

    if (parseRussianSideBets(freshRoom).some((bet) => bet.spectatorUid === user.uid)) {
      throw new Error("Tu as deja place un pari spectateur sur cette partie.");
    }

    const target = freshRoom.players.find((player) => player.uid === targetUid);

    transaction.update(roomRef, {
      [`russianSideBets.${user.uid}`]: {
        displayName: user.displayName || "Spectateur anonyme",
        targetUid,
        targetName: target?.displayName ?? "",
        amount: betAmount,
        odds: freshRoom.russianAliveUids.length,
        round: Math.max(1, Math.floor(freshRoom.russianRound || 1)),
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export function computeRussianSideBetSettlements(room: OnlineRoomEntry, uid: string): Settlement[] {
  if (room.type !== "russian-roulette") {
    return [];
  }

  const bet = parseRussianSideBets(room).find((sideBet) => sideBet.spectatorUid === uid);

  if (!bet) {
    return [];
  }

  const targetLabel = bet.targetName || "un joueur";
  const settlements: Settlement[] = [
    {
      key: `${room.id}:sidebet:${uid}`,
      delta: -bet.amount,
      message: `Pari spectateur place : ${bet.amount.toLocaleString("fr-FR")} credits sur ${targetLabel}.`,
    },
  ];

  if (room.status === "finished" && room.winnerUid && bet.targetUid === room.winnerUid) {
    const payout = bet.amount * bet.odds;
    settlements.push({
      key: `${room.id}:sidebet-result:${uid}`,
      delta: payout,
      message: `Pari spectateur gagne : ${targetLabel} survit, tu remportes ${payout.toLocaleString("fr-FR")} credits (x${bet.odds}).`,
    });
  }

  return settlements;
}
