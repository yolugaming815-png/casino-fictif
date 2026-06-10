export type Settlement = {
  key: string;
  delta: number;
  message: string;
};

const MAX_SETTLED_KEYS = 500;

function getLocalStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

export function loadSettledKeys(storageKey: string): Set<string> {
  const storage = getLocalStorage();
  if (!storage) {
    return new Set();
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((key): key is string => typeof key === "string"));
  } catch {
    return new Set();
  }
}

export function rememberSettledKey(storageKey: string, key: string): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    const keys = [...loadSettledKeys(storageKey)].filter((settledKey) => settledKey !== key);
    keys.push(key);
    storage.setItem(storageKey, JSON.stringify(keys.slice(-MAX_SETTLED_KEYS)));
  } catch {
    // Stockage indisponible ou plein : on ignore, le pire cas est un re-reglement evite par les guards Firestore.
  }
}
