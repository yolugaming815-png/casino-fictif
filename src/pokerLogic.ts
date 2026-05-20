export type PokerHandRank =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-kind"
  | "straight-flush";

export type PokerHandResult = {
  rank: PokerHandRank;
  label: string;
  score: number[];
  cards: string[];
};

type ParsedCard = {
  card: string;
  rank: string;
  value: number;
  suit: string;
};

const RANK_VALUES: Record<string, number> = {
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
  A: 14,
};

const RANK_LABELS: Record<PokerHandRank, string> = {
  "high-card": "Carte haute",
  pair: "Paire",
  "two-pair": "Double paire",
  "three-kind": "Brelan",
  straight: "Suite",
  flush: "Couleur",
  "full-house": "Full",
  "four-kind": "Carre",
  "straight-flush": "Suite couleur",
};

function parseCard(card: string): ParsedCard | null {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const value = RANK_VALUES[rank];

  if (!value || !suit) {
    return null;
  }

  return { card, rank, value, suit };
}

function compareScore(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

export function comparePokerHands(left: PokerHandResult, right: PokerHandResult) {
  return compareScore(left.score, right.score);
}

function straightHigh(values: number[]) {
  const uniqueValues = Array.from(new Set(values)).sort((left, right) => left - right);

  if (uniqueValues.includes(14)) {
    uniqueValues.unshift(1);
  }

  let high = 0;
  for (let index = 0; index <= uniqueValues.length - 5; index += 1) {
    const window = uniqueValues.slice(index, index + 5);

    if (window.every((value, offset) => offset === 0 || value === window[offset - 1] + 1)) {
      high = Math.max(high, window[4]);
    }
  }

  return high;
}

function scoreFiveCards(cards: ParsedCard[]): PokerHandResult {
  const values = cards.map((card) => card.value).sort((left, right) => right - left);
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  const groups = Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || right[0] - left[0]);
  const isFlush = cards.every((card) => card.suit === cards[0]?.suit);
  const highStraight = straightHigh(values);
  let rank: PokerHandRank = "high-card";
  let score: number[] = [0, ...values];

  if (isFlush && highStraight) {
    rank = "straight-flush";
    score = [8, highStraight];
  } else if (groups[0]?.[1] === 4) {
    const fourValue = groups[0][0];
    const kicker = values.find((value) => value !== fourValue) ?? 0;
    rank = "four-kind";
    score = [7, fourValue, kicker];
  } else if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
    rank = "full-house";
    score = [6, groups[0][0], groups[1][0]];
  } else if (isFlush) {
    rank = "flush";
    score = [5, ...values];
  } else if (highStraight) {
    rank = "straight";
    score = [4, highStraight];
  } else if (groups[0]?.[1] === 3) {
    const threeValue = groups[0][0];
    const kickers = values.filter((value) => value !== threeValue);
    rank = "three-kind";
    score = [3, threeValue, ...kickers];
  } else if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
    const pairValues = groups.slice(0, 2).map(([value]) => value).sort((left, right) => right - left);
    const kicker = values.find((value) => !pairValues.includes(value)) ?? 0;
    rank = "two-pair";
    score = [2, ...pairValues, kicker];
  } else if (groups[0]?.[1] === 2) {
    const pairValue = groups[0][0];
    const kickers = values.filter((value) => value !== pairValue);
    rank = "pair";
    score = [1, pairValue, ...kickers];
  }

  return {
    rank,
    label: RANK_LABELS[rank],
    score,
    cards: cards.map((card) => card.card),
  };
}

function fiveCardCombinations(cards: ParsedCard[]) {
  const combinations: ParsedCard[][] = [];

  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            combinations.push([cards[first], cards[second], cards[third], cards[fourth], cards[fifth]]);
          }
        }
      }
    }
  }

  return combinations;
}

export function evaluatePokerHand(cards: string[]): PokerHandResult {
  const parsedCards = cards.map(parseCard).filter((card): card is ParsedCard => card !== null);

  if (parsedCards.length < 5) {
    return {
      rank: "high-card",
      label: RANK_LABELS["high-card"],
      score: [0],
      cards: parsedCards.map((card) => card.card),
    };
  }

  return fiveCardCombinations(parsedCards).reduce<PokerHandResult | null>((bestHand, combination) => {
    const candidate = scoreFiveCards(combination);
    return !bestHand || comparePokerHands(candidate, bestHand) > 0 ? candidate : bestHand;
  }, null) as PokerHandResult;
}

export function completeCommunityCards(deck: string[], communityCards: string[], targetCount = 5) {
  const nextDeck = [...deck];
  const nextCommunityCards = [...communityCards];

  while (nextCommunityCards.length < targetCount && nextDeck.length > 0) {
    const nextCard = nextDeck.shift();

    if (nextCard) {
      nextCommunityCards.push(nextCard);
    }
  }

  return {
    deck: nextDeck,
    communityCards: nextCommunityCards,
  };
}
