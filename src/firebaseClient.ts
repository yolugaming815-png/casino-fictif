import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { comparePokerHands, evaluatePokerHand } from "./pokerLogic";

export type CasinoUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type LeaderboardEntry = {
  uid: string;
  displayName: string;
  balance: number;
  inventory: Array<{ id: string; count: number }>;
  equippedSkins: Record<string, string>;
  updatedAt?: unknown;
};

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type FriendRequestEntry = {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  toDisplayName: string;
  status: FriendRequestStatus;
  createdAt?: unknown;
  respondedAt?: unknown;
};

export type PrivateMessageEntry = {
  id: string;
  conversationId: string;
  participants: string[];
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  toDisplayName: string;
  body: string;
  readBy: string[];
  createdAt?: unknown;
};

export type SkinTradeStatus = "pending" | "accepted" | "rejected" | "canceled";

export type SkinTradeEntry = {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  toDisplayName: string;
  offeredItemId: string;
  requestedItemId: string;
  reservedItemId?: string;
  offeredCredits: number;
  requestedCredits: number;
  status: SkinTradeStatus;
  appliedFromUid: boolean;
  appliedToUid: boolean;
  createdAt?: unknown;
  respondedAt?: unknown;
  updatedAt?: unknown;
};

export type OnlineRoomType = "duel" | "poker";
export type OnlineRoomStatus = "waiting" | "playing" | "finished";

export type OnlineRoomPlayer = {
  uid: string;
  displayName: string;
};

export type PokerShowdownResult = {
  uid: string;
  displayName: string;
  folded: boolean;
  handLabel: string;
  handCards: string[];
  isWinner: boolean;
};

export type DuelPlayerScore = {
  rounds: number[];
  total: number;
};

export type PokerPhase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";

export type OnlineRoomEntry = {
  id: string;
  type: OnlineRoomType;
  game: string;
  status: OnlineRoomStatus;
  hostUid: string;
  hostName: string;
  players: OnlineRoomPlayer[];
  playerIds: string[];
  maxPlayers: number;
  invitedUid?: string;
  invitedName?: string;
  duelScores: Record<string, DuelPlayerScore>;
  winnerUid?: string;
  winnerName?: string;
  pokerPhase: PokerPhase;
  pokerDeck: string[];
  pokerHands: Record<string, string[]>;
  communityCards: string[];
  foldedPlayerIds: string[];
  pokerActions: Record<string, string>;
  pokerPot: number;
  pokerCurrentBet: number;
  pokerContributions: Record<string, number>;
  pokerHandId: number;
  pokerTurnUid?: string;
  pokerTurnName?: string;
  pokerWinnerUid?: string;
  pokerWinnerName?: string;
  pokerWinnerUids: string[];
  pokerWinnerNames: string[];
  pokerWinnerHandLabel?: string;
  pokerWinnerHandCards: string[];
  pokerShowdownResults: PokerShowdownResult[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type DuelStats = {
  wins: number;
  losses: number;
  ratio: number;
};

const STALE_WAITING_ROOM_MS = 30 * 60 * 1000;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA95a2M9sm2EXwQNU3KFeMShp3tLYqmtCo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "casino-fictif.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "casino-fictif",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "casino-fictif.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "867945085146",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:867945085146:web:d849b9f91eefad12e5cde3",
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => typeof value === "string" && value.trim().length > 0);
}

let firebaseApp: FirebaseApp | null = null;

function getFirebaseApp() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

function toCasinoUser(user: User): CasinoUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function isFirebaseConfigured() {
  return hasFirebaseConfig();
}

export function watchCasinoUser(onChange: (user: CasinoUser | null) => void) {
  const app = getFirebaseApp();
  if (!app) {
    onChange(null);
    return () => undefined;
  }

  const auth = getAuth(app);

  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        onChange(toCasinoUser(result.user));
      }
    })
    .catch(() => {
      onChange(null);
    });

  return onAuthStateChanged(auth, (user) => {
    onChange(user ? toCasinoUser(user) : null);
  });
}

export async function signInWithGoogle() {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error("Firebase n'est pas configure.");
  }

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return toCasinoUser(result.user);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/popup-closed-by-user"
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

export async function signOutGoogle() {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await signOut(getAuth(app));
}

export async function loadCloudSave(userId: string) {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const snapshot = await getDoc(doc(getFirestore(app), "players", userId));
  return snapshot.exists() ? snapshot.data().gameSave ?? null : null;
}

export async function saveCloudSave(userId: string, gameSave: unknown) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await setDoc(
    doc(getFirestore(app), "players", userId),
    {
      gameSave,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveLeaderboardEntry(
  user: CasinoUser,
  balance: number,
  inventory: Array<{ id: string; count: number }> = [],
  equippedSkins: Record<string, string> = {},
) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await setDoc(
    doc(getFirestore(app), "leaderboard", user.uid),
    {
      uid: user.uid,
      displayName: user.displayName || "Joueur anonyme",
      balance,
      inventory,
      equippedSkins,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function sendFriendRequest(from: CasinoUser, to: LeaderboardEntry) {
  const app = getFirebaseApp();
  if (!app || from.uid === to.uid) {
    return;
  }

  const db = getFirestore(app);
  const directRef = doc(db, "friendRequests", `${from.uid}_${to.uid}`);
  const reverseRef = doc(db, "friendRequests", `${to.uid}_${from.uid}`);
  const [directSnapshot, reverseSnapshot] = await Promise.all([getDoc(directRef), getDoc(reverseRef)]);

  if (directSnapshot.data()?.status === "accepted" || reverseSnapshot.data()?.status === "accepted") {
    return;
  }

  if (reverseSnapshot.exists() && reverseSnapshot.data()?.status === "pending") {
    await updateDoc(reverseRef, {
      status: "accepted",
      respondedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(
    directRef,
    {
      fromUid: from.uid,
      fromDisplayName: from.displayName || "Joueur anonyme",
      toUid: to.uid,
      toDisplayName: to.displayName,
      status: "pending",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function parseFriendRequest(id: string, data: Record<string, unknown>): FriendRequestEntry {
  const status = data.status === "accepted" || data.status === "rejected" ? data.status : "pending";

  return {
    id,
    fromUid: typeof data.fromUid === "string" ? data.fromUid : "",
    fromDisplayName: typeof data.fromDisplayName === "string" ? data.fromDisplayName : "Joueur anonyme",
    toUid: typeof data.toUid === "string" ? data.toUid : "",
    toDisplayName: typeof data.toDisplayName === "string" ? data.toDisplayName : "Joueur anonyme",
    status,
    createdAt: data.createdAt,
    respondedAt: data.respondedAt,
  };
}

export async function loadFriendRequests(userId: string): Promise<FriendRequestEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const db = getFirestore(app);
  const sentQuery = query(collection(db, "friendRequests"), where("fromUid", "==", userId));
  const receivedQuery = query(collection(db, "friendRequests"), where("toUid", "==", userId));
  const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentQuery), getDocs(receivedQuery)]);
  const requests = new Map<string, FriendRequestEntry>();

  [...sentSnapshot.docs, ...receivedSnapshot.docs].forEach((requestDoc) => {
    requests.set(requestDoc.id, parseFriendRequest(requestDoc.id, requestDoc.data()));
  });

  return [...requests.values()].filter((request) => request.fromUid && request.toUid);
}

export async function answerFriendRequest(requestId: string, status: "accepted" | "rejected") {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await updateDoc(doc(getFirestore(app), "friendRequests", requestId), {
    status,
    respondedAt: serverTimestamp(),
  });
}

function getConversationId(firstUid: string, secondUid: string) {
  return [firstUid, secondUid].sort().join("_");
}

function parsePrivateMessage(id: string, data: Record<string, unknown>): PrivateMessageEntry {
  return {
    id,
    conversationId: typeof data.conversationId === "string" ? data.conversationId : "",
    participants: Array.isArray(data.participants) ? data.participants.filter((uid): uid is string => typeof uid === "string") : [],
    fromUid: typeof data.fromUid === "string" ? data.fromUid : "",
    fromDisplayName: typeof data.fromDisplayName === "string" ? data.fromDisplayName : "Joueur anonyme",
    toUid: typeof data.toUid === "string" ? data.toUid : "",
    toDisplayName: typeof data.toDisplayName === "string" ? data.toDisplayName : "Joueur anonyme",
    body: typeof data.body === "string" ? data.body : "",
    readBy: Array.isArray(data.readBy) ? data.readBy.filter((uid): uid is string => typeof uid === "string") : [],
    createdAt: data.createdAt,
  };
}

export async function loadPrivateMessages(userId: string): Promise<PrivateMessageEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const messagesQuery = query(collection(getFirestore(app), "privateMessages"), where("participants", "array-contains", userId), limit(120));
  const snapshot = await getDocs(messagesQuery);

  return snapshot.docs
    .map((messageDoc) => parsePrivateMessage(messageDoc.id, messageDoc.data()))
    .filter((message) => message.conversationId && message.fromUid && message.toUid && message.body)
    .sort((first, second) => {
      const firstTime = typeof first.createdAt === "object" && first.createdAt && "seconds" in first.createdAt && typeof first.createdAt.seconds === "number" ? first.createdAt.seconds : 0;
      const secondTime = typeof second.createdAt === "object" && second.createdAt && "seconds" in second.createdAt && typeof second.createdAt.seconds === "number" ? second.createdAt.seconds : 0;
      return firstTime - secondTime;
    });
}

export async function sendPrivateMessage(from: CasinoUser, to: { uid: string; displayName: string }, body: string) {
  const app = getFirebaseApp();
  const trimmedBody = body.replace(/\s+/g, " ").trim().slice(0, 280);

  if (!app || from.uid === to.uid || !trimmedBody) {
    return null;
  }

  const conversationId = getConversationId(from.uid, to.uid);
  const message = await addDoc(collection(getFirestore(app), "privateMessages"), {
    conversationId,
    participants: conversationId.split("_"),
    fromUid: from.uid,
    fromDisplayName: from.displayName || "Joueur anonyme",
    toUid: to.uid,
    toDisplayName: to.displayName,
    body: trimmedBody,
    readBy: [from.uid],
    createdAt: serverTimestamp(),
  });

  return message.id;
}

export async function markPrivateMessagesRead(userId: string, messages: PrivateMessageEntry[]) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await Promise.all(
    messages
      .filter((message) => message.toUid === userId && !message.readBy.includes(userId))
      .slice(0, 30)
      .map((message) =>
        updateDoc(doc(getFirestore(app), "privateMessages", message.id), {
          readBy: [...new Set([...message.readBy, userId])],
        }),
      ),
  );
}

function parseSkinTrade(id: string, data: Record<string, unknown>): SkinTradeEntry {
  const status =
    data.status === "accepted" || data.status === "rejected" || data.status === "canceled" ? data.status : "pending";

  return {
    id,
    fromUid: typeof data.fromUid === "string" ? data.fromUid : "",
    fromDisplayName: typeof data.fromDisplayName === "string" ? data.fromDisplayName : "Joueur anonyme",
    toUid: typeof data.toUid === "string" ? data.toUid : "",
    toDisplayName: typeof data.toDisplayName === "string" ? data.toDisplayName : "Joueur anonyme",
    offeredItemId: typeof data.offeredItemId === "string" ? data.offeredItemId : "",
    requestedItemId: typeof data.requestedItemId === "string" ? data.requestedItemId : "",
    reservedItemId: typeof data.reservedItemId === "string" ? data.reservedItemId : undefined,
    offeredCredits: typeof data.offeredCredits === "number" && Number.isFinite(data.offeredCredits) ? data.offeredCredits : 0,
    requestedCredits: typeof data.requestedCredits === "number" && Number.isFinite(data.requestedCredits) ? data.requestedCredits : 0,
    status,
    appliedFromUid: data.appliedFromUid === true,
    appliedToUid: data.appliedToUid === true,
    createdAt: data.createdAt,
    respondedAt: data.respondedAt,
    updatedAt: data.updatedAt,
  };
}

export async function createSkinTrade(
  from: CasinoUser,
  to: { uid: string; displayName: string },
  offeredItemId: string,
  requestedItemId: string,
  offeredCredits = 0,
  requestedCredits = 0,
) {
  const app = getFirebaseApp();
  if (!app || from.uid === to.uid) {
    return null;
  }

  const trade = await addDoc(collection(getFirestore(app), "skinTrades"), {
    fromUid: from.uid,
    fromDisplayName: from.displayName || "Joueur anonyme",
    toUid: to.uid,
    toDisplayName: to.displayName,
    offeredItemId,
    requestedItemId,
    reservedItemId: offeredItemId,
    offeredCredits,
    requestedCredits,
    status: "pending",
    appliedFromUid: false,
    appliedToUid: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return trade.id;
}

export async function loadSkinTrades(userId: string): Promise<SkinTradeEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const db = getFirestore(app);
  const sentQuery = query(collection(db, "skinTrades"), where("fromUid", "==", userId), limit(50));
  const receivedQuery = query(collection(db, "skinTrades"), where("toUid", "==", userId), limit(50));
  const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(sentQuery), getDocs(receivedQuery)]);
  const trades = new Map<string, SkinTradeEntry>();

  [...sentSnapshot.docs, ...receivedSnapshot.docs].forEach((tradeDoc) => {
    trades.set(tradeDoc.id, parseSkinTrade(tradeDoc.id, tradeDoc.data()));
  });

  return [...trades.values()].filter(
    (trade) =>
      trade.fromUid &&
      trade.toUid &&
      (trade.offeredItemId || trade.offeredCredits > 0) &&
      (trade.requestedItemId || trade.requestedCredits > 0),
  );
}

export async function answerSkinTrade(trade: SkinTradeEntry, user: CasinoUser, status: "accepted" | "rejected" | "canceled") {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (trade.status !== "pending") {
    throw new Error("Cet echange est deja termine.");
  }

  if (status === "canceled" && trade.fromUid !== user.uid) {
    throw new Error("Seul l'envoyeur peut annuler l'echange.");
  }

  if ((status === "accepted" || status === "rejected") && trade.toUid !== user.uid) {
    throw new Error("Seul le destinataire peut repondre a l'echange.");
  }

  await updateDoc(doc(getFirestore(app), "skinTrades", trade.id), {
    status,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markSkinTradeApplied(tradeId: string, userRole: "from" | "to") {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  await updateDoc(doc(getFirestore(app), "skinTrades", tradeId), {
    [userRole === "from" ? "appliedFromUid" : "appliedToUid"]: true,
    updatedAt: serverTimestamp(),
  });
}

function casinoPlayer(user: CasinoUser): OnlineRoomPlayer {
  return {
    uid: user.uid,
    displayName: user.displayName || "Joueur anonyme",
  };
}

function timestampToMillis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return null;
}

function parseOnlineRoom(id: string, data: Record<string, unknown>): OnlineRoomEntry {
  const type = data.type === "poker" ? "poker" : "duel";
  const status = data.status === "playing" || data.status === "finished" ? data.status : "waiting";
  const players = Array.isArray(data.players)
    ? data.players
        .map((player) => ({
          uid: typeof player?.uid === "string" ? player.uid : "",
          displayName: typeof player?.displayName === "string" ? player.displayName : "Joueur anonyme",
        }))
        .filter((player) => player.uid)
    : [];
  const rawScores = data.duelScores && typeof data.duelScores === "object" ? (data.duelScores as Record<string, unknown>) : {};
  const duelScores = Object.fromEntries(
    Object.entries(rawScores).map(([uid, score]) => {
      const parsedScore = score && typeof score === "object" ? (score as Record<string, unknown>) : {};
      const rounds = Array.isArray(parsedScore.rounds)
        ? parsedScore.rounds.filter((round): round is number => typeof round === "number" && Number.isFinite(round))
        : [];

      return [
        uid,
        {
          rounds,
          total: typeof parsedScore.total === "number" && Number.isFinite(parsedScore.total) ? parsedScore.total : rounds.reduce((sum, round) => sum + round, 0),
        },
      ];
    }),
  );
  const rawHands = data.pokerHands && typeof data.pokerHands === "object" ? (data.pokerHands as Record<string, unknown>) : {};
  const pokerHands = Object.fromEntries(
    Object.entries(rawHands).map(([uid, hand]) => [uid, Array.isArray(hand) ? hand.filter((card): card is string => typeof card === "string") : []]),
  );
  const rawPokerActions = data.pokerActions && typeof data.pokerActions === "object" ? (data.pokerActions as Record<string, unknown>) : {};
  const pokerActions = Object.fromEntries(
    Object.entries(rawPokerActions).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const rawPokerContributions = data.pokerContributions && typeof data.pokerContributions === "object" ? (data.pokerContributions as Record<string, unknown>) : {};
  const pokerContributions = Object.fromEntries(
    Object.entries(rawPokerContributions)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
      .map(([uid, contribution]) => [uid, contribution]),
  );
  const pokerPhase =
    data.pokerPhase === "preflop" || data.pokerPhase === "flop" || data.pokerPhase === "turn" || data.pokerPhase === "river" || data.pokerPhase === "showdown"
      ? data.pokerPhase
      : "waiting";
  const pokerShowdownResults = Array.isArray(data.pokerShowdownResults)
    ? data.pokerShowdownResults
        .map((result) => {
          const parsedResult = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
          return {
            uid: typeof parsedResult.uid === "string" ? parsedResult.uid : "",
            displayName: typeof parsedResult.displayName === "string" ? parsedResult.displayName : "Joueur anonyme",
            folded: parsedResult.folded === true,
            handLabel: typeof parsedResult.handLabel === "string" ? parsedResult.handLabel : "",
            handCards: Array.isArray(parsedResult.handCards) ? parsedResult.handCards.filter((card): card is string => typeof card === "string") : [],
            isWinner: parsedResult.isWinner === true,
          };
        })
        .filter((result) => result.uid)
    : [];

  return {
    id,
    type,
    game: typeof data.game === "string" ? data.game : type === "poker" ? "Poker" : "Duel",
    status,
    hostUid: typeof data.hostUid === "string" ? data.hostUid : "",
    hostName: typeof data.hostName === "string" ? data.hostName : "Joueur anonyme",
    players,
    playerIds: Array.isArray(data.playerIds) ? data.playerIds.filter((id): id is string => typeof id === "string") : players.map((player) => player.uid),
    maxPlayers: typeof data.maxPlayers === "number" && Number.isFinite(data.maxPlayers) ? data.maxPlayers : type === "poker" ? 6 : 2,
    invitedUid: typeof data.invitedUid === "string" ? data.invitedUid : undefined,
    invitedName: typeof data.invitedName === "string" ? data.invitedName : undefined,
    duelScores,
    winnerUid: typeof data.winnerUid === "string" ? data.winnerUid : undefined,
    winnerName: typeof data.winnerName === "string" ? data.winnerName : undefined,
    pokerPhase,
    pokerDeck: Array.isArray(data.pokerDeck) ? data.pokerDeck.filter((card): card is string => typeof card === "string") : [],
    pokerHands,
    communityCards: Array.isArray(data.communityCards) ? data.communityCards.filter((card): card is string => typeof card === "string") : [],
    foldedPlayerIds: Array.isArray(data.foldedPlayerIds) ? data.foldedPlayerIds.filter((uid): uid is string => typeof uid === "string") : [],
    pokerActions,
    pokerPot: typeof data.pokerPot === "number" && Number.isFinite(data.pokerPot) ? data.pokerPot : 0,
    pokerCurrentBet: typeof data.pokerCurrentBet === "number" && Number.isFinite(data.pokerCurrentBet) ? data.pokerCurrentBet : 0,
    pokerContributions,
    pokerHandId: typeof data.pokerHandId === "number" && Number.isFinite(data.pokerHandId) ? data.pokerHandId : 0,
    pokerTurnUid: typeof data.pokerTurnUid === "string" ? data.pokerTurnUid : undefined,
    pokerTurnName: typeof data.pokerTurnName === "string" ? data.pokerTurnName : undefined,
    pokerWinnerUid: typeof data.pokerWinnerUid === "string" ? data.pokerWinnerUid : undefined,
    pokerWinnerName: typeof data.pokerWinnerName === "string" ? data.pokerWinnerName : undefined,
    pokerWinnerUids: Array.isArray(data.pokerWinnerUids) ? data.pokerWinnerUids.filter((uid): uid is string => typeof uid === "string") : [],
    pokerWinnerNames: Array.isArray(data.pokerWinnerNames) ? data.pokerWinnerNames.filter((name): name is string => typeof name === "string") : [],
    pokerWinnerHandLabel: typeof data.pokerWinnerHandLabel === "string" ? data.pokerWinnerHandLabel : undefined,
    pokerWinnerHandCards: Array.isArray(data.pokerWinnerHandCards) ? data.pokerWinnerHandCards.filter((card): card is string => typeof card === "string") : [],
    pokerShowdownResults,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createOnlineRoom(user: CasinoUser, type: OnlineRoomType, game: string, invitedPlayer?: OnlineRoomPlayer) {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const player = casinoPlayer(user);
  const playerIds = invitedPlayer ? [user.uid, invitedPlayer.uid] : [user.uid];
  const room = await addDoc(collection(getFirestore(app), "onlineRooms"), {
    type,
    game,
    status: "waiting",
    hostUid: user.uid,
    hostName: player.displayName,
    players: [player],
    playerIds,
    maxPlayers: type === "poker" ? 6 : 2,
    invitedUid: invitedPlayer?.uid ?? "",
    invitedName: invitedPlayer?.displayName ?? "",
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
    pokerHandId: 0,
    pokerTurnUid: "",
    pokerTurnName: "",
    pokerWinnerUid: "",
    pokerWinnerName: "",
    pokerWinnerUids: [],
    pokerWinnerNames: [],
    pokerWinnerHandLabel: "",
    pokerWinnerHandCards: [],
    pokerShowdownResults: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return room.id;
}

export async function loadOnlineRooms(): Promise<OnlineRoomEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const roomsQuery = query(collection(getFirestore(app), "onlineRooms"), limit(20));
  const snapshot = await getDocs(roomsQuery);
  const now = Date.now();
  const parsedRooms = snapshot.docs.map((room) => parseOnlineRoom(room.id, room.data()));
  const staleWaitingRooms = parsedRooms.filter((room) => {
    const createdAt = timestampToMillis(room.createdAt);
    return room.status === "waiting" && createdAt !== null && now - createdAt > STALE_WAITING_ROOM_MS;
  });

  await Promise.allSettled(staleWaitingRooms.map((room) => deleteDoc(doc(getFirestore(app), "onlineRooms", room.id))));

  return parsedRooms
    .filter((room) => !staleWaitingRooms.some((staleRoom) => staleRoom.id === room.id))
    .filter((room) => room.hostUid && room.players.length > 0 && (room.status !== "finished" || room.type === "poker"));
}

export async function loadDuelHistory(userId: string): Promise<OnlineRoomEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const roomsQuery = query(collection(getFirestore(app), "onlineRooms"), where("type", "==", "duel"), limit(50));
  const snapshot = await getDocs(roomsQuery);

  return snapshot.docs
    .map((room) => parseOnlineRoom(room.id, room.data()))
    .filter((room) => room.status === "finished" && room.playerIds.includes(userId));
}

export async function loadDuelStats(userId: string): Promise<DuelStats> {
  const history = await loadDuelHistory(userId);
  const wins = history.filter((room) => room.winnerUid === userId).length;
  const losses = history.filter((room) => room.winnerUid && room.winnerUid !== userId).length;

  return {
    wins,
    losses,
    ratio: losses === 0 ? wins : wins / losses,
  };
}

export async function joinOnlineRoom(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.players.some((player) => player.uid === user.uid)) {
    return;
  }

  if (room.invitedUid && room.invitedUid !== user.uid && room.hostUid !== user.uid) {
    throw new Error("Ce duel est prive.");
  }

  if (room.players.length >= room.maxPlayers) {
    throw new Error("Ce salon est deja complet.");
  }

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    players: [...room.players, casinoPlayer(user)],
    playerIds: Array.from(new Set([...room.playerIds, user.uid])),
    updatedAt: serverTimestamp(),
  });
}

export async function leaveOnlineRoom(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (!room.players.some((player) => player.uid === user.uid)) {
    return;
  }

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    players: room.players.filter((player) => player.uid !== user.uid),
    playerIds: room.playerIds.filter((uid) => uid !== user.uid || room.invitedUid === uid),
    updatedAt: serverTimestamp(),
  });
}

export async function startDuelRoom(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "duel" || room.hostUid !== user.uid || room.players.length < 2) {
    throw new Error("Le duel ne peut pas encore etre lance.");
  }

  const duelScores = Object.fromEntries(room.players.map((player) => [player.uid, { rounds: [], total: 0 }]));

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    type: "duel",
    status: "playing",
    players: room.players,
    playerIds: Array.from(new Set([...room.playerIds, ...room.players.map((player) => player.uid)])),
    maxPlayers: room.maxPlayers,
    duelScores,
    winnerUid: "",
    winnerName: "",
    pokerPhase: room.pokerPhase || "waiting",
    pokerDeck: room.pokerDeck,
    pokerHands: room.pokerHands,
    communityCards: room.communityCards,
    foldedPlayerIds: room.foldedPlayerIds,
    pokerActions: room.pokerActions,
    pokerPot: room.pokerPot,
    pokerCurrentBet: room.pokerCurrentBet,
    pokerContributions: room.pokerContributions,
    pokerHandId: room.pokerHandId,
    pokerTurnUid: room.pokerTurnUid ?? "",
    pokerTurnName: room.pokerTurnName ?? "",
    pokerWinnerUid: room.pokerWinnerUid ?? "",
    pokerWinnerName: room.pokerWinnerName ?? "",
    pokerWinnerUids: room.pokerWinnerUids,
    pokerWinnerNames: room.pokerWinnerNames,
    pokerWinnerHandLabel: room.pokerWinnerHandLabel ?? "",
    pokerWinnerHandCards: room.pokerWinnerHandCards,
    pokerShowdownResults: room.pokerShowdownResults,
    updatedAt: serverTimestamp(),
  });
}

function createDuelRoundScore(game: string) {
  const roll = Math.random();
  const gameBoost = game.toLowerCase().includes("rocket") ? 35 : game.toLowerCase().includes("roulette") ? 20 : 28;

  if (roll < 0.18) {
    return -25;
  }

  if (roll > 0.9) {
    return 160 + Math.floor(Math.random() * (gameBoost + 90));
  }

  return Math.floor(Math.random() * 120) + gameBoost;
}

function createPokerDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const deck = suits.flatMap((suit) => ranks.map((rank) => `${rank}${suit}`));

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function createShowdownResults(room: OnlineRoomEntry, foldedPlayerIds = room.foldedPlayerIds) {
  const activePlayers = activePokerPlayers(room, foldedPlayerIds);
  const candidates = activePlayers.length ? activePlayers : room.players;
  const scoredCandidates = candidates.map((player) => ({
    player,
    score: evaluatePokerHand([...(room.pokerHands[player.uid] ?? []), ...room.communityCards]),
  }));
  const bestScore = scoredCandidates.reduce<ReturnType<typeof evaluatePokerHand> | null>(
    (best, candidate) => (!best || comparePokerHands(candidate.score, best) > 0 ? candidate.score : best),
    null,
  );
  const winnerUids = new Set(
    scoredCandidates.filter((candidate) => bestScore && comparePokerHands(candidate.score, bestScore) === 0).map((candidate) => candidate.player.uid),
  );

  return room.players.map((player) => {
    const folded = foldedPlayerIds.includes(player.uid);
    const score = folded ? null : evaluatePokerHand([...(room.pokerHands[player.uid] ?? []), ...room.communityCards]);

    return {
      uid: player.uid,
      displayName: player.displayName,
      folded,
      handLabel: folded ? "Couche" : score?.label ?? "",
      handCards: folded ? [] : score?.cards ?? [],
      isWinner: winnerUids.has(player.uid),
    };
  });
}

function activePokerPlayers(room: OnlineRoomEntry, foldedPlayerIds = room.foldedPlayerIds) {
  return room.players.filter((player) => !foldedPlayerIds.includes(player.uid));
}

function nextPokerTurn(room: OnlineRoomEntry, currentUid: string, foldedPlayerIds = room.foldedPlayerIds) {
  const activePlayers = activePokerPlayers(room, foldedPlayerIds);
  if (!activePlayers.length) {
    return null;
  }

  const currentIndex = Math.max(0, activePlayers.findIndex((player) => player.uid === currentUid));
  return activePlayers[(currentIndex + 1) % activePlayers.length];
}

function pokerActionSettlesTurn(action: string | undefined) {
  return action === "checked" || action === "called" || action === "raised" || action === "folded";
}

function allActivePokerPlayersSettled(
  room: OnlineRoomEntry,
  actions: Record<string, string>,
  contributions = room.pokerContributions,
  currentBet = room.pokerCurrentBet,
  foldedPlayerIds = room.foldedPlayerIds,
) {
  const activePlayers = activePokerPlayers(room, foldedPlayerIds);

  return (
    activePlayers.length > 0 &&
    activePlayers.every((player) => pokerActionSettlesTurn(actions[player.uid]) && (contributions[player.uid] ?? 0) >= currentBet)
  );
}

function foldedPokerActions(foldedPlayerIds: string[]) {
  return Object.fromEntries(foldedPlayerIds.map((uid) => [uid, "folded"]));
}

export async function startPokerRoom(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.hostUid !== user.uid || room.players.length < 2 || room.status === "playing") {
    throw new Error("La table ne peut pas encore etre lancee.");
  }

  const deck = createPokerDeck();
  const pokerHands: Record<string, string[]> = {};

  room.players.forEach((player) => {
    pokerHands[player.uid] = [deck.shift() ?? "", deck.shift() ?? ""].filter(Boolean);
  });

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    status: "playing",
    pokerPhase: "preflop",
    pokerDeck: deck,
    pokerHands,
    communityCards: [],
    foldedPlayerIds: [],
    pokerActions: {},
    pokerPot: room.players.length * 25,
    pokerCurrentBet: 0,
    pokerContributions: Object.fromEntries(room.players.map((player) => [player.uid, 0])),
    pokerHandId: room.pokerHandId + 1,
    pokerTurnUid: room.players[0]?.uid ?? "",
    pokerTurnName: room.players[0]?.displayName ?? "",
    pokerWinnerUid: "",
    pokerWinnerName: "",
    pokerWinnerUids: [],
    pokerWinnerNames: [],
    pokerWinnerHandLabel: "",
    pokerWinnerHandCards: [],
    pokerShowdownResults: [],
    updatedAt: serverTimestamp(),
  });
}

export async function advancePokerPhase(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.status !== "playing" || room.hostUid !== user.uid) {
    throw new Error("Seul l'hote peut avancer la table.");
  }

  if (!allActivePokerPlayersSettled(room, room.pokerActions)) {
    throw new Error("Tous les joueurs actifs doivent suivre la mise, checker ou se coucher.");
  }

  const deck = [...room.pokerDeck];
  const communityCards = [...room.communityCards];
  let nextPhase: PokerPhase = "flop";
  let nextStatus: OnlineRoomStatus = "playing";
  let winner = room.pokerWinnerUid ? { uid: room.pokerWinnerUid, displayName: room.pokerWinnerName || "Joueur anonyme" } : undefined;
  let winnerUids = room.pokerWinnerUids;
  let winnerNames = room.pokerWinnerNames;
  let winnerHandLabel = room.pokerWinnerHandLabel ?? "";
  let winnerHandCards = room.pokerWinnerHandCards;
  let showdownResults = room.pokerShowdownResults;

  if (room.pokerPhase === "preflop") {
    communityCards.push(...deck.splice(0, 3));
    nextPhase = "flop";
  } else if (room.pokerPhase === "flop") {
    communityCards.push(...deck.splice(0, 1));
    nextPhase = "turn";
  } else if (room.pokerPhase === "turn") {
    communityCards.push(...deck.splice(0, 1));
    nextPhase = "river";
  } else {
    nextPhase = "showdown";
    nextStatus = "finished";
    showdownResults = createShowdownResults(room);
    const winners = showdownResults.filter((result) => result.isWinner);
    winner = winners[0] ? { uid: winners[0].uid, displayName: winners[0].displayName } : undefined;
    winnerUids = winners.map((result) => result.uid);
    winnerNames = winners.map((result) => result.displayName);
    winnerHandLabel = winners.length > 1 ? "Egalite" : winners[0]?.handLabel ?? "";
    winnerHandCards = winners.length === 1 ? winners[0]?.handCards ?? [] : [];
  }

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    status: nextStatus,
    pokerPhase: nextPhase,
    pokerDeck: deck,
    communityCards,
    pokerActions: {},
    pokerCurrentBet: 0,
    pokerContributions: Object.fromEntries(activePokerPlayers(room).map((player) => [player.uid, 0])),
    pokerTurnUid: nextStatus === "playing" ? activePokerPlayers(room)[0]?.uid ?? "" : "",
    pokerTurnName: nextStatus === "playing" ? activePokerPlayers(room)[0]?.displayName ?? "" : "",
    pokerWinnerUid: winner?.uid ?? "",
    pokerWinnerName: winner?.displayName ?? "",
    pokerWinnerUids: winnerUids,
    pokerWinnerNames: winnerNames,
    pokerWinnerHandLabel: winnerHandLabel,
    pokerWinnerHandCards: winnerHandCards,
    pokerShowdownResults: showdownResults,
    updatedAt: serverTimestamp(),
  });
}

export async function checkPokerPlayer(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.status !== "playing" || room.pokerTurnUid !== user.uid) {
    throw new Error("Ce n'est pas ton tour.");
  }

  if (room.foldedPlayerIds.includes(user.uid)) {
    throw new Error("Tu es deja couche.");
  }

  if ((room.pokerContributions[user.uid] ?? 0) < room.pokerCurrentBet) {
    throw new Error("Tu dois suivre la mise ou te coucher.");
  }

  const pokerActions = {
    ...room.pokerActions,
    [user.uid]: "checked",
  };
  const nextTurn = nextPokerTurn(room, user.uid);
  const phaseDone = allActivePokerPlayersSettled(room, pokerActions);

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    pokerActions,
    pokerTurnUid: phaseDone ? "" : nextTurn?.uid ?? "",
    pokerTurnName: phaseDone ? "" : nextTurn?.displayName ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function callPokerPlayer(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.status !== "playing" || room.pokerTurnUid !== user.uid) {
    throw new Error("Ce n'est pas ton tour.");
  }

  if (room.foldedPlayerIds.includes(user.uid)) {
    throw new Error("Tu es deja couche.");
  }

  const currentContribution = room.pokerContributions[user.uid] ?? 0;
  const amountToCall = Math.max(0, room.pokerCurrentBet - currentContribution);

  if (amountToCall <= 0) {
    throw new Error("Il n'y a rien a suivre, tu peux checker.");
  }

  const pokerContributions = {
    ...room.pokerContributions,
    [user.uid]: room.pokerCurrentBet,
  };
  const pokerActions = {
    ...room.pokerActions,
    [user.uid]: "called",
  };
  const nextTurn = nextPokerTurn(room, user.uid);
  const phaseDone = allActivePokerPlayersSettled(room, pokerActions, pokerContributions);

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    pokerActions,
    pokerContributions,
    pokerPot: room.pokerPot + amountToCall,
    pokerTurnUid: phaseDone ? "" : nextTurn?.uid ?? "",
    pokerTurnName: phaseDone ? "" : nextTurn?.displayName ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function raisePokerPlayer(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.status !== "playing" || room.pokerTurnUid !== user.uid) {
    throw new Error("Ce n'est pas ton tour.");
  }

  if (room.foldedPlayerIds.includes(user.uid)) {
    throw new Error("Tu es deja couche.");
  }

  const newBet = room.pokerCurrentBet + 25;
  const currentContribution = room.pokerContributions[user.uid] ?? 0;
  const amountToPay = Math.max(0, newBet - currentContribution);
  const pokerContributions = {
    ...room.pokerContributions,
    [user.uid]: newBet,
  };
  const pokerActions = {
    ...foldedPokerActions(room.foldedPlayerIds),
    [user.uid]: "raised",
  };
  const nextTurn = nextPokerTurn(room, user.uid);

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    pokerActions,
    pokerCurrentBet: newBet,
    pokerContributions,
    pokerPot: room.pokerPot + amountToPay,
    pokerTurnUid: nextTurn?.uid ?? "",
    pokerTurnName: nextTurn?.displayName ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function foldPokerPlayer(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "poker" || room.status !== "playing" || !room.players.some((player) => player.uid === user.uid)) {
    throw new Error("Tu ne peux pas te coucher sur cette table.");
  }

  const foldedPlayerIds = Array.from(new Set([...room.foldedPlayerIds, user.uid]));
  const activePlayers = room.players.filter((player) => !foldedPlayerIds.includes(player.uid));
  const winner = activePlayers.length === 1 ? activePlayers[0] : undefined;
  const showdownResults = winner
    ? room.players.map((player) => ({
        uid: player.uid,
        displayName: player.displayName,
        folded: foldedPlayerIds.includes(player.uid),
        handLabel: player.uid === winner.uid ? "Adversaires couches" : "Couche",
        handCards: [],
        isWinner: player.uid === winner.uid,
      }))
    : room.pokerShowdownResults;
  const pokerActions = {
    ...room.pokerActions,
    [user.uid]: "folded",
  };
  const nextTurn = nextPokerTurn(room, user.uid, foldedPlayerIds);
  const phaseDone = allActivePokerPlayersSettled(room, pokerActions, room.pokerContributions, room.pokerCurrentBet, foldedPlayerIds);

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    foldedPlayerIds,
    pokerActions,
    status: winner ? "finished" : "playing",
    pokerPhase: winner ? "showdown" : room.pokerPhase,
    pokerTurnUid: winner || phaseDone ? "" : nextTurn?.uid ?? "",
    pokerTurnName: winner || phaseDone ? "" : nextTurn?.displayName ?? "",
    pokerWinnerUid: winner?.uid ?? room.pokerWinnerUid ?? "",
    pokerWinnerName: winner?.displayName ?? room.pokerWinnerName ?? "",
    pokerWinnerUids: winner ? [winner.uid] : room.pokerWinnerUids,
    pokerWinnerNames: winner ? [winner.displayName] : room.pokerWinnerNames,
    pokerWinnerHandLabel: winner ? "Adversaires couches" : room.pokerWinnerHandLabel ?? "",
    pokerWinnerHandCards: winner ? [] : room.pokerWinnerHandCards,
    pokerShowdownResults: showdownResults,
    updatedAt: serverTimestamp(),
  });
}

export async function playDuelRound(room: OnlineRoomEntry, user: CasinoUser) {
  const app = getFirebaseApp();
  if (!app) {
    return;
  }

  if (room.type !== "duel" || room.status !== "playing") {
    throw new Error("Ce duel n'est pas lance.");
  }

  if (!room.players.some((player) => player.uid === user.uid)) {
    throw new Error("Tu n'es pas dans ce duel.");
  }

  const currentScore = room.duelScores[user.uid] ?? { rounds: [], total: 0 };
  if (currentScore.rounds.length >= 3) {
    throw new Error("Tu as deja joue tes 3 manches.");
  }

  const roundScore = createDuelRoundScore(room.game);
  const nextScores = {
    ...room.duelScores,
    [user.uid]: {
      rounds: [...currentScore.rounds, roundScore],
      total: currentScore.total + roundScore,
    },
  };
  const finished = room.players.every((player) => (nextScores[player.uid]?.rounds.length ?? 0) >= 3);
  const winner = finished
    ? [...room.players].sort((left, right) => (nextScores[right.uid]?.total ?? 0) - (nextScores[left.uid]?.total ?? 0))[0]
    : undefined;

  await updateDoc(doc(getFirestore(app), "onlineRooms", room.id), {
    duelScores: nextScores,
    status: finished ? "finished" : "playing",
    winnerUid: winner?.uid ?? "",
    winnerName: winner?.displayName ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function loadLeaderboard(limitCount = 10): Promise<LeaderboardEntry[]> {
  const app = getFirebaseApp();
  if (!app) {
    return [];
  }

  const leaderboardQuery = query(collection(getFirestore(app), "leaderboard"), orderBy("balance", "desc"), limit(limitCount));
  const snapshot = await getDocs(leaderboardQuery);

  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      uid: String(data.uid ?? entry.id),
      displayName: typeof data.displayName === "string" ? data.displayName : "Joueur anonyme",
      balance: typeof data.balance === "number" && Number.isFinite(data.balance) ? data.balance : 0,
      inventory: Array.isArray(data.inventory)
        ? data.inventory
            .map((item) => ({
              id: typeof item?.id === "string" ? item.id : "",
              count: typeof item?.count === "number" && Number.isFinite(item.count) ? item.count : 0,
            }))
            .filter((item) => item.id && item.count > 0)
        : [],
      equippedSkins: data.equippedSkins && typeof data.equippedSkins === "object" ? (data.equippedSkins as Record<string, string>) : {},
      updatedAt: data.updatedAt,
    };
  });
}
