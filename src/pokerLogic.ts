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

export type PokerMode = "cash" | "sitngo";

export const POKER_DEFAULT_BUY_IN = 500;
export const POKER_SITNGO_STARTING_STACK = 1000;
export const POKER_BASE_SMALL_BLIND = 25;
export const POKER_DEFAULT_HANDS_PER_LEVEL = 4;

export type PokerBlindPositions = {
  smallBlindIndex: number;
  bigBlindIndex: number;
  firstToActIndex: number;
};

export function sitngoBlinds(level: number) {
  const multiplier = 2 ** Math.max(0, Math.floor(level));
  const smallBlind = POKER_BASE_SMALL_BLIND * multiplier;

  return {
    smallBlind,
    bigBlind: smallBlind * 2,
  };
}

export function sitngoBlindLevel(handId: number, handsPerLevel: number) {
  return Math.floor(Math.max(0, Math.floor(handId)) / Math.max(1, Math.floor(handsPerLevel)));
}

export function pokerBlindPositions(playerCount: number, dealerIndex: number): PokerBlindPositions {
  const count = Math.max(2, Math.floor(playerCount));
  const dealer = ((Math.floor(dealerIndex) % count) + count) % count;

  if (count === 2) {
    return {
      smallBlindIndex: dealer,
      bigBlindIndex: (dealer + 1) % count,
      firstToActIndex: dealer,
    };
  }

  return {
    smallBlindIndex: (dealer + 1) % count,
    bigBlindIndex: (dealer + 2) % count,
    firstToActIndex: (dealer + 3) % count,
  };
}

export function splitPokerPot(pot: number, winnerUids: string[]) {
  const shares: Record<string, number> = {};
  const winners = winnerUids.filter((uid) => uid);

  if (!winners.length || pot <= 0) {
    return shares;
  }

  const baseShare = Math.floor(pot / winners.length);
  const remainder = pot - baseShare * winners.length;

  winners.forEach((uid, index) => {
    shares[uid] = baseShare + (index === 0 ? remainder : 0);
  });

  return shares;
}

export type PokerRoomExtras = {
  mode: PokerMode;
  buyIn: number;
  stacks: Record<string, number>;
  smallBlind: number;
  bigBlind: number;
  dealerIndex: number;
  minRaise: number;
  blindLevel: number;
  handsPerLevel: number;
  eliminatedUids: string[];
};

function finiteNumberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parsePokerRoomExtras(raw: Record<string, unknown>): PokerRoomExtras {
  const data = raw && typeof raw === "object" ? raw : {};
  const rawStacks = data.pokerStacks && typeof data.pokerStacks === "object" ? (data.pokerStacks as Record<string, unknown>) : {};
  const stacks = Object.fromEntries(
    Object.entries(rawStacks).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
  const smallBlind = finiteNumberOr(data.pokerSmallBlind, POKER_BASE_SMALL_BLIND);
  const bigBlind = finiteNumberOr(data.pokerBigBlind, smallBlind * 2);

  return {
    mode: data.pokerMode === "sitngo" ? "sitngo" : "cash",
    buyIn: finiteNumberOr(data.pokerBuyIn, POKER_DEFAULT_BUY_IN),
    stacks,
    smallBlind,
    bigBlind,
    dealerIndex: finiteNumberOr(data.pokerDealerIndex, 0),
    minRaise: finiteNumberOr(data.pokerMinRaise, bigBlind),
    blindLevel: finiteNumberOr(data.pokerBlindLevel, 0),
    handsPerLevel: finiteNumberOr(data.pokerHandsPerLevel, POKER_DEFAULT_HANDS_PER_LEVEL),
    eliminatedUids: Array.isArray(data.pokerEliminatedUids)
      ? data.pokerEliminatedUids.filter((uid): uid is string => typeof uid === "string")
      : [],
  };
}
