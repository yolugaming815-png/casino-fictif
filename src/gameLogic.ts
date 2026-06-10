export const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "7️⃣", "💎", "🍀", "🍉"] as const;
export const MIN_BET = 10;
export const BET_OPTIONS = [10, 25, 50, 100] as const;
export const INITIAL_BALANCE = 1000;

export type SlotSymbol = (typeof SYMBOLS)[number];
export type Bet = number;
export type Reels = readonly [SlotSymbol, SlotSymbol, SlotSymbol];

export type SpinOutcome = {
  reels: Reels;
  multiplier: number;
  payout: number;
  net: number;
  label: string;
};

export function createReels(rng: () => number = Math.random): Reels {
  return [pickSymbol(rng), pickSymbol(rng), pickSymbol(rng)];
}

export function evaluateReels(reels: Reels, bet: number): SpinOutcome {
  const multiplier = getMultiplier(reels);
  const payout = bet * multiplier;

  return {
    reels,
    multiplier,
    payout,
    net: payout - bet,
    label: getOutcomeLabel(multiplier),
  };
}

export function spin(bet: number, rng: () => number = Math.random): SpinOutcome {
  return evaluateReels(createReels(rng), bet);
}

export function getMultiplier(reels: Reels): number {
  const [first, second, third] = reels;

  if (first === "7️⃣" && second === "7️⃣" && third === "7️⃣") {
    return 50;
  }

  if (first === "⭐" && second === "⭐" && third === "⭐") {
    return 20;
  }

  if (first === second && second === third) {
    return 10;
  }

  if (first === second || first === third || second === third) {
    return 2;
  }

  return 0;
}

export function canPlaceBet(balance: number, bet: number): boolean {
  return Number.isFinite(bet) && bet >= MIN_BET && balance >= bet;
}

export const WILD_SYMBOL = "🃏";
export const SYMBOLS_V2 = [...SYMBOLS, WILD_SYMBOL] as const;

export type SlotSymbolV2 = (typeof SYMBOLS_V2)[number];
export type ReelsV2 = readonly [SlotSymbolV2, SlotSymbolV2, SlotSymbolV2];

export const SLOT_SYMBOL_WEIGHTS: Record<SlotSymbolV2, number> = {
  "🍒": 4,
  "🍋": 4,
  "🔔": 4,
  "⭐": 4,
  "7️⃣": 4,
  "💎": 4,
  "🍀": 4,
  "🍉": 4,
  "🃏": 1,
};

export const JACKPOT_CONTRIBUTION_RATE = 0.01;
export const FREE_SPINS_AWARDED = 3;

export type SpinOutcomeV2 = Omit<SpinOutcome, "reels"> & {
  reels: ReelsV2;
  wildAssisted: boolean;
  freeSpinsWon: number;
  jackpotWon: boolean;
};

const SLOT_TOTAL_WEIGHT = SYMBOLS_V2.reduce((total, symbol) => total + SLOT_SYMBOL_WEIGHTS[symbol], 0);

export function createReelsV2(rng: () => number = Math.random): ReelsV2 {
  return [pickSymbolV2(rng), pickSymbolV2(rng), pickSymbolV2(rng)];
}

export function evaluateReelsV2(reels: ReelsV2, bet: number): SpinOutcomeV2 {
  const wilds = reels.filter((symbol) => symbol === WILD_SYMBOL).length;
  const naturals = reels.filter((symbol): symbol is SlotSymbol => symbol !== WILD_SYMBOL);
  const naturalStars = naturals.filter((symbol) => symbol === "⭐").length;
  const diamonds = naturals.filter((symbol) => symbol === "💎").length;
  const freeSpinsWon = naturalStars >= 2 ? FREE_SPINS_AWARDED : 0;
  const jackpotWon = diamonds > 0 && diamonds + wilds === 3;
  const multiplier = getMultiplierV2(reels);
  const payout = bet * multiplier;

  return {
    reels,
    multiplier,
    payout,
    net: payout - bet,
    label: getOutcomeLabelV2(multiplier, freeSpinsWon),
    wildAssisted: wilds > 0 && multiplier > 0,
    freeSpinsWon,
    jackpotWon,
  };
}

export function spinV2(bet: number, rng: () => number = Math.random): SpinOutcomeV2 {
  return evaluateReelsV2(createReelsV2(rng), bet);
}

export function getJackpotContribution(bet: number): number {
  return bet * JACKPOT_CONTRIBUTION_RATE;
}

function pickSymbol(rng: () => number): SlotSymbol {
  const value = Math.min(Math.max(rng(), 0), 0.999999999);
  return SYMBOLS[Math.floor(value * SYMBOLS.length)];
}

function pickSymbolV2(rng: () => number): SlotSymbolV2 {
  const value = Math.min(Math.max(rng(), 0), 0.999999999);
  let remaining = Math.floor(value * SLOT_TOTAL_WEIGHT);

  for (const symbol of SYMBOLS_V2) {
    remaining -= SLOT_SYMBOL_WEIGHTS[symbol];

    if (remaining < 0) {
      return symbol;
    }
  }

  return WILD_SYMBOL;
}

function getMultiplierV2(reels: ReelsV2): number {
  const wilds = reels.filter((symbol) => symbol === WILD_SYMBOL).length;
  const naturals = reels.filter((symbol): symbol is SlotSymbol => symbol !== WILD_SYMBOL);

  if (wilds === 3) {
    return 20;
  }

  const [first, second, third] = naturals;
  const allNaturalsMatch = naturals.every((symbol) => symbol === first);

  if (allNaturalsMatch) {
    const base = getNaturalTripleMultiplier(first);
    return wilds === 0 ? base : Math.ceil(base / 2);
  }

  if (wilds === 0 && (first === second || first === third || second === third)) {
    const pairSymbol = first === second || first === third ? first : second;
    return pairSymbol === "⭐" ? 0 : 2;
  }

  return 0;
}

function getNaturalTripleMultiplier(symbol: SlotSymbol): number {
  if (symbol === "7️⃣") {
    return 50;
  }

  if (symbol === "⭐") {
    return 20;
  }

  return 10;
}

function getOutcomeLabelV2(multiplier: number, freeSpinsWon: number): string {
  const base = multiplier > 0 ? `Gain x${multiplier}` : "Perte de la mise";

  if (freeSpinsWon > 0) {
    return multiplier > 0 ? `${base} + ${freeSpinsWon} tours gratuits` : `${freeSpinsWon} tours gratuits`;
  }

  return base;
}

function getOutcomeLabel(multiplier: number): string {
  if (multiplier === 0) {
    return "Perte de la mise";
  }

  return `Gain x${multiplier}`;
}
