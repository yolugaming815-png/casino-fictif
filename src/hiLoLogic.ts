import type { Card } from "./blackjackLogic";

export type HiLoGuess = "higher" | "lower";

export const HILO_HOUSE_EDGE = 0.97;

// Copies locales des suites/rangs de blackjackLogic (import type uniquement pour
// rester compatible avec node --test sans extension .ts cote tsc).
const HILO_SUITS: readonly Card["suit"][] = ["♠", "♥", "♦", "♣"];
const HILO_RANKS: readonly Card["rank"][] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function createHiLoDeck(): Card[] {
  return HILO_SUITS.flatMap((suit) => HILO_RANKS.map((rank) => ({ rank, suit })));
}

const RANK_VALUES: Record<Card["rank"], number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

export function cardValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

export function getHiLoCounts(card: Card): { higher: number; lower: number; tie: number } {
  const value = cardValue(card);

  return {
    higher: (13 - value) * 4,
    lower: (value - 1) * 4,
    tie: 3,
  };
}

export function getHiLoMultiplier(card: Card, guess: HiLoGuess): number | null {
  const counts = getHiLoCounts(card);
  const winCount = guess === "higher" ? counts.higher : counts.lower;

  if (winCount <= 0) {
    return null;
  }

  const raw = (HILO_HOUSE_EDGE * (counts.higher + counts.lower)) / winCount;
  return Math.round(raw * 100) / 100;
}

function pickUniform(cards: readonly Card[], rng: () => number): Card {
  const value = Math.min(Math.max(rng(), 0), 0.999999999);
  return cards[Math.floor(value * cards.length)];
}

export function drawHiLoCard(rng: () => number = Math.random): Card {
  return pickUniform(createHiLoDeck(), rng);
}

export function drawHiLoNextCard(current: Card, rng: () => number = Math.random): Card {
  const remaining = createHiLoDeck().filter(
    (card) => card.rank !== current.rank || card.suit !== current.suit,
  );

  return pickUniform(remaining, rng);
}

export function resolveHiLoGuess(current: Card, next: Card, guess: HiLoGuess): "win" | "push" | "lose" {
  const currentValue = cardValue(current);
  const nextValue = cardValue(next);

  if (nextValue === currentValue) {
    return "push";
  }

  const isHigher = nextValue > currentValue;
  return (guess === "higher") === isHigher ? "win" : "lose";
}
