import type { ShopItem, SkinCategory, SkinRarity } from "./shopLogic";

export type CaseDefinition = {
  id: SkinCategory;
  title: string;
  subtitle: string;
  cost: number;
};

export type CaseOpeningOutcome = {
  item: ShopItem;
  duplicate: boolean;
  refund: number;
  balance: number;
  ownedSkinIds: string[];
};

export const CASES: CaseDefinition[] = [
  {
    id: "plinkoBall",
    title: "Caisse Plinko",
    subtitle: "Billes pour personnaliser la descente.",
    cost: 90,
  },
  {
    id: "cardBack",
    title: "Caisse Blackjack",
    subtitle: "Dos de cartes pour les tables.",
    cost: 100,
  },
  {
    id: "rouletteBall",
    title: "Caisse Roulette",
    subtitle: "Billes visuelles pour la roue.",
    cost: 95,
  },
  {
    id: "rocketShip",
    title: "Caisse Rocket Games",
    subtitle: "Fusees cosmetiques pour les vols.",
    cost: 120,
  },
];

export const RARITY_WEIGHTS: Record<SkinRarity, number> = {
  common: 62,
  rare: 25,
  epic: 10,
  legendary: 3,
};

export const DUPLICATE_REFUNDS: Record<SkinRarity, number> = {
  common: 25,
  rare: 55,
  epic: 95,
  legendary: 150,
};

export function openCase(
  balance: number,
  ownedSkinIds: readonly string[],
  items: readonly ShopItem[],
  category: SkinCategory,
  rng: () => number = Math.random,
): CaseOpeningOutcome | null {
  const definition = getCaseDefinition(category);

  if (balance < definition.cost) {
    return null;
  }

  const caseItems = items.filter((item) => item.category === category);
  const item = pickCaseItem(caseItems, rng);
  const duplicate = ownedSkinIds.includes(item.id);
  const refund = duplicate ? DUPLICATE_REFUNDS[item.rarity] : 0;

  return {
    item,
    duplicate,
    refund,
    balance: balance - definition.cost + refund,
    ownedSkinIds: duplicate ? [...ownedSkinIds] : [...ownedSkinIds, item.id],
  };
}

export function pickCaseItem(items: readonly ShopItem[], rng: () => number = Math.random): ShopItem {
  if (items.length === 0) {
    throw new Error("Aucun skin disponible pour cette caisse.");
  }

  const totalWeight = items.reduce((sum, item) => sum + RARITY_WEIGHTS[item.rarity], 0);
  let roll = Math.min(Math.max(rng(), 0), 0.999999999) * totalWeight;

  for (const item of items) {
    roll -= RARITY_WEIGHTS[item.rarity];

    if (roll <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

export function getCaseDefinition(category: SkinCategory): CaseDefinition {
  const definition = CASES.find((candidate) => candidate.id === category);

  if (!definition) {
    throw new Error(`Caisse inconnue: ${category}`);
  }

  return definition;
}
