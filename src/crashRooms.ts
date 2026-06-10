import { addDoc, collection, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  buildBaseRoomDoc,
  getCasinoDb,
  onlineTimestampToMillis,
  parseOnlineRoom,
  toOnlineRoomPlayer,
  type CasinoUser,
  type OnlineRoomEntry,
} from "./firebaseClient";
import { CRASH_MAX_POINT, crashCommitment, crashMultiplierAt, drawCrashPoint, randomCrashSalt } from "./crashMath";
import type { Settlement } from "./onlineSettlement";

export type CrashPhase = "betting" | "flying" | "revealed";

export type CrashBetView = {
  uid: string;
  displayName: string;
  amount: number;
  autoCashout: number;
  placedAtMs: number | null;
  cashedOutAtMs: number | null;
  finalMultiplier: number;
  payout: number;
  win: boolean;
};

export type CrashHistoryEntry = {
  roundId: number;
  crashPoint: number;
};

export type CrashRoomView = {
  phase: CrashPhase;
  roundId: number;
  bettingStartedAtMs: number | null;
  startAtMs: number | null;
  hash: string;
  crashPoint: number;
  salt: string;
  voided: boolean;
  resolverUid: string;
  hostHeartbeatAtMs: number | null;
  bets: Record<string, CrashBetView>;
  history: CrashHistoryEntry[];
};

export type CrashSecret = {
  crashPoint: number;
  salt: string;
};

export const CRASH_MIN_BET = 10;
export const CRASH_MAX_BET = 100000;
export const CRASH_HEARTBEAT_STALE_MS = 20 * 1000;
export const CRASH_MAX_FLYING_MS = 60 * 1000;

const CRASH_MAX_PLAYERS = 8;
const CRASH_HISTORY_LIMIT = 12;
const CRASH_SECRET_STORAGE_PREFIX = "casino-crash-secret";

const crashSecretsInMemory = new Map<string, CrashSecret>();

function getLocalStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

function crashSecretKey(roomId: string, roundId: number) {
  return `${CRASH_SECRET_STORAGE_PREFIX}:${roomId}:${roundId}`;
}

function rememberCrashSecret(roomId: string, roundId: number, secret: CrashSecret) {
  crashSecretsInMemory.set(crashSecretKey(roomId, roundId), secret);

  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(crashSecretKey(roomId, roundId), JSON.stringify(secret));
  } catch {
    // Stockage indisponible : le secret reste en memoire pour la session courante.
  }
}

export function loadCrashSecret(roomId: string, roundId: number): CrashSecret | null {
  const inMemory = crashSecretsInMemory.get(crashSecretKey(roomId, roundId));
  if (inMemory) {
    return inMemory;
  }

  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(crashSecretKey(roomId, roundId));
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.crashPoint !== "number" || !Number.isFinite(candidate.crashPoint) || typeof candidate.salt !== "string") {
      return null;
    }

    return { crashPoint: candidate.crashPoint, salt: candidate.salt };
  } catch {
    return null;
  }
}

function parseCrashBets(value: unknown): Record<string, CrashBetView> {
  const rawBets = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return Object.fromEntries(
    Object.entries(rawBets)
      .map(([uid, rawBet]) => {
        const parsedBet = rawBet && typeof rawBet === "object" ? (rawBet as Record<string, unknown>) : {};
        return [
          uid,
          {
            uid,
            displayName: typeof parsedBet.displayName === "string" ? parsedBet.displayName : "Joueur anonyme",
            amount: typeof parsedBet.amount === "number" && Number.isFinite(parsedBet.amount) ? parsedBet.amount : 0,
            autoCashout: typeof parsedBet.autoCashout === "number" && Number.isFinite(parsedBet.autoCashout) ? parsedBet.autoCashout : 0,
            placedAtMs: onlineTimestampToMillis(parsedBet.placedAt),
            cashedOutAtMs: onlineTimestampToMillis(parsedBet.cashedOutAt),
            finalMultiplier:
              typeof parsedBet.finalMultiplier === "number" && Number.isFinite(parsedBet.finalMultiplier) ? parsedBet.finalMultiplier : 0,
            payout: typeof parsedBet.payout === "number" && Number.isFinite(parsedBet.payout) ? parsedBet.payout : 0,
            win: parsedBet.win === true,
          } satisfies CrashBetView,
        ];
      })
      .filter((entry): entry is [string, CrashBetView] => typeof entry[0] === "string" && (entry[1] as CrashBetView).amount > 0),
  );
}

export function parseCrashRoom(room: OnlineRoomEntry): CrashRoomView {
  const data = room.raw;
  const phase: CrashPhase = data.crashPhase === "flying" || data.crashPhase === "revealed" ? data.crashPhase : "betting";
  const history = Array.isArray(data.crashHistory)
    ? data.crashHistory
        .map((entry) => {
          const parsedEntry = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          return {
            roundId: typeof parsedEntry.roundId === "number" && Number.isFinite(parsedEntry.roundId) ? parsedEntry.roundId : 0,
            crashPoint: typeof parsedEntry.crashPoint === "number" && Number.isFinite(parsedEntry.crashPoint) ? parsedEntry.crashPoint : 0,
          };
        })
        .filter((entry) => entry.roundId > 0)
        .slice(-CRASH_HISTORY_LIMIT)
    : [];

  return {
    phase,
    roundId: typeof data.crashRoundId === "number" && Number.isFinite(data.crashRoundId) ? Math.max(1, Math.floor(data.crashRoundId)) : 1,
    bettingStartedAtMs: onlineTimestampToMillis(data.crashBettingStartedAt),
    startAtMs: onlineTimestampToMillis(data.crashStartAt),
    hash: typeof data.crashHash === "string" ? data.crashHash : "",
    crashPoint: typeof data.crashPoint === "number" && Number.isFinite(data.crashPoint) ? data.crashPoint : 0,
    salt: typeof data.crashSalt === "string" ? data.crashSalt : "",
    voided: data.crashVoided === true,
    resolverUid: typeof data.crashResolverUid === "string" && data.crashResolverUid ? data.crashResolverUid : room.hostUid,
    hostHeartbeatAtMs: onlineTimestampToMillis(data.crashHostHeartbeatAt),
    bets: parseCrashBets(data.crashBets),
    history,
  };
}

export async function createCrashRoom(user: CasinoUser): Promise<string | null> {
  const db = getCasinoDb();
  if (!db) {
    return null;
  }

  const room = await addDoc(collection(db, "onlineRooms"), {
    ...buildBaseRoomDoc(user, "crash", "Crash", CRASH_MAX_PLAYERS),
    status: "playing",
    crashPhase: "betting",
    crashRoundId: 1,
    crashBettingStartedAt: serverTimestamp(),
    crashStartAt: null,
    crashHash: "",
    crashPoint: 0,
    crashSalt: "",
    crashVoided: false,
    crashResolverUid: user.uid,
    crashHostHeartbeatAt: serverTimestamp(),
    crashBets: {},
    crashHistory: [],
  });

  return room.id;
}

export async function placeCrashBet(room: OnlineRoomEntry, user: CasinoUser, amount: number, autoCashout = 0): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  const bet = Math.floor(Number(amount));
  if (!Number.isFinite(bet) || bet < CRASH_MIN_BET || bet > CRASH_MAX_BET) {
    throw new Error(`La mise crash doit etre entre ${CRASH_MIN_BET} et ${CRASH_MAX_BET} jetons.`);
  }

  const rawAutoCashout = Number(autoCashout);
  const normalizedAutoCashout =
    Number.isFinite(rawAutoCashout) && rawAutoCashout >= 1.01 ? Math.min(CRASH_MAX_POINT, Math.floor(rawAutoCashout * 100) / 100) : 0;

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "betting") {
      throw new Error("Les mises sont fermees pour cette manche.");
    }

    if (view.bets[user.uid]) {
      throw new Error("Tu as deja mise sur cette manche.");
    }

    const alreadySeated = freshRoom.players.some((player) => player.uid === user.uid);
    if (!alreadySeated && freshRoom.players.length >= freshRoom.maxPlayers) {
      throw new Error("Cette table crash est deja complete.");
    }

    const player = toOnlineRoomPlayer(user);

    transaction.update(roomRef, {
      players: alreadySeated ? freshRoom.players : [...freshRoom.players, player],
      playerIds: Array.from(new Set([...freshRoom.playerIds, user.uid])),
      [`crashBets.${user.uid}`]: {
        displayName: player.displayName,
        amount: bet,
        placedAt: serverTimestamp(),
        autoCashout: normalizedAutoCashout,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startCrashRound(room: OnlineRoomEntry, user: CasinoUser): Promise<{ crashPoint: number; salt: string }> {
  const db = getCasinoDb();
  if (!db) {
    throw new Error("Firebase n'est pas configure.");
  }

  const crashPoint = drawCrashPoint();
  const salt = randomCrashSalt();
  const hash = await crashCommitment(crashPoint, salt);

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "betting") {
      throw new Error("La manche crash est deja lancee.");
    }

    if (view.resolverUid !== user.uid) {
      throw new Error("Seul le resolveur peut lancer la manche.");
    }

    if (!Object.keys(view.bets).length) {
      throw new Error("Au moins une mise est requise pour lancer la manche.");
    }

    rememberCrashSecret(room.id, view.roundId, { crashPoint, salt });

    transaction.update(roomRef, {
      crashPhase: "flying",
      crashStartAt: serverTimestamp(),
      crashHash: hash,
      crashPoint: 0,
      crashSalt: "",
      crashVoided: false,
      crashHostHeartbeatAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return { crashPoint, salt };
}

export async function pingCrashHeartbeat(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  if (parseCrashRoom(room).resolverUid !== user.uid) {
    return;
  }

  await updateDoc(doc(db, "onlineRooms", room.id), {
    crashHostHeartbeatAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cashOutCrash(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "flying" || view.voided) {
      throw new Error("Le cash-out n'est plus possible.");
    }

    const bet = view.bets[user.uid];
    if (!bet) {
      throw new Error("Tu n'as pas mise sur cette manche.");
    }

    if (bet.cashedOutAtMs !== null) {
      throw new Error("Tu as deja encaisse sur cette manche.");
    }

    transaction.update(roomRef, {
      [`crashBets.${user.uid}.cashedOutAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function revealCrashRound(room: OnlineRoomEntry, user: CasinoUser, crashPoint: number, salt: string): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  const normalizedPoint = Math.min(CRASH_MAX_POINT, Math.max(1, Math.floor(Number(crashPoint) * 100) / 100));
  if (!Number.isFinite(normalizedPoint)) {
    throw new Error("Point de crash invalide.");
  }

  const expectedHash = await crashCommitment(normalizedPoint, salt);

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "flying" || view.voided) {
      throw new Error("Cette manche crash n'est pas en vol.");
    }

    if (view.resolverUid !== user.uid) {
      throw new Error("Seul le resolveur peut reveler la manche.");
    }

    if (view.hash && expectedHash !== view.hash) {
      throw new Error("Le point de crash ne correspond pas a l'engagement publie.");
    }

    if (view.startAtMs === null) {
      throw new Error("Le depart de la manche est introuvable.");
    }

    const betUpdates: Record<string, number | boolean> = {};
    for (const [uid, bet] of Object.entries(view.bets)) {
      const manualMultiplier = bet.cashedOutAtMs !== null ? crashMultiplierAt(bet.cashedOutAtMs - view.startAtMs) : null;
      const manualValid = manualMultiplier !== null && manualMultiplier < normalizedPoint;
      const autoValid = bet.autoCashout > 0 && bet.autoCashout < normalizedPoint;

      let finalMultiplier = 0;
      if (autoValid && manualValid) {
        finalMultiplier = Math.min(bet.autoCashout, manualMultiplier);
      } else if (autoValid) {
        finalMultiplier = bet.autoCashout;
      } else if (manualValid) {
        finalMultiplier = manualMultiplier;
      }

      const win = finalMultiplier > 0;
      betUpdates[`crashBets.${uid}.finalMultiplier`] = finalMultiplier;
      betUpdates[`crashBets.${uid}.payout`] = win ? Math.floor(bet.amount * finalMultiplier) : 0;
      betUpdates[`crashBets.${uid}.win`] = win;
    }

    transaction.update(roomRef, {
      ...betUpdates,
      crashPhase: "revealed",
      crashPoint: normalizedPoint,
      crashSalt: salt,
      crashVoided: false,
      crashHistory: [...view.history, { roundId: view.roundId, crashPoint: normalizedPoint }].slice(-CRASH_HISTORY_LIMIT),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startNextCrashBettingPhase(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "revealed") {
      throw new Error("La manche en cours n'est pas terminee.");
    }

    if (view.resolverUid !== user.uid) {
      throw new Error("Seul le resolveur peut relancer une manche.");
    }

    transaction.update(roomRef, {
      crashPhase: "betting",
      crashRoundId: view.roundId + 1,
      crashBettingStartedAt: serverTimestamp(),
      crashStartAt: null,
      crashHash: "",
      crashPoint: 0,
      crashSalt: "",
      crashVoided: false,
      crashBets: {},
      updatedAt: serverTimestamp(),
    });
  });
}

export async function voidCrashRound(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash" || view.phase !== "flying" || view.voided) {
      throw new Error("Aucune manche crash a annuler.");
    }

    if (!freshRoom.playerIds.includes(user.uid)) {
      throw new Error("Seul un joueur de la table peut annuler la manche.");
    }

    const now = Date.now();
    const heartbeatStale = view.hostHeartbeatAtMs === null || now - view.hostHeartbeatAtMs > CRASH_HEARTBEAT_STALE_MS;
    const flightTooLong = view.startAtMs !== null && now - view.startAtMs > CRASH_MAX_FLYING_MS;

    if (view.resolverUid !== user.uid && !heartbeatStale && !flightTooLong) {
      throw new Error("Le resolveur est encore actif : impossible d'annuler la manche.");
    }

    transaction.update(roomRef, {
      crashPhase: "revealed",
      crashVoided: true,
      crashPoint: 0,
      crashSalt: "",
      updatedAt: serverTimestamp(),
    });
  });
}

export async function takeOverCrashResolver(room: OnlineRoomEntry, user: CasinoUser): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "onlineRooms", room.id);
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Cette table crash n'existe plus.");
    }

    const freshRoom = parseOnlineRoom(snapshot.id, snapshot.data());
    const view = parseCrashRoom(freshRoom);

    if (freshRoom.type !== "crash") {
      throw new Error("Cette table n'est pas une table crash.");
    }

    if (!freshRoom.playerIds.includes(user.uid)) {
      throw new Error("Seul un joueur de la table peut devenir resolveur.");
    }

    if (view.resolverUid === user.uid) {
      return;
    }

    const now = Date.now();
    const heartbeatStale = view.hostHeartbeatAtMs === null || now - view.hostHeartbeatAtMs > CRASH_HEARTBEAT_STALE_MS;
    const resolverGone = !freshRoom.playerIds.includes(view.resolverUid);

    if (!view.voided && !heartbeatStale && !resolverGone) {
      throw new Error("Le resolveur actuel est encore actif.");
    }

    transaction.update(roomRef, {
      crashResolverUid: user.uid,
      crashHostHeartbeatAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export function computeCrashSettlements(room: OnlineRoomEntry, uid: string): Settlement[] {
  if (room.type !== "crash") {
    return [];
  }

  const view = parseCrashRoom(room);
  const bet = view.bets[uid];
  if (!bet) {
    return [];
  }

  const settlements: Settlement[] = [
    {
      key: `${room.id}:${view.roundId}:bet:${uid}`,
      delta: -bet.amount,
      message: `Mise crash de ${bet.amount} jetons engagee.`,
    },
  ];

  if (view.phase === "revealed") {
    if (view.voided) {
      settlements.push({
        key: `${room.id}:${view.roundId}:result:${uid}`,
        delta: bet.amount,
        message: `Manche crash annulee : ${bet.amount} jetons rembourses.`,
      });
    } else if (bet.win && bet.payout > 0) {
      settlements.push({
        key: `${room.id}:${view.roundId}:result:${uid}`,
        delta: bet.payout,
        message: `Cash-out a x${bet.finalMultiplier.toFixed(2)} : +${bet.payout} jetons.`,
      });
    }
  }

  return settlements;
}
