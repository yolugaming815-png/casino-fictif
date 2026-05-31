import type { SlotSymbol } from "./gameLogic";

type SlotSymbolAsset = {
  image: string;
  label: string;
};

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
} satisfies Record<SlotSymbol, SlotSymbolAsset>;

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
