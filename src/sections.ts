export type MainSection =
  | "home"
  | "games"
  | "online"
  | "missions"
  | "cases"
  | "shop"
  | "inventory"
  | "bonus"
  | "friends"
  | "trades"
  | "messages"
  | "activity"
  | "admin";

export type CasinoGame = "slots" | "blackjack" | "plinko" | "roulette" | "rocket" | "claw" | "mines" | "hilo";

export type NavGroupId = "casino" | "multiplayer" | "collection" | "social";

export type NavGroup = {
  id: NavGroupId;
  label: string;
  emoji: string;
  sections: MainSection[];
};

export const NAV_GROUPS: NavGroup[] = [
  { id: "casino", label: "Casino", emoji: "🎰", sections: ["games"] },
  { id: "multiplayer", label: "Multijoueur", emoji: "⚔️", sections: ["online"] },
  { id: "collection", label: "Collection", emoji: "🎒", sections: ["cases", "shop", "inventory", "bonus"] },
  { id: "social", label: "Social", emoji: "👥", sections: ["friends", "trades", "messages", "activity"] },
];
