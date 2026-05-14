export const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "7️⃣", "💎", "🍀", "🍉"] as const;
export const BET_OPTIONS = [10, 25, 50, 100] as const;
export const INITIAL_BALANCE = 1000;

export type SlotSymbol = (typeof SYMBOLS)[number];
export type Bet = (typeof BET_OPTIONS)[number];
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
  return balance >= bet;
}

function pickSymbol(rng: () => number): SlotSymbol {
  const value = Math.min(Math.max(rng(), 0), 0.999999999);
  return SYMBOLS[Math.floor(value * SYMBOLS.length)];
}

function getOutcomeLabel(multiplier: number): string {
  if (multiplier === 0) {
    return "Perte de la mise";
  }

  return `Gain x${multiplier}`;
}
