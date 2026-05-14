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

export type OnlineRoomType = "duel" | "poker";
export type OnlineRoomStatus = "waiting" | "playing" | "finished";

export type OnlineRoomPlayer = {
  uid: string;
  displayName: string;
};

export type DuelPlayerScore = {
  rounds: number[];
  total: number;
};

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
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type DuelStats = {
  wins: number;
  losses: number;
  ratio: number;
};

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

function casinoPlayer(user: CasinoUser): OnlineRoomPlayer {
  return {
    uid: user.uid,
    displayName: user.displayName || "Joueur anonyme",
  };
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

  return snapshot.docs
    .map((room) => parseOnlineRoom(room.id, room.data()))
    .filter((room) => room.hostUid && room.players.length > 0 && room.status !== "finished");
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
    status: "playing",
    duelScores,
    winnerUid: "",
    winnerName: "",
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
