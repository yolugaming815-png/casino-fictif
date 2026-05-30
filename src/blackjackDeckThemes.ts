export type DeckCardSuit = "♠" | "♥" | "♦" | "♣";
export type DeckCardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type DeckCard = {
  rank: DeckCardRank;
  suit: DeckCardSuit;
};

export type FigureRank = "A" | "J" | "Q" | "K";
export type FigureRole = "ace" | "jack" | "queen" | "king";
export type SuitMotif = "spade" | "heart" | "diamond" | "club";
export type DeckArtCellId = FigureRole | SuitMotif;

export type DeckArtCell = {
  id: DeckArtCellId;
  column: 0 | 1 | 2 | 3;
  row: 0 | 1;
  position: string;
};

export type SuitIllustration = {
  motif: SuitMotif;
  title: string;
  crest: string;
  flourish: string;
  assetCell: DeckArtCell;
};

export type ThemedSuit = {
  baseSuit: DeckCardSuit;
  symbol: string;
  color: string;
  shadow: string;
  illustration: SuitIllustration;
};

export type FigureArtwork = {
  rank: FigureRank;
  role: FigureRole;
  portrait: "sovereign" | "queen" | "guard" | "sigil";
  headwear: "crown" | "tiara" | "cap" | "halo";
  prop: "orb" | "fan" | "blade" | "crest";
  robe: "mantle" | "gown" | "guard-jacket" | "sigil";
  frame: string;
  accent: string;
  assetCell: DeckArtCell;
};

export type FigureStyle = {
  title: string;
  ornament: string;
  animationPrompt: string;
};

export type BlackjackDeckTheme = {
  id: string;
  label: string;
  artAtlasFilename: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  border: string;
  accent: string;
  foil: string;
  pattern: string;
  figureStyle: FigureStyle;
  suits: Record<DeckCardSuit, ThemedSuit>;
  figures: Record<FigureRank, FigureArtwork>;
};

export type PipPosition = {
  column: number;
  row: number;
  rotate?: boolean;
};

export type BlackjackCardFaceModel =
  | {
      kind: "pip";
      rank: Exclude<DeckCardRank, FigureRank>;
      suit: ThemedSuit;
      theme: BlackjackDeckTheme;
      pips: Array<PipPosition & { assetCell: DeckArtCell }>;
    }
  | {
      kind: "figure";
      rank: FigureRank;
      suit: ThemedSuit;
      theme: BlackjackDeckTheme;
      figure: FigureArtwork;
    };

const FIGURE_ROLES: Record<FigureRank, FigureRole> = {
  A: "ace",
  J: "jack",
  Q: "queen",
  K: "king",
};

const ART_CELLS: Record<DeckArtCellId, DeckArtCell> = {
  king: { id: "king", column: 0, row: 0, position: "0% 0%" },
  queen: { id: "queen", column: 1, row: 0, position: "33.333333% 0%" },
  jack: { id: "jack", column: 2, row: 0, position: "66.666667% 0%" },
  ace: { id: "ace", column: 3, row: 0, position: "100% 0%" },
  spade: { id: "spade", column: 0, row: 1, position: "0% 100%" },
  heart: { id: "heart", column: 1, row: 1, position: "33.333333% 100%" },
  diamond: { id: "diamond", column: 2, row: 1, position: "66.666667% 100%" },
  club: { id: "club", column: 3, row: 1, position: "100% 100%" },
};

const PIP_POSITIONS: Record<number, PipPosition[]> = {
  2: [
    { column: 2, row: 1 },
    { column: 2, row: 4, rotate: true },
  ],
  3: [
    { column: 2, row: 1 },
    { column: 2, row: 3 },
    { column: 2, row: 5, rotate: true },
  ],
  4: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  5: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 2, row: 3 },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  6: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 1, row: 3 },
    { column: 3, row: 3 },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  7: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 2, row: 2 },
    { column: 1, row: 3 },
    { column: 3, row: 3 },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  8: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 2, row: 2 },
    { column: 1, row: 3 },
    { column: 3, row: 3 },
    { column: 2, row: 4, rotate: true },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  9: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 1, row: 2 },
    { column: 3, row: 2 },
    { column: 2, row: 3 },
    { column: 1, row: 4, rotate: true },
    { column: 3, row: 4, rotate: true },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
  10: [
    { column: 1, row: 1 },
    { column: 3, row: 1 },
    { column: 2, row: 2 },
    { column: 1, row: 2 },
    { column: 3, row: 2 },
    { column: 1, row: 4, rotate: true },
    { column: 3, row: 4, rotate: true },
    { column: 2, row: 4, rotate: true },
    { column: 1, row: 5, rotate: true },
    { column: 3, row: 5, rotate: true },
  ],
};

function buildSuits(colors: { spade: string; heart: string; diamond: string; club: string; shadow: string }): Record<DeckCardSuit, ThemedSuit> {
  return {
    "♠": { baseSuit: "♠", symbol: "♠", color: colors.spade, shadow: colors.shadow, illustration: buildSuitIllustration("spade") },
    "♥": { baseSuit: "♥", symbol: "♥", color: colors.heart, shadow: colors.shadow, illustration: buildSuitIllustration("heart") },
    "♦": { baseSuit: "♦", symbol: "◆", color: colors.diamond, shadow: colors.shadow, illustration: buildSuitIllustration("diamond") },
    "♣": { baseSuit: "♣", symbol: "♣", color: colors.club, shadow: colors.shadow, illustration: buildSuitIllustration("club") },
  };
}

function buildSuitIllustration(motif: SuitMotif): SuitIllustration {
  const details: Record<SuitMotif, Omit<SuitIllustration, "motif" | "assetCell">> = {
    spade: { title: "Pique", crest: "Dague ornementale", flourish: "Lame et filigrane" },
    heart: { title: "Coeur", crest: "Joyau coeur", flourish: "Filigrane couronne" },
    diamond: { title: "Carreau", crest: "Gemme facettee", flourish: "Monture doree" },
    club: { title: "Trefle", crest: "Trefle joaillier", flourish: "Feuilles dorees" },
  };

  return {
    motif,
    ...details[motif],
    assetCell: ART_CELLS[motif],
  };
}

function buildFigures(accent: string): Record<FigureRank, FigureArtwork> {
  return {
    A: {
      rank: "A",
      role: FIGURE_ROLES.A,
      portrait: "sigil",
      headwear: "halo",
      prop: "crest",
      robe: "sigil",
      frame: "grand-crest",
      accent,
      assetCell: ART_CELLS.ace,
    },
    J: {
      rank: "J",
      role: FIGURE_ROLES.J,
      portrait: "guard",
      headwear: "cap",
      prop: "blade",
      robe: "guard-jacket",
      frame: "duelist",
      accent,
      assetCell: ART_CELLS.jack,
    },
    Q: {
      rank: "Q",
      role: FIGURE_ROLES.Q,
      portrait: "queen",
      headwear: "tiara",
      prop: "fan",
      robe: "gown",
      frame: "regal-oval",
      accent,
      assetCell: ART_CELLS.queen,
    },
    K: {
      rank: "K",
      role: FIGURE_ROLES.K,
      portrait: "sovereign",
      headwear: "crown",
      prop: "orb",
      robe: "mantle",
      frame: "throne",
      accent,
      assetCell: ART_CELLS.king,
    },
  };
}

function buildFigureStyle(title: string, ornament: string): FigureStyle {
  return {
    title,
    ornament,
    animationPrompt: `${title}: subtle luxury casino card animation, foil highlights shimmer across the illustrated court portrait and suit jewels, first and last frame strictly identical, no text changes.`,
  };
}

export const BLACKJACK_DECK_THEMES: Record<string, BlackjackDeckTheme> = {
  "cards-emerald": {
    id: "cards-emerald",
    label: "Emeraude",
    artAtlasFilename: "cards-emerald-art.png",
    surface: "#f5f2df",
    surfaceAlt: "#d9f1df",
    ink: "#08362d",
    border: "#0f6b4e",
    accent: "#0e9f67",
    foil: "#d6a83b",
    pattern: "emerald",
    figureStyle: buildFigureStyle("Cour emeraude", "gemmes vertes et or ancien"),
    suits: buildSuits({ spade: "#0c3b32", heart: "#b23745", diamond: "#c9972e", club: "#0e7d55", shadow: "rgba(14, 127, 85, 0.32)" }),
    figures: buildFigures("#0e9f67"),
  },
  "cards-midnight": {
    id: "cards-midnight",
    label: "Minuit",
    artAtlasFilename: "cards-midnight-art.png",
    surface: "#f1f5ff",
    surfaceAlt: "#d9e6ff",
    ink: "#071331",
    border: "#263a80",
    accent: "#437bd8",
    foil: "#b7cdf8",
    pattern: "midnight",
    figureStyle: buildFigureStyle("Cour minuit", "lunes argent et bleu nuit"),
    suits: buildSuits({ spade: "#0b2554", heart: "#315b9d", diamond: "#5f8bd7", club: "#1d4b69", shadow: "rgba(67, 123, 216, 0.3)" }),
    figures: buildFigures("#437bd8"),
  },
  "cards-royal": {
    id: "cards-royal",
    label: "Royal",
    artAtlasFilename: "cards-royal-art.png",
    surface: "#fbf2ff",
    surfaceAlt: "#eadcff",
    ink: "#2c174a",
    border: "#6541a5",
    accent: "#7b4fd1",
    foil: "#d6a83b",
    pattern: "royal",
    figureStyle: buildFigureStyle("Cour royale", "violet imperial et dorures"),
    suits: buildSuits({ spade: "#2c174a", heart: "#8f3264", diamond: "#b68a2f", club: "#4d337e", shadow: "rgba(101, 65, 165, 0.32)" }),
    figures: buildFigures("#7b4fd1"),
  },
  "cards-sunset": {
    id: "cards-sunset",
    label: "Couchant",
    artAtlasFilename: "cards-sunset-art.png",
    surface: "#fff2df",
    surfaceAlt: "#ffdcbf",
    ink: "#4a2118",
    border: "#d86642",
    accent: "#e7773f",
    foil: "#ffba4a",
    pattern: "sunset",
    figureStyle: buildFigureStyle("Cour couchant", "soleil orange et or chaud"),
    suits: buildSuits({ spade: "#5b281f", heart: "#c63f3f", diamond: "#e17b2f", club: "#9c5c25", shadow: "rgba(216, 102, 66, 0.34)" }),
    figures: buildFigures("#e7773f"),
  },
  "cards-obsidian": {
    id: "cards-obsidian",
    label: "Obsidienne",
    artAtlasFilename: "cards-obsidian-art.png",
    surface: "#f2f4f6",
    surfaceAlt: "#d6dce4",
    ink: "#0d1118",
    border: "#293344",
    accent: "#4d596b",
    foil: "#aeb9c7",
    pattern: "obsidian",
    figureStyle: buildFigureStyle("Cour obsidienne", "metal noir et fumee"),
    suits: buildSuits({ spade: "#0d1118", heart: "#5c1f2b", diamond: "#4d596b", club: "#1f3b35", shadow: "rgba(41, 51, 68, 0.34)" }),
    figures: buildFigures("#4d596b"),
  },
  "cards-aqua": {
    id: "cards-aqua",
    label: "Aqua",
    artAtlasFilename: "cards-aqua-art.png",
    surface: "#effbff",
    surfaceAlt: "#cef4ff",
    ink: "#053242",
    border: "#2a9db7",
    accent: "#28b8d8",
    foil: "#88e7ff",
    pattern: "aqua",
    figureStyle: buildFigureStyle("Cour aqua", "perles et turquoise"),
    suits: buildSuits({ spade: "#06445b", heart: "#1f7fa0", diamond: "#22a9c8", club: "#08756a", shadow: "rgba(42, 157, 183, 0.32)" }),
    figures: buildFigures("#28b8d8"),
  },
  "cards-linen": {
    id: "cards-linen",
    label: "Lin",
    artAtlasFilename: "cards-linen-art.png",
    surface: "#f7eed8",
    surfaceAlt: "#e6dac0",
    ink: "#5a3a18",
    border: "#b5975c",
    accent: "#a9772b",
    foil: "#d7ad52",
    pattern: "linen",
    figureStyle: buildFigureStyle("Cour lin", "parchemin et laiton ancien"),
    suits: buildSuits({ spade: "#6a481d", heart: "#a55946", diamond: "#b98935", club: "#6a6940", shadow: "rgba(181, 151, 92, 0.3)" }),
    figures: buildFigures("#a9772b"),
  },
  "cards-club": {
    id: "cards-club",
    label: "Trefle",
    artAtlasFilename: "cards-club-art.png",
    surface: "#f4edd8",
    surfaceAlt: "#d8ead7",
    ink: "#0f342c",
    border: "#3c8f67",
    accent: "#2f8f5c",
    foil: "#d0a33a",
    pattern: "club",
    figureStyle: buildFigureStyle("Cour trefle", "club prive et chance verte"),
    suits: buildSuits({ spade: "#193e35", heart: "#9e3d43", diamond: "#c2902c", club: "#1f7e4f", shadow: "rgba(47, 143, 92, 0.32)" }),
    figures: buildFigures("#2f8f5c"),
  },
  "cards-ruby": {
    id: "cards-ruby",
    label: "Rubis",
    artAtlasFilename: "cards-ruby-art.png",
    surface: "#fff0e6",
    surfaceAlt: "#ffd7d7",
    ink: "#4b101c",
    border: "#a83f4b",
    accent: "#c83e55",
    foil: "#d6a83b",
    pattern: "ruby",
    figureStyle: buildFigureStyle("Cour rubis", "rouge profond et or rose"),
    suits: buildSuits({ spade: "#4b101c", heart: "#b8203a", diamond: "#d04f45", club: "#743835", shadow: "rgba(168, 63, 75, 0.34)" }),
    figures: buildFigures("#c83e55"),
  },
  "cards-silver": {
    id: "cards-silver",
    label: "Argent",
    artAtlasFilename: "cards-silver-art.png",
    surface: "#f2f5f7",
    surfaceAlt: "#dde6ee",
    ink: "#2d3945",
    border: "#8e9cac",
    accent: "#687889",
    foil: "#c8d3df",
    pattern: "silver",
    figureStyle: buildFigureStyle("Cour argent", "platine et diamant froid"),
    suits: buildSuits({ spade: "#2d3945", heart: "#7a4653", diamond: "#8e9cac", club: "#53675f", shadow: "rgba(105, 119, 135, 0.3)" }),
    figures: buildFigures("#687889"),
  },
  "cards-joker-neon": {
    id: "cards-joker-neon",
    label: "Joker neon",
    artAtlasFilename: "cards-joker-neon-art.png",
    surface: "#f4fff7",
    surfaceAlt: "#dcf7ec",
    ink: "#0b2520",
    border: "#20bf78",
    accent: "#7a44d8",
    foil: "#d7b449",
    pattern: "joker-neon",
    figureStyle: buildFigureStyle("Cour joker neon", "masques joker, neon vert et violet"),
    suits: buildSuits({ spade: "#0b2e28", heart: "#94406e", diamond: "#7a44d8", club: "#0f8f61", shadow: "rgba(32, 191, 120, 0.34)" }),
    figures: buildFigures("#20bf78"),
  },
  "cards-crown-night": {
    id: "cards-crown-night",
    label: "Couronne nuit",
    artAtlasFilename: "cards-crown-night-art.png",
    surface: "#f1f6ff",
    surfaceAlt: "#dfe9ff",
    ink: "#071832",
    border: "#223c78",
    accent: "#3569c8",
    foil: "#d0a841",
    pattern: "crown-night",
    figureStyle: buildFigureStyle("Cour couronne nuit", "couronnes saphir et or lunaire"),
    suits: buildSuits({ spade: "#10284f", heart: "#804a79", diamond: "#3569c8", club: "#1c5864", shadow: "rgba(34, 60, 120, 0.32)" }),
    figures: buildFigures("#3569c8"),
  },
  "cards-gilded-mask": {
    id: "cards-gilded-mask",
    label: "Masque dore",
    artAtlasFilename: "cards-gilded-mask-art.png",
    surface: "#fbf0ff",
    surfaceAlt: "#ecd7f5",
    ink: "#29143a",
    border: "#744193",
    accent: "#9d55c8",
    foil: "#d6aa3d",
    pattern: "gilded-mask",
    figureStyle: buildFigureStyle("Cour masque dore", "masques de bal, amethyste et dorures"),
    suits: buildSuits({ spade: "#341a4b", heart: "#9b3f6a", diamond: "#9d55c8", club: "#4d3264", shadow: "rgba(116, 65, 147, 0.34)" }),
    figures: buildFigures("#9d55c8"),
  },
  "cards-ace-vault": {
    id: "cards-ace-vault",
    label: "As coffre",
    artAtlasFilename: "cards-ace-vault-art.png",
    surface: "#fff4e2",
    surfaceAlt: "#f2dcc0",
    ink: "#341f12",
    border: "#9a6a2c",
    accent: "#c4822f",
    foil: "#e4b94c",
    pattern: "ace-vault",
    figureStyle: buildFigureStyle("Cour as coffre", "sceaux d'as, mecanique doree et ambre"),
    suits: buildSuits({ spade: "#3b2817", heart: "#a94f38", diamond: "#c4822f", club: "#6b5b28", shadow: "rgba(154, 106, 44, 0.34)" }),
    figures: buildFigures("#c4822f"),
  },
  "cards-joker-gold": {
    id: "cards-joker-gold",
    label: "Joker dore",
    artAtlasFilename: "cards-joker-gold-art.png",
    surface: "#fff7dc",
    surfaceAlt: "#ead8a4",
    ink: "#271c0c",
    border: "#8b6a24",
    accent: "#caa340",
    foil: "#f0c95a",
    pattern: "joker-gold",
    figureStyle: buildFigureStyle("Cour joker dore", "joker legendaire, or massif et accents emeraude"),
    suits: buildSuits({ spade: "#231a0d", heart: "#8f3a2f", diamond: "#b7862c", club: "#1d6a4a", shadow: "rgba(202, 163, 64, 0.34)" }),
    figures: buildFigures("#caa340"),
  },
};

export function getBlackjackDeckTheme(skinId: string): BlackjackDeckTheme {
  return BLACKJACK_DECK_THEMES[skinId] ?? BLACKJACK_DECK_THEMES["cards-emerald"];
}

export function getBlackjackCardFaceModel(card: DeckCard, skinId: string): BlackjackCardFaceModel {
  const theme = getBlackjackDeckTheme(skinId);
  const suit = theme.suits[card.suit];

  if (isFigureRank(card.rank)) {
    const figure = theme.figures[card.rank];

    return {
      kind: "figure",
      rank: card.rank,
      suit,
      theme,
      figure: card.rank === "A" ? { ...figure, assetCell: suit.illustration.assetCell } : figure,
    };
  }

  const pipCount = Number(card.rank);
  const pips = (PIP_POSITIONS[pipCount] ?? []).map((position) => ({ ...position, assetCell: suit.illustration.assetCell }));

  return {
    kind: "pip",
    rank: card.rank,
    suit,
    theme,
    pips,
  };
}

export function isFigureRank(rank: DeckCardRank): rank is FigureRank {
  return rank === "A" || rank === "J" || rank === "Q" || rank === "K";
}
