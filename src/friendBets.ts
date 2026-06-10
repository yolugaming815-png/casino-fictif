import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { CasinoUser } from "./firebaseClient";
import type { Settlement } from "./onlineSettlement";

// Import dynamique pour que les tests node:test puissent charger les fonctions pures
// de ce module sans resoudre firebaseClient (imports type-only effaces a l'execution).
async function resolveCasinoDb(): Promise<Firestore | null> {
  const { getCasinoDb } = await import("./firebaseClient");
  return getCasinoDb();
}

export const FRIEND_BET_MIN_STAKE = 25;
export const FRIEND_BET_MAX_STAKE = 100000;
export const FRIEND_BET_TITLE_MAX_LENGTH = 120;

export type FriendBetStatus = "proposed" | "declined" | "active" | "resolved" | "canceled";

export type FriendBetSettledField = "payoutClaimed" | "creatorRefunded" | "opponentRefunded";

export type FriendBetEntry = {
  id: string;
  creatorUid: string;
  creatorName: string;
  opponentUid: string;
  opponentName: string;
  participants: string[];
  title: string;
  stake: number;
  status: FriendBetStatus;
  creatorEscrowed: boolean;
  opponentEscrowed: boolean;
  creatorDeclaredUid: string;
  opponentDeclaredUid: string;
  creatorCancelVote: boolean;
  opponentCancelVote: boolean;
  winnerUid: string;
  payoutClaimed: boolean;
  creatorRefunded: boolean;
  opponentRefunded: boolean;
  createdAt: unknown;
  acceptedAt: unknown;
  resolvedAt: unknown;
  updatedAt: unknown;
};

const FRIEND_BET_STATUSES: FriendBetStatus[] = ["proposed", "declined", "active", "resolved", "canceled"];

export function parseFriendBet(id: string, data: Record<string, unknown>): FriendBetEntry {
  const status = FRIEND_BET_STATUSES.includes(data.status as FriendBetStatus)
    ? (data.status as FriendBetStatus)
    : "proposed";

  return {
    id,
    creatorUid: typeof data.creatorUid === "string" ? data.creatorUid : "",
    creatorName: typeof data.creatorName === "string" ? data.creatorName : "Joueur anonyme",
    opponentUid: typeof data.opponentUid === "string" ? data.opponentUid : "",
    opponentName: typeof data.opponentName === "string" ? data.opponentName : "Joueur anonyme",
    participants: Array.isArray(data.participants)
      ? data.participants.filter((uid): uid is string => typeof uid === "string")
      : [],
    title: typeof data.title === "string" ? data.title : "",
    stake: typeof data.stake === "number" && Number.isFinite(data.stake) ? Math.floor(data.stake) : 0,
    status,
    creatorEscrowed: data.creatorEscrowed === true,
    opponentEscrowed: data.opponentEscrowed === true,
    creatorDeclaredUid: typeof data.creatorDeclaredUid === "string" ? data.creatorDeclaredUid : "",
    opponentDeclaredUid: typeof data.opponentDeclaredUid === "string" ? data.opponentDeclaredUid : "",
    creatorCancelVote: data.creatorCancelVote === true,
    opponentCancelVote: data.opponentCancelVote === true,
    winnerUid: typeof data.winnerUid === "string" ? data.winnerUid : "",
    payoutClaimed: data.payoutClaimed === true,
    creatorRefunded: data.creatorRefunded === true,
    opponentRefunded: data.opponentRefunded === true,
    createdAt: data.createdAt,
    acceptedAt: data.acceptedAt,
    resolvedAt: data.resolvedAt,
    updatedAt: data.updatedAt,
  };
}

function friendBetRoleOf(bet: FriendBetEntry, uid: string): "creator" | "opponent" | null {
  if (bet.creatorUid === uid) {
    return "creator";
  }
  if (bet.opponentUid === uid) {
    return "opponent";
  }
  return null;
}

export async function createFriendBet(
  user: CasinoUser,
  opponent: { uid: string; displayName: string },
  title: string,
  stake: number,
): Promise<string | null> {
  const db = await resolveCasinoDb();
  if (!db) {
    return null;
  }

  const safeTitle = title.trim().slice(0, FRIEND_BET_TITLE_MAX_LENGTH);
  const safeStake = Math.floor(stake);
  if (!safeTitle) {
    throw new Error("Donne un titre a ton pari.");
  }
  if (!Number.isFinite(safeStake) || safeStake < FRIEND_BET_MIN_STAKE || safeStake > FRIEND_BET_MAX_STAKE) {
    throw new Error(`La mise doit etre entre ${FRIEND_BET_MIN_STAKE} et ${FRIEND_BET_MAX_STAKE} jetons.`);
  }
  if (opponent.uid === user.uid) {
    throw new Error("Tu ne peux pas parier contre toi-meme.");
  }

  const betRef = await addDoc(collection(db, "friendBets"), {
    creatorUid: user.uid,
    creatorName: user.displayName || "Joueur anonyme",
    opponentUid: opponent.uid,
    opponentName: opponent.displayName || "Joueur anonyme",
    participants: [user.uid, opponent.uid],
    title: safeTitle,
    stake: safeStake,
    status: "proposed",
    creatorEscrowed: false,
    opponentEscrowed: false,
    creatorDeclaredUid: "",
    opponentDeclaredUid: "",
    creatorCancelVote: false,
    opponentCancelVote: false,
    winnerUid: "",
    payoutClaimed: false,
    creatorRefunded: false,
    opponentRefunded: false,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    resolvedAt: null,
    updatedAt: serverTimestamp(),
  });

  return betRef.id;
}

export async function answerFriendBet(bet: FriendBetEntry, user: CasinoUser, accept: boolean): Promise<void> {
  const db = await resolveCasinoDb();
  if (!db) {
    return;
  }
  if (bet.opponentUid !== user.uid) {
    throw new Error("Seul l'adversaire invite peut repondre a ce pari.");
  }

  const betRef = doc(db, "friendBets", bet.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(betRef);
    if (!snapshot.exists()) {
      throw new Error("Ce pari n'existe plus.");
    }

    const current = parseFriendBet(snapshot.id, snapshot.data());
    if (current.status !== "proposed") {
      throw new Error("Ce pari a deja recu une reponse.");
    }

    if (accept) {
      transaction.update(betRef, {
        status: "active",
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(betRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function markFriendBetEscrowed(bet: FriendBetEntry, user: CasinoUser): Promise<void> {
  const db = await resolveCasinoDb();
  if (!db) {
    return;
  }

  const role = friendBetRoleOf(bet, user.uid);
  if (!role) {
    throw new Error("Tu ne participes pas a ce pari.");
  }

  await updateDoc(doc(db, "friendBets", bet.id), {
    [`${role}Escrowed`]: true,
    updatedAt: serverTimestamp(),
  });
}

export async function declareFriendBetWinner(bet: FriendBetEntry, user: CasinoUser, winnerUid: string): Promise<void> {
  const db = await resolveCasinoDb();
  if (!db) {
    return;
  }

  const role = friendBetRoleOf(bet, user.uid);
  if (!role) {
    throw new Error("Tu ne participes pas a ce pari.");
  }
  if (!bet.participants.includes(winnerUid)) {
    throw new Error("Le vainqueur doit etre un participant du pari.");
  }

  const betRef = doc(db, "friendBets", bet.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(betRef);
    if (!snapshot.exists()) {
      throw new Error("Ce pari n'existe plus.");
    }

    const current = parseFriendBet(snapshot.id, snapshot.data());
    if (current.status !== "active") {
      throw new Error("Ce pari n'est plus en cours.");
    }

    const otherDeclaredUid = role === "creator" ? current.opponentDeclaredUid : current.creatorDeclaredUid;
    const updates: Record<string, unknown> = {
      [`${role}DeclaredUid`]: winnerUid,
      updatedAt: serverTimestamp(),
    };

    if (otherDeclaredUid && otherDeclaredUid === winnerUid) {
      updates.status = "resolved";
      updates.winnerUid = winnerUid;
      updates.resolvedAt = serverTimestamp();
    }

    transaction.update(betRef, updates);
  });
}

export async function voteCancelFriendBet(bet: FriendBetEntry, user: CasinoUser): Promise<void> {
  const db = await resolveCasinoDb();
  if (!db) {
    return;
  }

  const role = friendBetRoleOf(bet, user.uid);
  if (!role) {
    throw new Error("Tu ne participes pas a ce pari.");
  }

  const betRef = doc(db, "friendBets", bet.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(betRef);
    if (!snapshot.exists()) {
      throw new Error("Ce pari n'existe plus.");
    }

    const current = parseFriendBet(snapshot.id, snapshot.data());
    if (current.status !== "active") {
      throw new Error("Ce pari n'est plus en cours.");
    }

    const otherVote = role === "creator" ? current.opponentCancelVote : current.creatorCancelVote;
    const updates: Record<string, unknown> = {
      [`${role}CancelVote`]: true,
      updatedAt: serverTimestamp(),
    };

    if (otherVote) {
      updates.status = "canceled";
      updates.resolvedAt = serverTimestamp();
    }

    transaction.update(betRef, updates);
  });
}

export async function markFriendBetSettled(betId: string, field: FriendBetSettledField): Promise<void> {
  const db = await resolveCasinoDb();
  if (!db) {
    return;
  }

  await updateDoc(doc(db, "friendBets", betId), {
    [field]: true,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeFriendBets(
  userId: string,
  onChange: (bets: FriendBetEntry[]) => void,
  onError?: () => void,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let disposed = false;

  resolveCasinoDb()
    .then((db) => {
      if (!db) {
        onChange([]);
        return;
      }
      if (disposed) {
        return;
      }

      const betsQuery = query(collection(db, "friendBets"), where("participants", "array-contains", userId));

      unsubscribe = onSnapshot(
        betsQuery,
        (snapshot) => {
          onChange(snapshot.docs.map((betDoc) => parseFriendBet(betDoc.id, betDoc.data())));
        },
        () => {
          onError?.();
        },
      );
    })
    .catch(() => {
      onError?.();
    });

  return () => {
    disposed = true;
    unsubscribe?.();
  };
}

/**
 * Calcule les reglements de paris entre amis pour `uid`.
 *
 * Contrat anti-rejeu a deux niveaux :
 * 1. Dedup locale : App garde en localStorage les cles deja appliquees sur CET appareil
 *    (applyOnlineSettlements) et peut les passer via `settledKeys`.
 * 2. Garde serveur (secondaire) : les flags Firestore (creatorEscrowed/opponentEscrowed,
 *    payoutClaimed, creatorRefunded/opponentRefunded) sont poses par le client qui vient
 *    d'APPLIQUER le reglement (App.tsx, callback onApplied). Regle d'emission :
 *    - flag false                          -> emettre (premiere application, ou re-emission
 *      inoffensive dedupee localement) ;
 *    - flag true ET cle locale presente    -> emettre quand meme : c'est CE client qui a
 *      applique puis pose le flag, la dedup locale neutralise la re-application ;
 *    - flag true ET cle locale absente     -> NE PAS emettre : un AUTRE appareil a deja
 *      regle cette entree (nouveau navigateur / localStorage vide), on evite le rejeu.
 */
export function computeFriendBetSettlements(
  bets: FriendBetEntry[],
  uid: string,
  settledKeys: ReadonlySet<string> = new Set<string>(),
): Settlement[] {
  const settlements: Settlement[] = [];

  bets.forEach((bet) => {
    const role = friendBetRoleOf(bet, uid);
    if (!role || bet.stake <= 0) {
      return;
    }

    const escrowed = role === "creator" ? bet.creatorEscrowed : bet.opponentEscrowed;
    const refunded = role === "creator" ? bet.creatorRefunded : bet.opponentRefunded;

    const escrowKey = `${bet.id}:escrow:${uid}`;
    if ((bet.status === "active" || bet.status === "resolved") && (!escrowed || settledKeys.has(escrowKey))) {
      settlements.push({
        key: escrowKey,
        delta: -bet.stake,
        message: `Pari entre amis « ${bet.title} » : ${bet.stake} jetons mis sous sequestre.`,
      });
    }

    const payoutKey = `${bet.id}:payout`;
    if (bet.status === "resolved" && bet.winnerUid === uid && (!bet.payoutClaimed || settledKeys.has(payoutKey))) {
      settlements.push({
        key: payoutKey,
        delta: bet.stake * 2,
        message: `Pari entre amis « ${bet.title} » gagne : +${bet.stake * 2} jetons !`,
      });
    }

    const refundKey = `${bet.id}:refund:${uid}`;
    if ((bet.status === "canceled" || bet.status === "declined") && escrowed && (!refunded || settledKeys.has(refundKey))) {
      settlements.push({
        key: refundKey,
        delta: bet.stake,
        message: `Pari entre amis « ${bet.title} » annule : ${bet.stake} jetons rembourses.`,
      });
    }
  });

  return settlements;
}
