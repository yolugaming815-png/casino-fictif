export const CARD_SUITS = ["♠", "♥", "♦", "♣"] as const;
export const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type CardSuit = (typeof CARD_SUITS)[number];
export type CardRank = (typeof CARD_RANKS)[number];

export type Card = {
  rank: CardRank;
  suit: CardSuit;
};

export type BlackjackResult = "player_blackjack" | "player_win" | "push" | "dealer_win";

export type BlackjackPayout = {
  result: BlackjackResult;
  multiplier: number;
  payout: number;
  net: number;
  label: string;
};

export function createDeck(): Card[] {
  return CARD_SUITS.flatMap((suit) => CARD_RANKS.map((rank) => ({ rank, suit })));
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function drawCard(deck: Card[]): { card: Card; deck: Card[] } {
  const [card, ...remainingDeck] = deck;

  if (!card) {
    throw new Error("Le sabot est vide.");
  }

  return { card, deck: remainingDeck };
}

export function handValue(hand: readonly Card[]): number {
  let total = 0;
  let aceCount = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aceCount += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount -= 1;
  }

  return total;
}

export function isBlackjack(hand: readonly Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

export function isBust(hand: readonly Card[]): boolean {
  return handValue(hand) > 21;
}

export function dealerShouldDraw(hand: readonly Card[]): boolean {
  return handValue(hand) < 17;
}

export function compareHands(playerHand: readonly Card[], dealerHand: readonly Card[]): BlackjackResult {
  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);
  const playerNatural = isBlackjack(playerHand);
  const dealerNatural = isBlackjack(dealerHand);

  if (playerValue > 21) {
    return "dealer_win";
  }

  if (dealerValue > 21) {
    return playerNatural ? "player_blackjack" : "player_win";
  }

  if (playerNatural && !dealerNatural) {
    return "player_blackjack";
  }

  if (dealerNatural && !playerNatural) {
    return "dealer_win";
  }

  if (playerValue > dealerValue) {
    return "player_win";
  }

  if (playerValue < dealerValue) {
    return "dealer_win";
  }

  return "push";
}

export function calculateBlackjackPayout(
  bet: number,
  playerHand: readonly Card[],
  dealerHand: readonly Card[],
): BlackjackPayout {
  const result = compareHands(playerHand, dealerHand);
  const multiplier = getPayoutMultiplier(result);
  const payout = bet * multiplier;

  return {
    result,
    multiplier,
    payout,
    net: payout - bet,
    label: getResultLabel(result),
  };
}

function getPayoutMultiplier(result: BlackjackResult): number {
  if (result === "player_blackjack") {
    return 2.5;
  }

  if (result === "player_win") {
    return 2;
  }

  if (result === "push") {
    return 1;
  }

  return 0;
}

function getResultLabel(result: BlackjackResult): string {
  if (result === "player_blackjack") {
    return "Blackjack naturel";
  }

  if (result === "player_win") {
    return "Victoire";
  }

  if (result === "push") {
    return "Egalite";
  }

  return "Defaite";
}
