export const CRASH_GROWTH = 1.0024;
export const CRASH_HOUSE_EDGE = 0.03;
export const CRASH_MAX_POINT = 250;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function crashMultiplierAt(elapsedMs: number): number {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return Math.floor(100 * Math.pow(CRASH_GROWTH, elapsed / 16)) / 100;
}

export function crashTimeForMultiplier(multiplier: number): number {
  const target = Number.isFinite(multiplier) ? Math.max(1, multiplier) : 1;
  return (16 * Math.log(target)) / Math.log(CRASH_GROWTH);
}

export function drawCrashPoint(rng: () => number = Math.random): number {
  const roll = rng();
  if (roll < CRASH_HOUSE_EDGE) {
    return 1;
  }

  return Math.min(CRASH_MAX_POINT, Math.floor((100 * (1 - CRASH_HOUSE_EDGE)) / (1 - roll)) / 100);
}

/**
 * Representation canonique du crash point : un entier de CENTIEMES (x1.13 -> 113).
 * Toute la chaine draw -> hash -> stockage -> reveal -> verify passe par cette
 * representation. INTERDIT de re-floorer un float deja arrondi (1.13 * 100 vaut
 * 112.999... en IEEE 754, Math.floor le casserait) : on arrondit toujours au
 * centieme le plus proche, ce qui est sans perte pour les valeurs k/100.
 */
export function crashPointToCents(value: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function normalizeCrashPoint(value: number): number {
  const cents = Math.min(CRASH_MAX_POINT * 100, Math.max(100, crashPointToCents(value)));
  return cents / 100;
}

export function formatCrashPoint(value: number): string {
  const cents = Math.max(0, crashPointToCents(value));
  return `${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, "0")}`;
}

export async function crashCommitment(crashPoint: number, salt: string): Promise<string> {
  const payload = new TextEncoder().encode(`${formatCrashPoint(crashPoint)}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return toHex(new Uint8Array(digest));
}

export async function verifyCrashCommitment(crashPoint: number, salt: string, hash: string): Promise<boolean> {
  const expected = await crashCommitment(crashPoint, salt);
  return expected === hash.trim().toLowerCase();
}

export function randomCrashSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}
