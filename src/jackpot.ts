import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { CasinoUser } from "./firebaseClient";

export const JACKPOT_SEED = 2000;
export const JACKPOT_RATE = 0.01;

export type JackpotState = {
  pot: number;
  lastWinnerName: string;
  lastWonAt: number | null;
};

const GLOBAL_STATE_COLLECTION = "globalState";
const JACKPOT_DOC_ID = "jackpot";

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

export function jackpotContribution(betAmount: number): number {
  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return 0;
  }

  return Math.max(1, Math.floor(betAmount * JACKPOT_RATE));
}

export function parseJackpotDoc(data: Record<string, unknown>): JackpotState {
  const pot = typeof data.pot === "number" && Number.isFinite(data.pot) ? Math.max(data.pot, JACKPOT_SEED) : JACKPOT_SEED;
  const lastWinnerName = typeof data.lastWinnerName === "string" ? data.lastWinnerName : "";

  return {
    pot,
    lastWinnerName,
    lastWonAt: timestampToMillis(data.lastWonAt),
  };
}

export function subscribeJackpot(onChange: (state: JackpotState | null) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let canceled = false;

  void resolveDb().then((db) => {
    if (!db) {
      onChange(null);
      return;
    }

    if (canceled) {
      return;
    }

    unsubscribe = onSnapshot(
      doc(db, GLOBAL_STATE_COLLECTION, JACKPOT_DOC_ID),
      (snapshot) => {
        onChange(snapshot.exists() ? parseJackpotDoc(snapshot.data()) : { pot: JACKPOT_SEED, lastWinnerName: "", lastWonAt: null });
      },
      () => {
        onChange(null);
      },
    );
  });

  return () => {
    canceled = true;
    unsubscribe?.();
  };
}

export async function contributeToJackpot(betAmount: number): Promise<void> {
  const db = await resolveDb();
  if (!db) {
    return;
  }

  const contribution = jackpotContribution(betAmount);
  if (contribution <= 0) {
    return;
  }

  await setDoc(
    doc(db, GLOBAL_STATE_COLLECTION, JACKPOT_DOC_ID),
    {
      pot: increment(contribution),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function claimJackpot(user: CasinoUser): Promise<number> {
  const db = await resolveDb();
  if (!db) {
    return 0;
  }

  const jackpotRef = doc(db, GLOBAL_STATE_COLLECTION, JACKPOT_DOC_ID);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(jackpotRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const pot = typeof data.pot === "number" && Number.isFinite(data.pot) ? data.pot : JACKPOT_SEED;

    // Garde anti-rejeu : un claim legitime suppose au moins une contribution au-dessus
    // du seed (contributeToJackpot part au debut du spin). pot == seed => claim deja
    // consomme (ou concurrent) : on ne credite rien et on n'ecrit pas le doc.
    if (pot <= JACKPOT_SEED) {
      return 0;
    }

    const payout = pot;

    transaction.set(
      jackpotRef,
      {
        pot: JACKPOT_SEED,
        lastWinnerUid: user.uid,
        lastWinnerName: user.displayName ?? "Joueur anonyme",
        lastWonAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return payout;
  });
}
