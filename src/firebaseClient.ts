import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

export type CasinoUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA95a2M9sm2ExwQNU3KFeMShp3tLYqmtCo",
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

  return onAuthStateChanged(getAuth(app), (user) => {
    onChange(user ? toCasinoUser(user) : null);
  });
}

export async function signInWithGoogle() {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error("Firebase n'est pas configure.");
  }

  await signInWithRedirect(getAuth(app), new GoogleAuthProvider());
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
