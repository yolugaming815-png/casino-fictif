export type CasinoAvatarPreset = {
  id: string;
  label: string;
  shortLabel: string;
  image: string;
};

export type PublicCasinoAvatar = {
  source: "custom" | "generated";
  url: string;
  id: string;
};

const AVATAR_TOKEN_PREFIX = "casino-avatar:";

export const CASINO_AVATAR_PRESETS = [
  { id: "ace-royal", label: "As royal", shortLabel: "As", image: new URL("./assets/avatars/ace-royal.png", import.meta.url).href },
  { id: "queen-neon", label: "Queen neon", shortLabel: "Queen", image: new URL("./assets/avatars/queen-neon.png", import.meta.url).href },
  { id: "king-gold", label: "King gold", shortLabel: "King", image: new URL("./assets/avatars/king-gold.png", import.meta.url).href },
  { id: "joker-violet", label: "Joker violet", shortLabel: "Joker", image: new URL("./assets/avatars/joker-violet.png", import.meta.url).href },
  { id: "dragon-chip", label: "Dragon chip", shortLabel: "Dragon", image: new URL("./assets/avatars/dragon-chip.png", import.meta.url).href },
  { id: "diamond-blue", label: "Diamond blue", shortLabel: "Diamond", image: new URL("./assets/avatars/diamond-blue.png", import.meta.url).href },
  { id: "spade-noir", label: "Spade noir", shortLabel: "Spade", image: new URL("./assets/avatars/spade-noir.png", import.meta.url).href },
  { id: "heart-ruby", label: "Heart ruby", shortLabel: "Ruby", image: new URL("./assets/avatars/heart-ruby.png", import.meta.url).href },
  { id: "club-emerald", label: "Club emerald", shortLabel: "Club", image: new URL("./assets/avatars/club-emerald.png", import.meta.url).href },
  { id: "roulette-red", label: "Roulette red", shortLabel: "Roulette", image: new URL("./assets/avatars/roulette-red.png", import.meta.url).href },
  { id: "plinko-orb", label: "Plinko orb", shortLabel: "Plinko", image: new URL("./assets/avatars/plinko-orb.png", import.meta.url).href },
  { id: "rocket-star", label: "Rocket star", shortLabel: "Rocket", image: new URL("./assets/avatars/rocket-star.png", import.meta.url).href },
  { id: "trophy-flame", label: "Trophy flame", shortLabel: "Trophy", image: new URL("./assets/avatars/trophy-flame.png", import.meta.url).href },
  { id: "nebula-vip", label: "Nebula VIP", shortLabel: "VIP", image: new URL("./assets/avatars/nebula-vip.png", import.meta.url).href },
  { id: "mint-lucky", label: "Mint lucky", shortLabel: "Lucky", image: new URL("./assets/avatars/mint-lucky.png", import.meta.url).href },
  { id: "sunset-slot", label: "Sunset slot", shortLabel: "Slot", image: new URL("./assets/avatars/sunset-slot.png", import.meta.url).href },
  { id: "crown-prime", label: "Crown prime", shortLabel: "Crown", image: new URL("./assets/avatars/crown-prime.png", import.meta.url).href },
  { id: "ghost-chip", label: "Ghost chip", shortLabel: "Ghost", image: new URL("./assets/avatars/ghost-chip.png", import.meta.url).href },
  { id: "storm-ace", label: "Storm ace", shortLabel: "Storm", image: new URL("./assets/avatars/storm-ace.png", import.meta.url).href },
  { id: "opal-queen", label: "Opal queen", shortLabel: "Opal", image: new URL("./assets/avatars/opal-queen.png", import.meta.url).href },
] as const satisfies readonly CasinoAvatarPreset[];

export type CasinoAvatarId = (typeof CASINO_AVATAR_PRESETS)[number]["id"];

const DEFAULT_AVATAR = CASINO_AVATAR_PRESETS[0];

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function avatarById(id: string): CasinoAvatarPreset {
  return CASINO_AVATAR_PRESETS.find((preset) => preset.id === id) ?? DEFAULT_AVATAR;
}

function isGeneratedAvatarToken(value: string) {
  return value.startsWith(AVATAR_TOKEN_PREFIX);
}

export function casinoAvatarToken(id: string) {
  return `${AVATAR_TOKEN_PREFIX}${avatarById(id).id}`;
}

export function casinoAvatarUrl(id: string) {
  return avatarById(id).image;
}

export function deterministicCasinoAvatar(seed: string): PublicCasinoAvatar {
  const value = seed.trim() || "casino-fictif-player";
  const preset = CASINO_AVATAR_PRESETS[hashSeed(value) % CASINO_AVATAR_PRESETS.length];

  return {
    id: preset.id,
    source: "generated",
    url: preset.image,
  };
}

export function publicCasinoAvatarUrl(photoURL: string | null | undefined, seed: string): PublicCasinoAvatar {
  const value = (photoURL ?? "").trim();

  if (isGeneratedAvatarToken(value)) {
    const preset = avatarById(value.slice(AVATAR_TOKEN_PREFIX.length));

    return {
      id: preset.id,
      source: "generated",
      url: preset.image,
    };
  }

  return deterministicCasinoAvatar(seed);
}
