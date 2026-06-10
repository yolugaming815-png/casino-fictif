import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ACTIVITY_EVENT_KINDS, type ActivityEvent } from "./activityEvents";
import { getCasinoDb } from "./firebaseClient";

export type SeasonRecord = {
  seasonKey: string;
  top: Array<{ uid: string; displayName: string; photoURL?: string; seasonNet: number }>;
  createdAt?: unknown;
};

const ACTIVITY_EVENTS_COLLECTION = "activityEvents";
const SEASONS_COLLECTION = "seasons";
const WEEKS_COLLECTION = "weeks";
const LEADERBOARD_COLLECTION = "leaderboard";
const PODIUM_SIZE = 3;
const CLEANUP_SCAN_EXTRA = 200;

function parseActivityEvent(id: string, data: Record<string, unknown>): ActivityEvent | null {
  const kind = ACTIVITY_EVENT_KINDS.find((candidate) => candidate === data.kind);
  const uid = typeof data.uid === "string" ? data.uid : "";
  const message = typeof data.message === "string" ? data.message : "";

  if (!kind || !uid || !message) {
    return null;
  }

  return {
    id,
    kind,
    uid,
    displayName: typeof data.displayName === "string" && data.displayName ? data.displayName : "Joueur anonyme",
    photoURL: typeof data.photoURL === "string" && data.photoURL ? data.photoURL : undefined,
    message,
    amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : undefined,
    game: typeof data.game === "string" && data.game ? data.game : undefined,
    level: typeof data.level === "number" && Number.isFinite(data.level) ? data.level : undefined,
    createdAt: data.createdAt,
  };
}

export async function publishActivityEvent(event: ActivityEvent): Promise<void> {
  const db = getCasinoDb();
  if (!db || !event.id) {
    return;
  }

  try {
    const payload = Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined));

    await setDoc(doc(db, ACTIVITY_EVENTS_COLLECTION, event.id), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Publication best-effort : un refus (regles, reseau) ne doit pas casser la partie en cours.
  }
}

export function subscribeActivityEvents(onChange: (events: ActivityEvent[]) => void, limitCount = 30): () => void {
  const db = getCasinoDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }

  const eventsQuery = query(
    collection(db, ACTIVITY_EVENTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(Math.max(1, Math.floor(limitCount))),
  );

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((eventDoc) => parseActivityEvent(eventDoc.id, eventDoc.data()))
          .filter((event): event is ActivityEvent => event !== null),
      );
    },
    () => {
      onChange([]);
    },
  );
}

export async function cleanupActivityEvents(keep = 100): Promise<void> {
  const db = getCasinoDb();
  if (!db) {
    return;
  }

  const keepCount = Math.max(0, Math.floor(keep));

  try {
    const eventsQuery = query(
      collection(db, ACTIVITY_EVENTS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(keepCount + CLEANUP_SCAN_EXTRA),
    );
    const snapshot = await getDocs(eventsQuery);
    const staleDocs = snapshot.docs.slice(keepCount);

    await Promise.allSettled(staleDocs.map((eventDoc) => deleteDoc(doc(db, ACTIVITY_EVENTS_COLLECTION, eventDoc.id))));
  } catch {
    // Nettoyage best-effort : les anciens evenements restants seront retentes plus tard.
  }
}

function parseSeasonRecord(id: string, data: Record<string, unknown>): SeasonRecord {
  const top = Array.isArray(data.top)
    ? data.top
        .map((entry) => {
          const parsedEntry = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};

          return {
            uid: typeof parsedEntry.uid === "string" ? parsedEntry.uid : "",
            displayName: typeof parsedEntry.displayName === "string" && parsedEntry.displayName ? parsedEntry.displayName : "Joueur anonyme",
            photoURL: typeof parsedEntry.photoURL === "string" && parsedEntry.photoURL ? parsedEntry.photoURL : undefined,
            seasonNet: typeof parsedEntry.seasonNet === "number" && Number.isFinite(parsedEntry.seasonNet) ? parsedEntry.seasonNet : 0,
          };
        })
        .filter((entry) => entry.uid)
    : [];

  return {
    seasonKey: typeof data.seasonKey === "string" && data.seasonKey ? data.seasonKey : id,
    top,
    createdAt: data.createdAt,
  };
}

async function archivePeriodIfNeeded(
  collectionName: string,
  periodKey: string,
  keyField: "seasonKey" | "weeklyKey",
  netField: "seasonNet" | "weeklyNet",
): Promise<void> {
  const db = getCasinoDb();
  if (!db || !periodKey) {
    return;
  }

  try {
    const recordRef = doc(db, collectionName, periodKey);
    const existing = await getDoc(recordRef);
    if (existing.exists()) {
      return;
    }

    const snapshot = await getDocs(collection(db, LEADERBOARD_COLLECTION));
    const top = snapshot.docs
      .map((entryDoc) => {
        const data = entryDoc.data() as Record<string, unknown>;
        const net = data[netField];

        return {
          uid: typeof data.uid === "string" ? data.uid : entryDoc.id,
          displayName: typeof data.displayName === "string" && data.displayName ? data.displayName : "Joueur anonyme",
          photoURL: typeof data.photoURL === "string" ? data.photoURL : "",
          periodKey: typeof data[keyField] === "string" ? data[keyField] : "",
          seasonNet: typeof net === "number" && Number.isFinite(net) ? net : null,
        };
      })
      .filter((entry): entry is typeof entry & { seasonNet: number } => entry.uid !== "" && entry.periodKey === periodKey && entry.seasonNet !== null)
      .sort((left, right) => right.seasonNet - left.seasonNet)
      .slice(0, PODIUM_SIZE)
      .map(({ uid, displayName, photoURL, seasonNet }) => ({ uid, displayName, photoURL, seasonNet }));

    if (!top.length) {
      return;
    }

    // CREATE-ONLY cote regles Firestore : une archive concurrente echoue en permission-denied et tombe dans le catch.
    await setDoc(recordRef, {
      seasonKey: periodKey,
      top,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Archive best-effort : deja archivee en concurrence ou indisponible, on reessaiera au prochain login.
  }
}

export async function archiveSeasonIfNeeded(previousKey: string): Promise<void> {
  await archivePeriodIfNeeded(SEASONS_COLLECTION, previousKey, "seasonKey", "seasonNet");
}

export async function loadSeasonHallOfFame(limitCount = 24): Promise<SeasonRecord[]> {
  const db = getCasinoDb();
  if (!db) {
    return [];
  }

  try {
    const seasonsQuery = query(
      collection(db, SEASONS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(Math.max(1, Math.floor(limitCount))),
    );
    const snapshot = await getDocs(seasonsQuery);

    return snapshot.docs.map((seasonDoc) => parseSeasonRecord(seasonDoc.id, seasonDoc.data()));
  } catch {
    return [];
  }
}

export async function archiveWeekIfNeeded(previousWeekKey: string): Promise<void> {
  await archivePeriodIfNeeded(WEEKS_COLLECTION, previousWeekKey, "weeklyKey", "weeklyNet");
}

export async function loadWeekRecord(weekKey: string): Promise<SeasonRecord | null> {
  const db = getCasinoDb();
  if (!db || !weekKey) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(db, WEEKS_COLLECTION, weekKey));
    return snapshot.exists() ? parseSeasonRecord(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
