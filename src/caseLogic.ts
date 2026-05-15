import type { ShopItem, SkinCategory, SkinRarity } from "./shopLogic";

export type SpecialChestId = "nebula" | "royal" | "prism" | "orbital";

export type SpecialChestDefinition = {
  id: SpecialChestId;
  title: string;
  subtitle: string;
  price: number;
  keyName: string;
  fragmentName: string;
  theme: string;
  itemIds: string[];
};

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

export const SPECIAL_CHESTS: SpecialChestDefinition[] = [
  {
    id: "nebula",
    title: "Coffre Nebula",
    subtitle: "Skins exclusifs lumineux et cosmiques.",
    price: 260,
    keyName: "Cle Nebula",
    fragmentName: "Fragment Nebula",
    theme: "#8fd3ff",
    itemIds: ["plinko-galaxy-core"],
  },
  {
    id: "royal",
    title: "Coffre Royal",
    subtitle: "Skins exclusifs cartes et table premium.",
    price: 280,
    keyName: "Cle Royal",
    fragmentName: "Fragment Royal",
    theme: "#ffd166",
    itemIds: ["cards-joker-gold"],
  },
  {
    id: "prism",
    title: "Coffre Prism",
    subtitle: "Skins exclusifs brillants pour roulette.",
    price: 240,
    keyName: "Cle Prism",
    fragmentName: "Fragment Prism",
    theme: "#c58cff",
    itemIds: ["roulette-prism"],
  },
  {
    id: "orbital",
    title: "Coffre Orbital",
    subtitle: "Skins exclusifs pour Rocket Games.",
    price: 320,
    keyName: "Cle Orbital",
    fragmentName: "Fragment Orbital",
    theme: "#79e29f",
    itemIds: ["rocket-orbital-x"],
  },
];

export const RARITY_WEIGHTS: Record<SkinRarity, number> = {
  common: 62,
  rare: 25,
  epic: 10,
  legendary: 3,
};

export const DUPLICATE_REFUNDS: Record<SkinRarity, number> = {
  common: 0,
  rare: 0,
  epic: 0,
  legendary: 0,
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

  const caseItems = items.filter((item) => item.category === category && item.source !== "special");
  const item = pickCaseItem(caseItems, rng);
  const duplicate = ownedSkinIds.includes(item.id);
  const refund = 0;

  return {
    item,
    duplicate,
    refund,
    balance: balance - definition.cost,
    ownedSkinIds: [...ownedSkinIds, item.id],
  };
}

export function getSpecialChestDefinition(id: SpecialChestId): SpecialChestDefinition {
  const definition = SPECIAL_CHESTS.find((candidate) => candidate.id === id);

  if (!definition) {
    throw new Error(`Coffre special inconnu: ${id}`);
  }

  return definition;
}

export function openSpecialChest(
  ownedSkinIds: readonly string[],
  items: readonly ShopItem[],
  chestId: SpecialChestId,
  rng: () => number = Math.random,
) {
  const definition = getSpecialChestDefinition(chestId);
  const chestItems = definition.itemIds
    .map((itemId) => items.find((item) => item.id === itemId))
    .filter((item): item is ShopItem => Boolean(item));
  const item = pickCaseItem(chestItems, rng);
  const duplicate = ownedSkinIds.includes(item.id);

  return {
    item,
    duplicate,
    ownedSkinIds: [...ownedSkinIds, item.id],
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
