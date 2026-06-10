export const ONLINE_WINDOW_MS = 300_000;

export type PresencePlayer = {
  uid: string;
  updatedAt?: unknown;
};

function presenceTimestampToMillis(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return typeof millis === "number" && Number.isFinite(millis) ? millis : 0;
  }

  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
}

export function isRecentlyActive(updatedAt: unknown, now: number, windowMs = ONLINE_WINDOW_MS) {
  const millis = presenceTimestampToMillis(updatedAt);
  if (millis <= 0) {
    return false;
  }

  return now - millis <= windowMs && millis <= now + windowMs;
}

export function listOnlineFriends<T extends PresencePlayer>(
  leaderboard: T[],
  friendUids: Iterable<string>,
  now: number,
): T[] {
  const friendSet = friendUids instanceof Set ? (friendUids as Set<string>) : new Set(friendUids);

  return leaderboard.filter((entry) => entry.uid && friendSet.has(entry.uid) && isRecentlyActive(entry.updatedAt, now));
}
