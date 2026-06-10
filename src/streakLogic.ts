export type DailyStreakState = {
  lastClaimDate: string;
  streak: number;
};

export const STREAK_REWARDS = [100, 200, 300, 450, 600, 800, 1000];

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDailyStreak(value: unknown): DailyStreakState {
  if (typeof value !== "object" || value === null) {
    return { lastClaimDate: "", streak: 0 };
  }

  const raw = value as Record<string, unknown>;
  const lastClaimDate =
    typeof raw.lastClaimDate === "string" && DATE_KEY_PATTERN.test(raw.lastClaimDate) ? raw.lastClaimDate : "";
  const streak =
    typeof raw.streak === "number" && Number.isFinite(raw.streak) ? Math.max(0, Math.floor(raw.streak)) : 0;

  return { lastClaimDate, streak };
}

export function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() - 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function streakReward(streak: number): number {
  const index = Math.min(Math.max(1, streak), STREAK_REWARDS.length) - 1;
  return STREAK_REWARDS[index];
}

export type StreakStatus = {
  claimedToday: boolean;
  nextStreak: number;
  nextReward: number;
  willReset: boolean;
};

export function getStreakStatus(state: DailyStreakState, todayKey: string): StreakStatus {
  const claimedToday = state.lastClaimDate === todayKey;
  const continues = state.lastClaimDate === previousDateKey(todayKey);
  const willReset = !claimedToday && state.streak > 0 && !continues;
  const nextStreak = claimedToday ? state.streak : continues ? state.streak + 1 : 1;

  return {
    claimedToday,
    nextStreak,
    nextReward: streakReward(nextStreak),
    willReset,
  };
}

export function claimDailyStreak(
  state: DailyStreakState,
  todayKey: string,
): { state: DailyStreakState; reward: number } {
  const status = getStreakStatus(state, todayKey);
  if (status.claimedToday) {
    return { state, reward: 0 };
  }

  return {
    state: { lastClaimDate: todayKey, streak: status.nextStreak },
    reward: status.nextReward,
  };
}

export type SoupState = {
  lastSoupAt: number;
};

export const SOUP_THRESHOLD = 50;
export const SOUP_AMOUNT = 200;
export const SOUP_COOLDOWN_MS = 86_400_000;
export const SOUP_TITLE_DURATION_MS = 86_400_000;

export function normalizeSoup(value: unknown): SoupState {
  if (typeof value !== "object" || value === null) {
    return { lastSoupAt: 0 };
  }

  const raw = value as Record<string, unknown>;
  const lastSoupAt =
    typeof raw.lastSoupAt === "number" && Number.isFinite(raw.lastSoupAt) ? Math.max(0, raw.lastSoupAt) : 0;

  return { lastSoupAt };
}

export function canClaimSoup(balance: number, state: SoupState, now: number): boolean {
  if (!Number.isFinite(balance) || balance > SOUP_THRESHOLD) {
    return false;
  }
  return now - state.lastSoupAt >= SOUP_COOLDOWN_MS;
}

export function isSoupTitleActive(soupAt: number | undefined, now: number): boolean {
  if (typeof soupAt !== "number" || !Number.isFinite(soupAt) || soupAt <= 0) {
    return false;
  }
  const elapsed = now - soupAt;
  return elapsed >= 0 && elapsed < SOUP_TITLE_DURATION_MS;
}
