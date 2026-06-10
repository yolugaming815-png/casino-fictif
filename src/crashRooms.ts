import { addDoc, collection, deleteField, doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  buildBaseRoomDoc,
  getCasinoDb,
  onlineTimestampToMillis,
  parseOnlineRoom,
  toOnlineRoomPlayer,
  type CasinoUser,
  type OnlineRoomEntry,
} from "./firebaseClient";
import { CRASH_MAX_POINT, crashCommitment, crashMultiplierAt, drawCrashPoint, normalizeCrashPoint, randomCrashSalt } from "./crashMath";
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

export type CrashRoundOutcome = {
  amount: number;
  payout: number;
  win: boolean;
};

/**
 * Resultat durable de la DERNIERE manche resolue (revelee ou annulee).
 * Ecrit dans le doc room par revealCrashRound/voidCrashRound, il survit au
 * round suivant (jusqu'au prochain reveal) pour qu'un client qui a manque le
 * snapshot "revealed" puisse quand meme appliquer son reglement net.
 */
export type CrashLastResults = {
  roundId: number;
  outcomes: Record<string, CrashRoundOutcome>;
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
  lastResults: CrashLastResults | null;
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

function parseCrashLastResults(value: unknown): CrashLastResults | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const roundId = typeof raw.roundId === "number" && Number.isFinite(raw.roundId) ? Math.floor(raw.roundId) : 0;
  if (roundId < 1) {
    return null;
  }

  const rawOutcomes = raw.outcomes && typeof raw.outcomes === "object" ? (raw.outcomes as Record<string, unknown>) : {};
  const outcomes: Record<string, CrashRoundOutcome> = {};

  for (const [uid, rawOutcome] of Object.entries(rawOutcomes)) {
    if (!uid || !rawOutcome || typeof rawOutcome !== "object") {
      continue;
    }

    const outcome = rawOutcome as Record<string, unknown>;
    const amount = typeof outcome.amount === "number" && Number.isFinite(outcome.amount) ? Math.floor(outcome.amount) : 0;
    const payout = typeof outcome.payout === "number" && Number.isFinite(outcome.payout) ? Math.floor(outcome.payout) : 0;

    if (amount <= 0 || payout < 0) {
      continue;
    }

    outcomes[uid] = { amount, payout, win: outcome.win === true };
  }

  return { roundId, outcomes };
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
    lastResults: parseCrashLastResults(data.crashLastResults),
  };
}

export async function createCrashRoom(user: CasinoUser): Promise<string | null> {
  const db = getCasinoDb();
  if (!db) {
    return null;
  }

  // Les rules imposent status "waiting" a la creation : on cree le squelette conforme
  // puis on passe la table en "playing" via une update immediate (pattern roulette-table).
  // crashStartAt est volontairement OMIS : on n'ecrit jamais null dans un champ crash*
  // (les rules valident `crashStartAt is timestamp` des que la cle existe).
  const room = await addDoc(collection(db, "onlineRooms"), {
    ...buildBaseRoomDoc(user, "crash", "Crash", CRASH_MAX_PLAYERS),
    crashPhase: "betting",
    crashRoundId: 1,
    crashBettingStartedAt: serverTimestamp(),
    crashHash: "",
    crashPoint: 0,
    crashSalt: "",
    crashVoided: false,
    crashResolverUid: user.uid,
    crashHostHeartbeatAt: serverTimestamp(),
    crashBets: {},
    crashHistory: [],
  });

  await updateDoc(doc(db, "onlineRooms", room.id), {
    status: "playing",
    updatedAt: serverTimestamp(),
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

  // Normalisation canonique en centiemes (Math.round, JAMAIS Math.floor) : un point deja
  // arrondi du type 1.13 (112.999... * 100 en flottant) reste 1.13 et le hash correspond.
  if (!Number.isFinite(Number(crashPoint))) {
    throw new Error("Point de crash invalide.");
  }
  const normalizedPoint = normalizeCrashPoint(crashPoint);

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
    const outcomes: Record<string, CrashRoundOutcome> = {};
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
      const payout = win ? Math.floor(bet.amount * finalMultiplier) : 0;
      betUpdates[`crashBets.${uid}.finalMultiplier`] = finalMultiplier;
      betUpdates[`crashBets.${uid}.payout`] = payout;
      betUpdates[`crashBets.${uid}.win`] = win;
      outcomes[uid] = { amount: bet.amount, payout, win };
    }

    transaction.update(roomRef, {
      ...betUpdates,
      crashPhase: "revealed",
      crashPoint: normalizedPoint,
      crashSalt: salt,
      crashVoided: false,
      // Resultat durable : survit au round suivant pour les clients qui manquent le snapshot.
      crashLastResults: { roundId: view.roundId, outcomes },
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
      // Jamais null dans un champ crash* : on supprime la cle, les rules valident l'absence.
      crashStartAt: deleteField(),
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

    // Manche annulee : payout = amount (net 0). Comme plus aucun debit n'est anticipe,
    // aucun reglement ne sera emis pour ce round — le doc garde quand meme la trace.
    const outcomes: Record<string, CrashRoundOutcome> = Object.fromEntries(
      Object.entries(view.bets).map(([uid, bet]) => [uid, { amount: bet.amount, payout: bet.amount, win: false }]),
    );

    transaction.update(roomRef, {
      crashPhase: "revealed",
      crashVoided: true,
      crashPoint: 0,
      crashSalt: "",
      crashLastResults: { roundId: view.roundId, outcomes },
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

/**
 * Reglement NET-AT-RESULT : aucun debit a la pose de la mise. Un SEUL reglement
 * net par manche et par joueur (delta = payout - mise, eventuellement negatif),
 * emis quand le resultat est durablement observable : phase "revealed" du round
 * courant OU crashLastResults (qui survit au round suivant). Une manche annulee
 * a payout = mise (net 0) et n'emet donc rien.
 */
export function computeCrashSettlements(room: OnlineRoomEntry, uid: string): Settlement[] {
  if (room.type !== "crash") {
    return [];
  }

  const view = parseCrashRoom(room);
  const outcomes = new Map<string, CrashRoundOutcome>();

  const bet = view.bets[uid];
  if (view.phase === "revealed" && bet) {
    const payout = view.voided ? bet.amount : bet.payout;
    outcomes.set(`${room.id}:${view.roundId}:net:${uid}`, { amount: bet.amount, payout, win: !view.voided && bet.win });
  }

  const lastOutcome = view.lastResults?.outcomes[uid];
  if (view.lastResults && lastOutcome) {
    // Meme round : meme cle, meme contenu — le Map dedoublonne naturellement.
    outcomes.set(`${room.id}:${view.lastResults.roundId}:net:${uid}`, lastOutcome);
  }

  const settlements: Settlement[] = [];
  for (const [key, outcome] of outcomes) {
    const delta = outcome.payout - outcome.amount;
    if (delta === 0) {
      continue;
    }

    settlements.push({
      key,
      delta,
      message:
        delta > 0
          ? `Crash : cash-out gagnant, +${delta} jetons nets (mise de ${outcome.amount}).`
          : `Crash : mise de ${outcome.amount} jetons perdue.`,
    });
  }

  return settlements;
}
