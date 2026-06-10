import { BET_OPTIONS } from "./gameLogic";

export type ProgressionState = {
  xp: number;
  lastLevelSeen: number;
};

export const MAX_LEVEL = 99;

const LEVEL_TITLES: Array<{ level: number; title: string }> = [
  { level: 1, title: "Novice" },
  { level: 3, title: "Habitué" },
  { level: 5, title: "Flambeur" },
  { level: 8, title: "Gros Joueur" },
  { level: 10, title: "High Roller" },
  { level: 13, title: "Magnat" },
  { level: 16, title: "Nabab" },
  { level: 20, title: "Légende du Casino" },
];

const EXTRA_AD_LEVELS = [5, 10, 15];
const PRESTIGE_CHEST_LEVEL = 10;

const BET_UNLOCKS: Array<{ level: number; bet: number }> = [
  { level: 2, bet: 150 },
  { level: 7, bet: 250 },
  { level: 12, bet: 500 },
  { level: 20, bet: 1000 },
];

export function levelUpCost(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(500 * Math.pow(safeLevel, 1.6));
}

export function totalXpForLevel(level: number): number {
  const target = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  let total = 0;
  for (let current = 1; current < target; current += 1) {
    total += levelUpCost(current);
  }
  return total;
}

export function levelFromXp(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let level = 1;
  while (level < MAX_LEVEL && safeXp >= totalXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export function xpProgress(xp: number): {
  level: number;
  current: number;
  required: number;
  ratio: number;
} {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const level = levelFromXp(safeXp);
  const required = levelUpCost(level);

  if (level >= MAX_LEVEL) {
    return { level, current: required, required, ratio: 1 };
  }

  const current = safeXp - totalXpForLevel(level);
  const ratio = required > 0 ? Math.max(0, Math.min(1, current / required)) : 1;
  return { level, current, required, ratio };
}

export function xpForWager(bet: number): number {
  return Math.max(1, Math.round(bet));
}

export function addXp(state: ProgressionState, amount: number): ProgressionState {
  const gain = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (gain === 0) {
    return state;
  }

  return { ...state, xp: state.xp + gain };
}

export function normalizeProgression(value: unknown): ProgressionState {
  const fallback: ProgressionState = { xp: 0, lastLevelSeen: 1 };
  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const record = value as { xp?: unknown; lastLevelSeen?: unknown };
  const xp =
    typeof record.xp === "number" && Number.isFinite(record.xp)
      ? Math.max(0, Math.floor(record.xp))
      : 0;
  const lastLevelSeen =
    typeof record.lastLevelSeen === "number" && Number.isFinite(record.lastLevelSeen)
      ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(record.lastLevelSeen)))
      : 1;

  return { xp, lastLevelSeen };
}

export function levelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level));
  let title = LEVEL_TITLES[0].title;
  for (const entry of LEVEL_TITLES) {
    if (safeLevel >= entry.level) {
      title = entry.title;
    }
  }
  return title;
}

export type LevelPerks = {
  maxBet: number;
  extraDailyAds: number;
  prestigeChestUnlocked: boolean;
};

export function availableBets(level: number): number[] {
  const safeLevel = Math.max(1, Math.floor(level));
  const bets = [...BET_OPTIONS] as number[];
  for (const unlock of BET_UNLOCKS) {
    if (safeLevel >= unlock.level) {
      bets.push(unlock.bet);
    }
  }
  return bets;
}

export function levelPerks(level: number): LevelPerks {
  const safeLevel = Math.max(1, Math.floor(level));
  const bets = availableBets(safeLevel);
  const extraDailyAds = EXTRA_AD_LEVELS.filter((threshold) => safeLevel >= threshold).length;

  return {
    maxBet: bets[bets.length - 1],
    extraDailyAds,
    prestigeChestUnlocked: safeLevel >= PRESTIGE_CHEST_LEVEL,
  };
}
