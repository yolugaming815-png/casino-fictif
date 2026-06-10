import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { CasinoUser, LeaderboardEntry } from "./firebaseClient";

export const GIFT_DAILY_CAP = 10000;
export const GIFT_MESSAGE_MAX_LENGTH = 140;
export const RAIN_ACTIVE_WINDOW_MS = 10 * 60 * 1000;
export const RAIN_MAX_RECIPIENTS = 10;

export type GiftKind = "gift" | "rain";
export type GiftStatus = "pending" | "claimed";

export type GiftEntry = {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  toDisplayName: string;
  amount: number;
  kind: GiftKind;
  message: string;
  status: GiftStatus;
  dayKey: string;
  createdAt?: unknown;
  claimedAt?: unknown;
};

export type RainRecipient = {
  uid: string;
  displayName: string;
};

// Import dynamique : firebaseClient depend de Vite (import.meta.env), ce qui le rend
// inchargeable sous node --test. Les helpers purs de ce module restent testables.
async function resolveDb(): Promise<Firestore | null> {
  const { getCasinoDb } = await import("./firebaseClient");
  return getCasinoDb();
}

function timestampToMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return null;
}

export function giftDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sanitizeGiftMessage(message: string | undefined): string {
  return (message ?? "").replace(/\s+/g, " ").trim().slice(0, GIFT_MESSAGE_MAX_LENGTH);
}

export function pickRainRecipients(userId: string, activePlayers: LeaderboardEntry[], now = Date.now()): LeaderboardEntry[] {
  return activePlayers
    .filter((player) => {
      if (!player.uid || player.uid === userId || player.banned === true) {
        return false;
      }

      const updatedAt = timestampToMillis(player.updatedAt);
      return updatedAt !== null && now - updatedAt < RAIN_ACTIVE_WINDOW_MS;
    })
    .slice(0, RAIN_MAX_RECIPIENTS);
}

export function splitRainAmount(totalAmount: number, recipientCount: number): number {
  if (recipientCount <= 0) {
    return 0;
  }

  return Math.floor(Math.max(0, Math.floor(totalAmount)) / recipientCount);
}

export function parseGift(id: string, data: Record<string, unknown>): GiftEntry {
  return {
    id,
    fromUid: typeof data.fromUid === "string" ? data.fromUid : "",
    fromDisplayName: typeof data.fromDisplayName === "string" ? data.fromDisplayName : "Joueur anonyme",
    toUid: typeof data.toUid === "string" ? data.toUid : "",
    toDisplayName: typeof data.toDisplayName === "string" ? data.toDisplayName : "Joueur anonyme",
    amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
    kind: data.kind === "rain" ? "rain" : "gift",
    message: typeof data.message === "string" ? data.message : "",
    status: data.status === "claimed" ? "claimed" : "pending",
    dayKey: typeof data.dayKey === "string" ? data.dayKey : "",
    createdAt: data.createdAt,
    claimedAt: data.claimedAt,
  };
}

export async function loadDailyGiftTotal(userId: string): Promise<number> {
  const db = await resolveDb();
  if (!db) {
    return 0;
  }

  const giftsQuery = query(collection(db, "gifts"), where("fromUid", "==", userId), where("dayKey", "==", giftDayKey()));
  const snapshot = await getDocs(giftsQuery);

  return snapshot.docs.reduce((total, giftDoc) => {
    const amount = giftDoc.data().amount;
    return total + (typeof amount === "number" && Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export async function sendGift(user: CasinoUser, to: { uid: string; displayName: string }, amount: number, message?: string): Promise<void> {
  const db = await resolveDb();
  if (!db) {
    throw new Error("Firebase n'est pas configure.");
  }

  if (!to.uid || to.uid === user.uid) {
    throw new Error("Tu ne peux pas t'envoyer un cadeau a toi-meme.");
  }

  const safeAmount = Math.floor(Number(amount) || 0);
  if (safeAmount < 1 || safeAmount > GIFT_DAILY_CAP) {
    throw new Error(`Le montant d'un cadeau doit etre entre 1 et ${GIFT_DAILY_CAP} credits.`);
  }

  const dailyTotal = await loadDailyGiftTotal(user.uid);
  if (dailyTotal + safeAmount > GIFT_DAILY_CAP) {
    throw new Error(`Limite de ${GIFT_DAILY_CAP} credits offerts par jour atteinte (deja ${dailyTotal}).`);
  }

  await addDoc(collection(db, "gifts"), {
    fromUid: user.uid,
    fromDisplayName: user.displayName || "Joueur anonyme",
    toUid: to.uid,
    toDisplayName: to.displayName,
    amount: safeAmount,
    kind: "gift",
    message: sanitizeGiftMessage(message),
    status: "pending",
    dayKey: giftDayKey(),
    createdAt: serverTimestamp(),
    claimedAt: null,
  });
}

export async function makeItRain(
  user: CasinoUser,
  totalAmount: number,
  activePlayers: LeaderboardEntry[],
): Promise<{ recipients: RainRecipient[]; perPlayer: number }> {
  const db = await resolveDb();
  if (!db) {
    throw new Error("Firebase n'est pas configure.");
  }

  const recipients = pickRainRecipients(user.uid, activePlayers);
  if (!recipients.length) {
    throw new Error("Aucun joueur actif a arroser pour le moment.");
  }

  const perPlayer = splitRainAmount(totalAmount, recipients.length);
  if (perPlayer < 1) {
    throw new Error(`Montant insuffisant pour arroser ${recipients.length} joueurs.`);
  }

  const batch = writeBatch(db);
  const dayKey = giftDayKey();

  recipients.forEach((recipient) => {
    batch.set(doc(collection(db, "gifts")), {
      fromUid: user.uid,
      fromDisplayName: user.displayName || "Joueur anonyme",
      toUid: recipient.uid,
      toDisplayName: recipient.displayName,
      amount: perPlayer,
      kind: "rain",
      message: "",
      status: "pending",
      dayKey,
      createdAt: serverTimestamp(),
      claimedAt: null,
    });
  });

  await batch.commit();

  return {
    recipients: recipients.map((recipient) => ({ uid: recipient.uid, displayName: recipient.displayName })),
    perPlayer,
  };
}

export function subscribeIncomingGifts(userId: string, onChange: (gifts: GiftEntry[]) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let canceled = false;

  void resolveDb().then((db) => {
    if (!db) {
      onChange([]);
      return;
    }

    if (canceled) {
      return;
    }

    const giftsQuery = query(collection(db, "gifts"), where("toUid", "==", userId), where("status", "==", "pending"));
    unsubscribe = onSnapshot(
      giftsQuery,
      (snapshot) => {
        onChange(snapshot.docs.map((giftDoc) => parseGift(giftDoc.id, giftDoc.data())).filter((gift) => gift.fromUid && gift.toUid));
      },
      () => {
        onChange([]);
      },
    );
  });

  return () => {
    canceled = true;
    unsubscribe?.();
  };
}

export async function claimGift(gift: GiftEntry, userId: string): Promise<void> {
  const db = await resolveDb();
  if (!db) {
    return;
  }

  if (gift.toUid !== userId) {
    throw new Error("Ce cadeau ne t'est pas destine.");
  }

  if (gift.status !== "pending") {
    throw new Error("Ce cadeau est deja recupere.");
  }

  await updateDoc(doc(db, "gifts", gift.id), {
    status: "claimed",
    claimedAt: serverTimestamp(),
  });
}
