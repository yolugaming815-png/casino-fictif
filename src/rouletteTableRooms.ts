import { addDoc, collection, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import type { CasinoUser, OnlineRoomEntry } from "./firebaseClient";
import type { Settlement } from "./onlineSettlement";
import { evaluateRouletteBet, spinRouletteNumber, type RouletteBet, type RouletteBetKind } from "./rouletteLogic";

export const ROULETTE_TABLE_MAX_PLAYERS = 8;
export const ROULETTE_TABLE_BETTING_MS = 20 * 1000;
export const ROULETTE_TABLE_BETTING_GRACE_MS = 22 * 1000;
export const ROULETTE_TABLE_MAX_BETS_PER_PLAYER = 8;
export const ROULETTE_TABLE_HISTORY_LIMIT = 15;
export const ROULETTE_TABLE_BET_MIN = 1;
export const ROULETTE_TABLE_BET_MAX = 100000;

const ROULETTE_TABLE_BET_KINDS: readonly RouletteBetKind[] = [
  "straight",
  "red",
  "black",
  "even",
  "odd",
  "low",
  "high",
  "dozen1",
  "dozen2",
  "dozen3",
];

function isRouletteBetKind(value: unknown): value is RouletteBetKind {
  return typeof value === "string" && (ROULETTE_TABLE_BET_KINDS as readonly string[]).includes(value);
}

export type RouletteTablePhase = "betting" | "results";

export type RouletteTablePlacedBet = {
  kind: RouletteBetKind;
  number: number;
  amount: number;
};

export type RouletteTablePlayerBets = {
  uid: string;
  displayName: string;
  photoURL: string;
  total: number;
  bets: RouletteTablePlacedBet[];
};

export type RouletteTableRoomView = {
  phase: RouletteTablePhase;
  roundId: number;
  bettingStartedAt: unknown;
  bets: Record<string, RouletteTablePlayerBets>;
  resultNumber: number;
  spunByUid: string;
  history: number[];
};

function isRouletteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 36;
}

export function parseRouletteTableRoom(room: OnlineRoomEntry): RouletteTableRoomView {
  const data = room.raw;
  const rawBets = data.rtBets && typeof data.rtBets === "object" ? (data.rtBets as Record<string, unknown>) : {};
  const betEntries = Object.entries(rawBets).flatMap(([uid, value]): Array<[string, RouletteTablePlayerBets]> => {
    if (!uid || !value || typeof value !== "object") {
      return [];
    }

    const entry = value as Record<string, unknown>;
    const bets = Array.isArray(entry.bets)
      ? entry.bets.flatMap((bet): RouletteTablePlacedBet[] => {
          const parsedBet = bet && typeof bet === "object" ? (bet as Record<string, unknown>) : {};
          const amount = typeof parsedBet.amount === "number" && Number.isFinite(parsedBet.amount) ? Math.floor(parsedBet.amount) : 0;

          if (!isRouletteBetKind(parsedBet.kind) || amount <= 0) {
            return [];
          }

          return [
            {
              kind: parsedBet.kind,
              number: isRouletteNumber(parsedBet.number) ? parsedBet.number : -1,
              amount,
            },
          ];
        })
      : [];

    if (!bets.length) {
      return [];
    }

    return [
      [
        uid,
        {
          uid,
          displayName: typeof entry.displayName === "string" && entry.displayName ? entry.displayName : "Joueur anonyme",
          photoURL: typeof entry.photoURL === "string" ? entry.photoURL : "",
          total: bets.reduce((sum, bet) => sum + bet.amount, 0),
          bets,
        },
      ],
    ];
  });

  return {
    phase: data.rtPhase === "results" ? "results" : "betting",
    roundId: typeof data.rtRoundId === "number" && Number.isFinite(data.rtRoundId) ? Math.max(1, Math.floor(data.rtRoundId)) : 1,
    bettingStartedAt: data.rtBettingStartedAt ?? null,
    bets: Object.fromEntries(betEntries),
    resultNumber: isRouletteNumber(data.rtResultNumber) ? data.rtResultNumber : -1,
    spunByUid: typeof data.rtSpunByUid === "string" ? data.rtSpunByUid : "",
    history: Array.isArray(data.rtHistory) ? data.rtHistory.filter(isRouletteNumber).slice(-ROULETTE_TABLE_HISTORY_LIMIT) : [],
  };
}

export function countRouletteTableBets(view: RouletteTableRoomView): number {
  return Object.values(view.bets).reduce((sum, player) => sum + player.bets.length, 0);
}

export async function createRouletteTableRoom(user: CasinoUser): Promise<string | null> {
  // Import dynamique : firebaseClient depend de import.meta.env (Vite) et casse l'execution sous node:test.
  const { getCasinoDb, buildBaseRoomDoc } = await import("./firebaseClient");
  const db = getCasinoDb();
  if (!db) {
    return null;
  }

  const roomDoc = await addDoc(collection(db, "onlineRooms"), {
    ...buildBaseRoomDoc(user, "roulette-table", "Table roulette", ROULETTE_TABLE_MAX_PLAYERS),
    rtPhase: "betting",
    rtRoundId: 1,
    rtBettingStartedAt: serverTimestamp(),
    rtBets: {},
    rtResultNumber: -1,
    rtSpunByUid: "",
    rtHistory: [],
  });

  // Les rules imposent status "waiting" a la creation : la table passe en "playing" juste apres,
  // les mises sont ouvertes en continu et les joueurs rejoignent a tout moment.
  await updateDoc(doc(db, "onlineRooms", roomDoc.id), {
    status: "playing",
    updatedAt: serverTimestamp(),
  });

  return roomDoc.id;
}

export async function placeRouletteTableBet(room: OnlineRoomEntry, user: CasinoUser, bet: RouletteBet, amount: number): Promise<void> {
  const { getCasinoDb, parseOnlineRoom, onlineTimestampToMillis, toOnlineRoomPlayer } = await import("./firebaseClient");
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  const betAmount = Math.floor(Number(amount));

  if (!Number.isFinite(betAmount) || betAmount < ROULETTE_TABLE_BET_MIN || betAmount > ROULETTE_TABLE_BET_MAX) {
    throw new Error(`La mise doit etre entre ${ROULETTE_TABLE_BET_MIN} et ${ROULETTE_TABLE_BET_MAX.toLocaleString("fr-FR")} credits.`);
  }

  if (!isRouletteBetKind(bet.kind)) {
    throw new Error("Type de mise roulette inconnu.");
  }

  const betNumber = bet.kind === "straight" ? Math.floor(Number(bet.number)) : -1;

  if (bet.kind === "straight" && !isRouletteNumber(betNumber)) {
    throw new Error("Choisis un numero plein entre 0 et 36.");
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table de roulette n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());

    if (freshRoom.type !== "roulette-table" || freshRoom.status === "finished") {
      throw new Error("Cette table de roulette n'est plus ouverte.");
    }

    if (!freshRoom.playerIds.includes(user.uid)) {
      throw new Error("Rejoins la table avant de miser.");
    }

    const view = parseRouletteTableRoom(freshRoom);

    if (view.phase !== "betting") {
      throw new Error("Les mises sont fermees, attends le prochain tour.");
    }

    const startedAt = onlineTimestampToMillis(view.bettingStartedAt);

    if (startedAt !== null && Date.now() - startedAt >= ROULETTE_TABLE_BETTING_GRACE_MS) {
      throw new Error("Les mises sont fermees pour ce tour.");
    }

    const existing = view.bets[user.uid];
    const existingBets = existing?.bets ?? [];

    if (existingBets.length >= ROULETTE_TABLE_MAX_BETS_PER_PLAYER) {
      throw new Error(`Maximum ${ROULETTE_TABLE_MAX_BETS_PER_PLAYER} mises par joueur et par tour.`);
    }

    const player = toOnlineRoomPlayer(user);

    transaction.update(roomRef, {
      [`rtBets.${user.uid}`]: {
        displayName: player.displayName,
        photoURL: player.photoURL ?? "",
        total: (existing?.total ?? 0) + betAmount,
        bets: [...existingBets, { kind: bet.kind, number: betNumber, amount: betAmount }],
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function spinRouletteTable(room: OnlineRoomEntry, user: CasinoUser): Promise<number | null> {
  const { getCasinoDb, parseOnlineRoom, onlineTimestampToMillis } = await import("./firebaseClient");
  const db = getCasinoDb();
  if (!db) {
    return null;
  }

  let resultNumber: number | null = null;

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table de roulette n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());

    if (freshRoom.type !== "roulette-table" || freshRoom.status === "finished") {
      throw new Error("Cette table de roulette n'est plus ouverte.");
    }

    const view = parseRouletteTableRoom(freshRoom);

    // Guard tirage unique : seul un tour encore en phase "betting" peut etre tire.
    if (view.phase !== "betting") {
      throw new Error("Le tirage de ce tour a deja eu lieu.");
    }

    if (freshRoom.hostUid !== user.uid) {
      if (!freshRoom.playerIds.includes(user.uid)) {
        throw new Error("Rejoins la table avant de lancer la roulette.");
      }

      const startedAt = onlineTimestampToMillis(view.bettingStartedAt);
      const elapsed = startedAt === null ? 0 : Date.now() - startedAt;

      if (elapsed < ROULETTE_TABLE_BETTING_MS) {
        throw new Error("Attends la fin du compte a rebours avant de lancer la roulette.");
      }

      if (countRouletteTableBets(view) < 1) {
        throw new Error("Il faut au moins une mise pour lancer la roulette.");
      }
    }

    const number = spinRouletteNumber();

    transaction.update(roomRef, {
      rtPhase: "results",
      rtResultNumber: number,
      rtSpunByUid: user.uid,
      rtHistory: [...view.history, number].slice(-ROULETTE_TABLE_HISTORY_LIMIT),
      updatedAt: serverTimestamp(),
    });

    resultNumber = number;
  });

  return resultNumber;
}

export async function startNextRouletteTableRound(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const { getCasinoDb, parseOnlineRoom } = await import("./firebaseClient");
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table de roulette n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());

    if (freshRoom.type !== "roulette-table" || freshRoom.status === "finished") {
      throw new Error("Cette table de roulette n'est plus ouverte.");
    }

    if (!freshRoom.playerIds.includes(user.uid)) {
      throw new Error("Rejoins la table avant de relancer un tour.");
    }

    const view = parseRouletteTableRoom(freshRoom);

    if (view.phase !== "results") {
      throw new Error("Le tour en cours n'est pas termine.");
    }

    transaction.update(roomRef, {
      rtPhase: "betting",
      rtRoundId: view.roundId + 1,
      rtBettingStartedAt: serverTimestamp(),
      rtBets: {},
      rtResultNumber: -1,
      rtSpunByUid: "",
      updatedAt: serverTimestamp(),
    });
  });
}

function toRouletteBet(bet: RouletteTablePlacedBet): RouletteBet {
  return { kind: bet.kind, number: bet.number >= 0 ? bet.number : undefined };
}

function rouletteTableBetLabel(bet: RouletteTablePlacedBet): string {
  // evaluateRouletteBet est pur : on l'appelle avec une mise nulle juste pour recuperer le libelle.
  return evaluateRouletteBet(toRouletteBet(bet), 0, 0).label;
}

export function computeRouletteTableSettlements(room: OnlineRoomEntry, uid: string): Settlement[] {
  if (room.type !== "roulette-table") {
    return [];
  }

  const view = parseRouletteTableRoom(room);
  const playerBets = view.bets[uid];

  if (!playerBets) {
    return [];
  }

  const settlements: Settlement[] = playerBets.bets.map((bet, index) => ({
    key: `${room.id}:${view.roundId}:bet:${index}`,
    delta: -bet.amount,
    message: `Mise roulette placee : ${bet.amount.toLocaleString("fr-FR")} credits sur ${rouletteTableBetLabel(bet)}.`,
  }));

  if (view.phase === "results" && view.resultNumber >= 0) {
    const totalPayout = playerBets.bets.reduce(
      (sum, bet) => sum + evaluateRouletteBet(toRouletteBet(bet), bet.amount, view.resultNumber).payout,
      0,
    );

    if (totalPayout > 0) {
      settlements.push({
        key: `${room.id}:${view.roundId}:result`,
        delta: totalPayout,
        message: `Roulette : le ${view.resultNumber} sort, tu encaisses ${totalPayout.toLocaleString("fr-FR")} credits.`,
      });
    }
  }

  return settlements;
}
