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
