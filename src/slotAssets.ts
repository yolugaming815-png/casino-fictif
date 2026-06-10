import type { SlotSymbolV2 } from "./gameLogic";

type SlotSymbolAsset = {
  image: string;
  label: string;
};

const WILD_SYMBOL_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="#1d1530"/><rect x="6" y="6" width="84" height="84" rx="14" fill="none" stroke="#8b5cf6" stroke-width="2"/><text x="48" y="64" font-size="48" text-anchor="middle">🃏</text></svg>',
)}`;

export type SlotResultAssetId = "jackpotSeven" | "tripleStar" | "threeMatch" | "pair" | "noPair";

export const SLOT_SYMBOL_ASSETS = {
  "🍒": {
    image: new URL("./assets/slots/slot-cherries.png", import.meta.url).href,
    label: "Cerises rubis",
  },
  "🍋": {
    image: new URL("./assets/slots/slot-lemon.png", import.meta.url).href,
    label: "Citron dore",
  },
  "🔔": {
    image: new URL("./assets/slots/slot-bell.png", import.meta.url).href,
    label: "Cloche en or",
  },
  "⭐": {
    image: new URL("./assets/slots/slot-star.png", import.meta.url).href,
    label: "Etoile sertie",
  },
  "7️⃣": {
    image: new URL("./assets/slots/slot-seven.png", import.meta.url).href,
    label: "Sept jackpot",
  },
  "💎": {
    image: new URL("./assets/slots/slot-diamond.png", import.meta.url).href,
    label: "Diamant bleu",
  },
  "🍀": {
    image: new URL("./assets/slots/slot-clover.png", import.meta.url).href,
    label: "Trefle emeraude",
  },
  "🍉": {
    image: new URL("./assets/slots/slot-watermelon.png", import.meta.url).href,
    label: "Pasteque bijou",
  },
  "🃏": {
    image: WILD_SYMBOL_IMAGE,
    label: "Joker",
  },
} satisfies Record<SlotSymbolV2, SlotSymbolAsset>;

export const SLOT_RESULT_ASSETS: Record<SlotResultAssetId, SlotSymbolAsset> = {
  jackpotSeven: {
    image: new URL("./assets/slots/result-jackpot-triple-seven.png", import.meta.url).href,
    label: "Triple sept jackpot",
  },
  tripleStar: {
    image: new URL("./assets/slots/result-triple-star.png", import.meta.url).href,
    label: "Triple etoile",
  },
  threeMatch: {
    image: new URL("./assets/slots/result-three-match.png", import.meta.url).href,
    label: "Trois symboles identiques",
  },
  pair: {
    image: new URL("./assets/slots/result-pair.png", import.meta.url).href,
    label: "Deux symboles identiques",
  },
  noPair: {
    image: new URL("./assets/slots/result-no-pair.png", import.meta.url).href,
    label: "Aucune paire",
  },
};
