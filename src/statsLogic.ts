export type GameStatsKey =
  | "slots"
  | "blackjack"
  | "plinko"
  | "roulette"
  | "rocket"
  | "claw"
  | "cases"
  | "mines"
  | "hilo";

export type GameStats = {
  plays: number;
  totalProfit: number;
  biggestWin: number;
  biggestLoss: number;
  currentStreak: number;
  bestStreak: number;
};

export type GameStatsState = Record<GameStatsKey, GameStats>;

export const GAME_STATS_KEYS: GameStatsKey[] = [
  "slots",
  "blackjack",
  "plinko",
  "roulette",
  "rocket",
  "claw",
  "cases",
  "mines",
  "hilo",
];

function emptyGameStats(): GameStats {
  return {
    plays: 0,
    totalProfit: 0,
    biggestWin: 0,
    biggestLoss: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function emptyGameStatsState(): GameStatsState {
  const state = {} as GameStatsState;
  for (const key of GAME_STATS_KEYS) {
    state[key] = emptyGameStats();
  }
  return state;
}

function sanitizeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.round(value);
}

function sanitizeGameStats(value: unknown): GameStats {
  if (typeof value !== "object" || value === null) {
    return emptyGameStats();
  }

  const raw = value as Record<string, unknown>;
  const plays = Math.max(0, sanitizeNumber(raw.plays, 0));
  const totalProfit = sanitizeNumber(raw.totalProfit, 0);
  const biggestWin = Math.max(0, sanitizeNumber(raw.biggestWin, 0));
  const biggestLoss = Math.min(0, sanitizeNumber(raw.biggestLoss, 0));
  const currentStreak = Math.max(0, sanitizeNumber(raw.currentStreak, 0));
  const bestStreak = Math.max(currentStreak, Math.max(0, sanitizeNumber(raw.bestStreak, 0)));

  return { plays, totalProfit, biggestWin, biggestLoss, currentStreak, bestStreak };
}

export function normalizeGameStatsState(value: unknown): GameStatsState {
  const state = emptyGameStatsState();
  if (typeof value !== "object" || value === null) {
    return state;
  }

  const raw = value as Record<string, unknown>;
  for (const key of GAME_STATS_KEYS) {
    state[key] = sanitizeGameStats(raw[key]);
  }
  return state;
}

export function recordGameResult(state: GameStatsState, game: GameStatsKey, net: number): GameStatsState {
  const previous = state[game] ?? emptyGameStats();
  const roundedNet = Math.round(Number.isFinite(net) ? net : 0);

  const currentStreak = roundedNet > 0 ? previous.currentStreak + 1 : roundedNet < 0 ? 0 : previous.currentStreak;

  const updated: GameStats = {
    plays: previous.plays + 1,
    totalProfit: previous.totalProfit + roundedNet,
    biggestWin: roundedNet > 0 ? Math.max(previous.biggestWin, roundedNet) : previous.biggestWin,
    biggestLoss: roundedNet < 0 ? Math.min(previous.biggestLoss, roundedNet) : previous.biggestLoss,
    currentStreak,
    bestStreak: Math.max(previous.bestStreak, currentStreak),
  };

  return { ...state, [game]: updated };
}

export type PublicGameStats = Partial<
  Record<GameStatsKey, { plays: number; profit: number; bestWin: number; bestStreak: number }>
>;

export function buildPublicStats(state: GameStatsState): PublicGameStats {
  const publicStats: PublicGameStats = {};
  for (const key of GAME_STATS_KEYS) {
    const stats = state[key];
    if (!stats || stats.plays <= 0) {
      continue;
    }
    publicStats[key] = {
      plays: stats.plays,
      profit: stats.totalProfit,
      bestWin: stats.biggestWin,
      bestStreak: stats.bestStreak,
    };
  }
  return publicStats;
}
