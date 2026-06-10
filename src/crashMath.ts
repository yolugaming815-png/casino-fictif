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

export async function crashCommitment(crashPoint: number, salt: string): Promise<string> {
  const payload = new TextEncoder().encode(`${crashPoint.toFixed(2)}:${salt}`);
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
