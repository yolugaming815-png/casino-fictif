export type SkinCategory = "plinkoBall" | "cardBack" | "rouletteBall" | "rocketShip";

export type ShopItem = {
  id: string;
  category: SkinCategory;
  name: string;
  description: string;
  price: number;
  preview: string;
};

export type EquippedSkins = Record<SkinCategory, string>;

export const DEFAULT_EQUIPPED_SKINS: EquippedSkins = {
  plinkoBall: "plinko-gold",
  cardBack: "cards-emerald",
  rouletteBall: "roulette-ivory",
  rocketShip: "rocket-classic",
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "plinko-gold",
    category: "plinkoBall",
    name: "Bille or",
    description: "Classique lumineuse pour le Plinko.",
    price: 0,
    preview: "#ffd166",
  },
  {
    id: "plinko-neon",
    category: "plinkoBall",
    name: "Bille neon",
    description: "Vert arcade, tres visible dans la grille.",
    price: 120,
    preview: "#79e29f",
  },
  {
    id: "plinko-ruby",
    category: "plinkoBall",
    name: "Bille rubis",
    description: "Rouge profond avec halo chaud.",
    price: 180,
    preview: "#ff6b6b",
  },
  {
    id: "plinko-ocean",
    category: "plinkoBall",
    name: "Bille ocean",
    description: "Bleu vif, lisible meme sur les collisions rapides.",
    price: 210,
    preview: "#5eb8f1",
  },
  {
    id: "plinko-lilac",
    category: "plinkoBall",
    name: "Bille lilas",
    description: "Teinte douce avec un halo plus froid.",
    price: 240,
    preview: "#c58cff",
  },
  {
    id: "plinko-mint",
    category: "plinkoBall",
    name: "Bille menthe",
    description: "Vert clair satine pour varier du neon.",
    price: 260,
    preview: "#9cf3d3",
  },
  {
    id: "cards-emerald",
    category: "cardBack",
    name: "Dos emeraude",
    description: "Motif casino sobre pour le blackjack.",
    price: 0,
    preview: "#2f5f53",
  },
  {
    id: "cards-midnight",
    category: "cardBack",
    name: "Dos minuit",
    description: "Bleu nuit avec grille fine.",
    price: 150,
    preview: "#263a80",
  },
  {
    id: "cards-royal",
    category: "cardBack",
    name: "Dos royal",
    description: "Violet sombre et accents dores.",
    price: 220,
    preview: "#6541a5",
  },
  {
    id: "cards-sunset",
    category: "cardBack",
    name: "Dos couchant",
    description: "Rouge ambre avec des lignes plus chaudes.",
    price: 250,
    preview: "#d86642",
  },
  {
    id: "cards-obsidian",
    category: "cardBack",
    name: "Dos obsidienne",
    description: "Noir profond avec reflets acier.",
    price: 280,
    preview: "#222936",
  },
  {
    id: "cards-aqua",
    category: "cardBack",
    name: "Dos aqua",
    description: "Cyan mineral au rendu plus lumineux.",
    price: 300,
    preview: "#2a9db7",
  },
  {
    id: "roulette-ivory",
    category: "rouletteBall",
    name: "Bille ivoire",
    description: "La bille standard de roulette.",
    price: 0,
    preview: "#f9f7ef",
  },
  {
    id: "roulette-sapphire",
    category: "rouletteBall",
    name: "Bille saphir",
    description: "Bleu clair avec reflet froid.",
    price: 160,
    preview: "#7cc7ff",
  },
  {
    id: "roulette-sun",
    category: "rouletteBall",
    name: "Bille solaire",
    description: "Jaune vif pour suivre la trajectoire.",
    price: 200,
    preview: "#ffd166",
  },
  {
    id: "roulette-rose",
    category: "rouletteBall",
    name: "Bille rose",
    description: "Rose framboise tres visible sur la roue.",
    price: 220,
    preview: "#ff8fb1",
  },
  {
    id: "roulette-jade",
    category: "rouletteBall",
    name: "Bille jade",
    description: "Vert profond avec une lueur nette.",
    price: 250,
    preview: "#56d39a",
  },
  {
    id: "roulette-violet",
    category: "rouletteBall",
    name: "Bille violette",
    description: "Violet clair pour un contraste plus original.",
    price: 280,
    preview: "#b58cff",
  },
  {
    id: "rocket-classic",
    category: "rocketShip",
    name: "Fusee classique",
    description: "Coque claire et flamme ambree.",
    price: 0,
    preview: "#f9f7ef",
  },
  {
    id: "rocket-comet",
    category: "rocketShip",
    name: "Fusee comete",
    description: "Bleu glacial et propulsion cyan.",
    price: 260,
    preview: "#7cc7ff",
  },
  {
    id: "rocket-solar",
    category: "rocketShip",
    name: "Fusee solaire",
    description: "Jaune chaud avec accents rouges.",
    price: 320,
    preview: "#ffd166",
  },
  {
    id: "rocket-nebula",
    category: "rocketShip",
    name: "Fusee nebuleuse",
    description: "Violet profond avec halo rose.",
    price: 380,
    preview: "#b58cff",
  },
];

export function buySkin(balance: number, ownedSkinIds: readonly string[], item: ShopItem) {
  if (ownedSkinIds.includes(item.id)) {
    return { balance, ownedSkinIds: [...ownedSkinIds], purchased: false, reason: "owned" as const };
  }

  if (balance < item.price) {
    return { balance, ownedSkinIds: [...ownedSkinIds], purchased: false, reason: "balance" as const };
  }

  return {
    balance: balance - item.price,
    ownedSkinIds: [...ownedSkinIds, item.id],
    purchased: true,
    reason: "ok" as const,
  };
}

export function equipSkin(equipped: EquippedSkins, item: ShopItem): EquippedSkins {
  return {
    ...equipped,
    [item.category]: item.id,
  };
}

export function getShopItem(id: string): ShopItem {
  const item = SHOP_ITEMS.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Skin inconnu: ${id}`);
  }

  return item;
}
