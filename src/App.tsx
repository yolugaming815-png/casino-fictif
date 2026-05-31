import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { Bodies, Body, Composite, Engine, Runner } from "matter-js";
import styles from "./App.module.css";
import { getAnimationAsset, type AnimationAssetId } from "./animationAssets";
import { CASINO_AVATAR_PRESETS, casinoAvatarToken, publicCasinoAvatarUrl } from "./avatarLibrary";
import plinkoAmberImage from "./assets/plinko/plinko-amber.png";
import plinkoCloudImage from "./assets/plinko/plinko-cloud.png";
import plinkoEmeraldImage from "./assets/plinko/plinko-emerald.png";
import plinkoGoldImage from "./assets/plinko/plinko-gold.png";
import plinkoLilacImage from "./assets/plinko/plinko-lilac.png";
import plinkoMintImage from "./assets/plinko/plinko-mint.png";
import plinkoNeonImage from "./assets/plinko/plinko-neon.png";
import plinkoOceanImage from "./assets/plinko/plinko-ocean.png";
import plinkoRubyImage from "./assets/plinko/plinko-ruby.png";
import plinkoAuroraImage from "./assets/plinko/plinko-aurora.png";
import plinkoCosmicIceImage from "./assets/plinko/plinko-cosmic-ice.png";
import plinkoGalaxyCoreImage from "./assets/plinko/plinko-galaxy-core.png";
import plinkoStormImage from "./assets/plinko/plinko-storm.png";
import plinkoStarfallImage from "./assets/plinko/plinko-starfall.png";
import plinkoSupernovaImage from "./assets/plinko/plinko-supernova.png";
import rouletteAzureImage from "./assets/roulette/roulette-azure.png";
import rouletteCometImage from "./assets/roulette/roulette-comet.png";
import rouletteCopperImage from "./assets/roulette/roulette-copper.png";
import rouletteCrystalImage from "./assets/roulette/roulette-crystal.png";
import rouletteEclipseImage from "./assets/roulette/roulette-eclipse.png";
import rouletteIvoryImage from "./assets/roulette/roulette-ivory.png";
import rouletteJadeImage from "./assets/roulette/roulette-jade.png";
import rouletteLaserImage from "./assets/roulette/roulette-laser.png";
import rouletteOpalImage from "./assets/roulette/roulette-opal.png";
import roulettePearlImage from "./assets/roulette/roulette-pearl.png";
import roulettePrismImage from "./assets/roulette/roulette-prism.png";
import rouletteRoseImage from "./assets/roulette/roulette-rose.png";
import rouletteSapphireImage from "./assets/roulette/roulette-sapphire.png";
import rouletteSunImage from "./assets/roulette/roulette-sun.png";
import rouletteVioletImage from "./assets/roulette/roulette-violet.png";
import {
  INITIAL_BALANCE,
  MIN_BET,
  SYMBOLS,
  canPlaceBet,
  createReels,
  spin,
  type Bet,
  type SpinOutcome,
} from "./gameLogic";
import {
  calculateBlackjackPayout,
  createDeck,
  dealerShouldDraw,
  drawCard,
  handValue,
  isBlackjack,
  isBust,
  shuffleDeck,
  type BlackjackPayout,
  type Card,
} from "./blackjackLogic";
import { getBlackjackCardFaceModel, type BlackjackCardFaceModel, type DeckArtCell } from "./blackjackDeckThemes";
import {
  calculatePlinkoPayout,
  generatePlinkoPath,
  getFinalSlot,
  getPlinkoMultipliers,
  getPlinkoProbabilities,
  getPlinkoMultiplier,
  type PlinkoOutcome,
  type PlinkoLayout,
  type PlinkoRows,
  type PlinkoStep,
} from "./plinkoLogic";
import {
  ROULETTE_NUMBERS,
  ROULETTE_WHEEL_ORDER,
  getRouletteColor,
  playRoulette,
  type RouletteBetKind,
  type RouletteOutcome,
} from "./rouletteLogic";
import {
  DEFAULT_EQUIPPED_SKINS,
  SHOP_ITEMS,
  buySkin,
  equipSkin,
  getShopItem,
  type EquippedSkins,
  type ShopItem,
  type SkinCategory,
  type SkinRarity,
} from "./shopLogic";
import {
  ROCKET_SHIP_ATLAS_COLUMNS,
  ROCKET_SHIP_ATLAS_ROWS,
  SPECIAL_CHEST_ATLAS_COLUMNS,
  SPECIAL_CHEST_ATLAS_ROWS,
  getRocketShipArtCell,
  getSpecialChestArtCell,
  type AtlasCell,
} from "./shopVisualAssets";
import {
  CASES,
  RARITY_WEIGHTS,
  SPECIAL_CHESTS,
  getCaseDefinition,
  getSpecialChestDefinition,
  openCase,
  openSpecialChest,
  type CaseDefinition,
  type SpecialChestDefinition,
  type SpecialChestId,
} from "./caseLogic";
import { evaluatePokerHand } from "./pokerLogic";
import {
  ROCKET_MAX_TARGET,
  ROCKET_MIN_TARGET,
  getRocketSuccessProbability,
  normalizeRocketTarget,
  playRocketRound,
  type RocketOutcome,
  type RocketTarget,
} from "./rocketLogic";
import {
  advancePokerPhase,
  allInPokerPlayer,
  answerFriendRequest,
  answerSkinTrade,
  callPokerPlayer,
  checkPokerPlayer,
  createOnlineRoom,
  createSkinTrade,
  deleteInactivePokerRoom,
  executeAdminCommand,
  foldPokerPlayer,
  isFirebaseConfigured,
  isInactivePokerRoom,
  joinOnlineRoom,
  leaveOnlineRoom,
  loadAdminPlayers,
  loadAdminRooms,
  loadAdminTrades,
  loadDuelHistory,
  loadDuelStats,
  loadFriendRequests,
  loadLeaderboard,
  loadCloudSave,
  loadOnlineRooms,
  loadPrivateMessages,
  loadSkinTrades,
  markPrivateMessagesRead,
  markSkinTradeApplied,
  playDuelRound,
  playRussianRouletteTurn,
  publicProfilePhotoURL,
  raisePokerPlayer,
  sendFriendRequest,
  sendPrivateMessage,
  saveCloudSave,
  saveLeaderboardEntry,
  signInWithGoogle,
  signOutGoogle,
  startDuelRoom,
  startPokerRoom,
  startRussianRouletteRoom,
  subscribeAdminPriceOverrides,
  subscribeDuelHistory,
  subscribeOnlineRooms,
  updateCasinoUserProfile,
  watchAdminStatus,
  type AdminCommandResult,
  type AdminPriceOverrides,
  watchCasinoUser,
  type CasinoUser,
  type FriendRequestEntry,
  type LeaderboardEntry,
  type DuelStats,
  type OnlineRoomEntry,
  type OnlineRoomPlayer,
  type OnlineRoomType,
  type PrivateMessageEntry,
  type SkinTradeEntry,
} from "./firebaseClient";

const APPLIED_TRADE_KEYS_STORAGE_KEY = "casino-fictif-applied-trades";
const REFUNDED_INACTIVE_POKER_STORAGE_KEY = "casino-fictif-refunded-inactive-poker";
const HIDDEN_INACTIVE_POKER_STORAGE_KEY = "casino-fictif-hidden-inactive-poker";
const FORCE_CLOSED_POKER_STORAGE_KEY = "casino-fictif-force-closed-poker";
const RUSSIAN_ROULETTE_REWARDS_KEY = "casino-fictif-russian-roulette-rewards-v1";

type SlotHistoryItem = SpinOutcome & {
  id: number;
  bet: Bet;
  balanceAfter: number;
};

type BlackjackHistoryItem = BlackjackPayout & {
  id: number;
  bet: number;
  playerValue: number;
  dealerValue: number;
  playerCards: string;
  dealerCards: string;
  balanceAfter: number;
};

type BlackjackPhase = "betting" | "player" | "finished";

type PlinkoHistoryItem = PlinkoOutcome & {
  id: number;
  bet: Bet;
  rows: PlinkoRows;
  balanceAfter: number;
};

type PlinkoLaunch = {
  id: number;
  bet: Bet;
  rows: PlinkoRows;
};

type RouletteHistoryItem = RouletteOutcome & {
  id: number;
  bet: Bet;
  betKind: RouletteBetKind;
  chosenNumber: number;
  balanceAfter: number;
};

type RocketHistoryItem = RocketOutcome & {
  id: number;
  bet: Bet;
  balanceAfter: number;
};

type CaseHistoryItem = {
  id: number;
  item: ShopItem;
  caseTitle: string;
  duplicate: boolean;
  refund: number;
  balanceAfter: number;
};

type SpecialInventory = {
  chests: Record<SpecialChestId, number>;
  keys: Record<SpecialChestId, number>;
  fragments: Record<SpecialChestId, number>;
};

type ClawOutcome = {
  id: number;
  chestId: SpecialChestId;
  rewardType: "credits" | "key" | "fragments" | "miss";
  amount: number;
  label: string;
  balanceAfter: number;
};

type RewardedAdState = {
  date: string;
  watched: number;
};

type MissionId = string;
type MissionDifficulty = "easy" | "medium" | "hard";
type MissionMetric = keyof MissionStats;

type MissionDefinition = {
  id: MissionId;
  difficulty: MissionDifficulty;
  title: string;
  detail: string;
  goal: number;
  reward: number;
  metric: MissionMetric;
};

type MissionStats = {
  soloGames: number;
  slotSpins: number;
  blackjackHands: number;
  plinkoDrops: number;
  rouletteSpins: number;
  rocketLaunches: number;
  casesOpened: number;
  rewardedAdsWatched: number;
  clawAttempts: number;
};

type HourlyMissionState = {
  hourKey: string;
  baselines: Record<MissionMetric, number>;
  claimedMissionIds: MissionId[];
};

type SavedGameState = {
  version: 1;
  balance: number;
  ownedSkinIds: string[];
  equippedSkins: EquippedSkins;
  slotHistory: SlotHistoryItem[];
  blackjackHistory: BlackjackHistoryItem[];
  plinkoHistory: PlinkoHistoryItem[];
  rouletteHistory: RouletteHistoryItem[];
  rocketHistory: RocketHistoryItem[];
  caseHistory: CaseHistoryItem[];
  specialInventory: SpecialInventory;
  clawHistory: ClawOutcome[];
  rewardedAds: RewardedAdState;
  missionCounters: MissionStats;
  missionState: HourlyMissionState | null;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  kind: "friend" | "trade" | "message" | "duel" | "poker";
  timestamp?: unknown;
};

type CasinoGame = "slots" | "blackjack" | "plinko" | "roulette" | "rocket" | "claw";

type MainSection = "home" | "games" | "online" | "missions" | "cases" | "shop" | "inventory" | "bonus" | "friends" | "trades" | "messages" | "activity" | "admin";

const CASE_REEL_WINNER_INDEX = 34;
const CASE_BOX_OPEN_DURATION_MS = 1200;
const CASE_REEL_DURATION_MS = 3600;
const SAVE_KEY = "casino-fictif-save-v1";
const WAITING_ROOM_TTL_MS = 30 * 60 * 1000;
const MESSAGE_SEND_COOLDOWN_MS = 2500;
const CLAW_COST = 75;
const KEY_FRAGMENTS_REQUIRED = 9;
const REWARDED_AD_CREDITS = 250;
const DAILY_REWARDED_AD_LIMIT = 5;
const REWARDED_AD_WATCH_MS = 6500;
const PLINKO_MAX_BET = 1000;
const DUEL_PLINKO_BALLS_PER_ROUND = 15;
const DUEL_PLINKO_BET_PER_BALL = 10;
const DUEL_REWARDS_KEY = "casino-fictif-duel-rewards-v1";
const MISSION_REWARDS: Record<MissionDifficulty, number> = {
  easy: 150,
  medium: 300,
  hard: 500,
};
const MISSION_METRICS: MissionMetric[] = [
  "soloGames",
  "slotSpins",
  "blackjackHands",
  "plinkoDrops",
  "rouletteSpins",
  "rocketLaunches",
  "casesOpened",
  "rewardedAdsWatched",
  "clawAttempts",
];
const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: "easy-slots-10",
    difficulty: "easy",
    title: "Lancer 10 machines a sous",
    detail: "Dix spins sur la machine a sous.",
    goal: 10,
    reward: MISSION_REWARDS.easy,
    metric: "slotSpins",
  },
  {
    id: "easy-blackjack-5",
    difficulty: "easy",
    title: "Faire 5 mains de blackjack",
    detail: "Termine cinq mains, peu importe le resultat.",
    goal: 5,
    reward: MISSION_REWARDS.easy,
    metric: "blackjackHands",
  },
  {
    id: "easy-plinko-10",
    difficulty: "easy",
    title: "Lancer 10 billes Plinko",
    detail: "Dix billes pour valider cette mission.",
    goal: 10,
    reward: MISSION_REWARDS.easy,
    metric: "plinkoDrops",
  },
  {
    id: "easy-roulette-5",
    difficulty: "easy",
    title: "Jouer 5 tours de roulette",
    detail: "Cinq tours complets a la roulette.",
    goal: 5,
    reward: MISSION_REWARDS.easy,
    metric: "rouletteSpins",
  },
  {
    id: "easy-rocket-5",
    difficulty: "easy",
    title: "Lancer 5 fusees",
    detail: "Cinq tentatives sur Rocket Games.",
    goal: 5,
    reward: MISSION_REWARDS.easy,
    metric: "rocketLaunches",
  },
  {
    id: "easy-case-3",
    difficulty: "easy",
    title: "Ouvrir 3 cases",
    detail: "Trois ouvertures de cases ou coffres.",
    goal: 3,
    reward: MISSION_REWARDS.easy,
    metric: "casesOpened",
  },
  {
    id: "easy-claw-8",
    difficulty: "easy",
    title: "Tenter 8 pinces",
    detail: "Huit tentatives a la machine a pince.",
    goal: 8,
    reward: MISSION_REWARDS.easy,
    metric: "clawAttempts",
  },
  {
    id: "easy-bonus-3",
    difficulty: "easy",
    title: "Regarder 3 bonus",
    detail: "Trois bonus volontaires, credits virtuels uniquement.",
    goal: 3,
    reward: MISSION_REWARDS.easy,
    metric: "rewardedAdsWatched",
  },
  {
    id: "medium-solo-30",
    difficulty: "medium",
    title: "Jouer 30 parties solo",
    detail: "Machine a sous, blackjack, plinko, roulette ou rocket games.",
    goal: 30,
    reward: MISSION_REWARDS.medium,
    metric: "soloGames",
  },
  {
    id: "medium-slots-25",
    difficulty: "medium",
    title: "Lancer 25 machines a sous",
    detail: "Enchaine vingt-cinq spins.",
    goal: 25,
    reward: MISSION_REWARDS.medium,
    metric: "slotSpins",
  },
  {
    id: "medium-blackjack-15",
    difficulty: "medium",
    title: "Faire 15 mains de blackjack",
    detail: "Termine quinze mains.",
    goal: 15,
    reward: MISSION_REWARDS.medium,
    metric: "blackjackHands",
  },
  {
    id: "medium-plinko-30",
    difficulty: "medium",
    title: "Lancer 30 billes Plinko",
    detail: "Fais tomber trente billes.",
    goal: 30,
    reward: MISSION_REWARDS.medium,
    metric: "plinkoDrops",
  },
  {
    id: "medium-roulette-15",
    difficulty: "medium",
    title: "Jouer 15 tours de roulette",
    detail: "Quinze tours complets.",
    goal: 15,
    reward: MISSION_REWARDS.medium,
    metric: "rouletteSpins",
  },
  {
    id: "medium-rocket-15",
    difficulty: "medium",
    title: "Lancer 15 fusees",
    detail: "Quinze tentatives sur Rocket Games.",
    goal: 15,
    reward: MISSION_REWARDS.medium,
    metric: "rocketLaunches",
  },
  {
    id: "medium-cases-8",
    difficulty: "medium",
    title: "Ouvrir 8 cases",
    detail: "Huit ouvertures de cases ou coffres.",
    goal: 8,
    reward: MISSION_REWARDS.medium,
    metric: "casesOpened",
  },
  {
    id: "medium-claw-20",
    difficulty: "medium",
    title: "Tenter 20 pinces",
    detail: "Chaque tentative compte, meme sans gain.",
    goal: 20,
    reward: MISSION_REWARDS.medium,
    metric: "clawAttempts",
  },
  {
    id: "medium-bonus-5",
    difficulty: "medium",
    title: "Regarder 5 bonus",
    detail: "Cinq bonus volontaires.",
    goal: 5,
    reward: MISSION_REWARDS.medium,
    metric: "rewardedAdsWatched",
  },
  {
    id: "hard-solo-120",
    difficulty: "hard",
    title: "Jouer 120 parties solo",
    detail: "Un vrai tour des jeux solo.",
    goal: 120,
    reward: MISSION_REWARDS.hard,
    metric: "soloGames",
  },
  {
    id: "hard-slots-100",
    difficulty: "hard",
    title: "Lancer 100 machines a sous",
    detail: "Cent spins sur la machine.",
    goal: 100,
    reward: MISSION_REWARDS.hard,
    metric: "slotSpins",
  },
  {
    id: "hard-blackjack-60",
    difficulty: "hard",
    title: "Faire 60 mains de blackjack",
    detail: "Soixante mains terminees.",
    goal: 60,
    reward: MISSION_REWARDS.hard,
    metric: "blackjackHands",
  },
  {
    id: "hard-plinko-100",
    difficulty: "hard",
    title: "Lancer 100 billes Plinko",
    detail: "Cent billes dans le Plinko.",
    goal: 100,
    reward: MISSION_REWARDS.hard,
    metric: "plinkoDrops",
  },
  {
    id: "hard-roulette-50",
    difficulty: "hard",
    title: "Jouer 50 tours de roulette",
    detail: "Cinquante tours complets.",
    goal: 50,
    reward: MISSION_REWARDS.hard,
    metric: "rouletteSpins",
  },
  {
    id: "hard-rocket-50",
    difficulty: "hard",
    title: "Lancer 50 fusees",
    detail: "Cinquante tentatives sur Rocket Games.",
    goal: 50,
    reward: MISSION_REWARDS.hard,
    metric: "rocketLaunches",
  },
  {
    id: "hard-cases-20",
    difficulty: "hard",
    title: "Ouvrir 20 cases",
    detail: "Vingt ouvertures pendant l'heure.",
    goal: 20,
    reward: MISSION_REWARDS.hard,
    metric: "casesOpened",
  },
  {
    id: "hard-claw-50",
    difficulty: "hard",
    title: "Tenter 50 pinces",
    detail: "Cinquante essais a la machine a pince.",
    goal: 50,
    reward: MISSION_REWARDS.hard,
    metric: "clawAttempts",
  },
  {
    id: "hard-bonus-5",
    difficulty: "hard",
    title: "Regarder 5 bonus",
    detail: "Atteins la limite quotidienne des bonus.",
    goal: 5,
    reward: MISSION_REWARDS.hard,
    metric: "rewardedAdsWatched",
  },
];
const PLINKO_BALL_IMAGES: Partial<Record<string, string>> = {
  "plinko-amber": plinkoAmberImage,
  "plinko-cloud": plinkoCloudImage,
  "plinko-emerald": plinkoEmeraldImage,
  "plinko-gold": plinkoGoldImage,
  "plinko-lilac": plinkoLilacImage,
  "plinko-mint": plinkoMintImage,
  "plinko-neon": plinkoNeonImage,
  "plinko-ocean": plinkoOceanImage,
  "plinko-ruby": plinkoRubyImage,
  "plinko-storm": plinkoStormImage,
  "plinko-starfall": plinkoStarfallImage,
  "plinko-aurora": plinkoAuroraImage,
  "plinko-supernova": plinkoSupernovaImage,
  "plinko-cosmic-ice": plinkoCosmicIceImage,
  "plinko-galaxy-core": plinkoGalaxyCoreImage,
};
const PLINKO_BALL_IMAGE_VERSION = "plinko-skins-2026-05-30";
const ROULETTE_BALL_IMAGES: Partial<Record<string, string>> = {
  "roulette-azure": rouletteAzureImage,
  "roulette-copper": rouletteCopperImage,
  "roulette-eclipse": rouletteEclipseImage,
  "roulette-ivory": rouletteIvoryImage,
  "roulette-jade": rouletteJadeImage,
  "roulette-pearl": roulettePearlImage,
  "roulette-rose": rouletteRoseImage,
  "roulette-sapphire": rouletteSapphireImage,
  "roulette-sun": rouletteSunImage,
  "roulette-violet": rouletteVioletImage,
  "roulette-opal": rouletteOpalImage,
  "roulette-laser": rouletteLaserImage,
  "roulette-comet": rouletteCometImage,
  "roulette-crystal": rouletteCrystalImage,
  "roulette-prism": roulettePrismImage,
};
const ROULETTE_BALL_IMAGE_VERSION = "roulette-skins-2026-05-30";
const RARITY_SORT_ORDER: Record<SkinRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const plinkoBallImageCache = new Map<string, { image: HTMLImageElement; loaded: boolean }>();

function getPlinkoBallImageSource(id: string) {
  const source = PLINKO_BALL_IMAGES[id] ?? "";
  return source ? `${source}?v=${PLINKO_BALL_IMAGE_VERSION}` : "";
}

function getRouletteBallImageSource(id: string) {
  const source = ROULETTE_BALL_IMAGES[id] ?? "";
  return source ? `${source}?v=${ROULETTE_BALL_IMAGE_VERSION}` : "";
}

function getLoadedPlinkoBallImage(id: string) {
  const source = getPlinkoBallImageSource(id);

  if (!source || typeof Image === "undefined") {
    return null;
  }

  const cached = plinkoBallImageCache.get(id);

  if (cached) {
    return cached.loaded ? cached.image : null;
  }

  const image = new Image();
  const entry = { image, loaded: false };
  image.onload = () => {
    entry.loaded = true;
  };
  image.src = source;
  plinkoBallImageCache.set(id, entry);

  return null;
}

function parseBetInput(value: string, max?: number): Bet {
  const parsed = Math.floor(Number(value));
  const minimumBet = Number.isFinite(parsed) ? Math.max(MIN_BET, parsed) : MIN_BET;
  return max === undefined ? minimumBet : Math.min(max, minimumBet);
}

function getDuelGameKind(game: string): "plinko" | "roulette" | "quick" {
  const normalized = game.toLowerCase();

  if (normalized.includes("roulette")) {
    return "roulette";
  }

  if (normalized.includes("plinko")) {
    return "plinko";
  }

  return "quick";
}

function readStoredSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

function storeSet(key: string, values: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...values]));
}

function emptySpecialInventory(): SpecialInventory {
  return SPECIAL_CHESTS.reduce(
    (inventory, chest) => {
      inventory.chests[chest.id] = 0;
      inventory.keys[chest.id] = 0;
      inventory.fragments[chest.id] = 0;
      return inventory;
    },
    { chests: {}, keys: {}, fragments: {} } as SpecialInventory,
  );
}

function todayRewardDateKey() {
  return new Date().toLocaleDateString("en-CA");
}

function normalizeRewardedAds(value: unknown): RewardedAdState {
  const today = todayRewardDateKey();
  const raw = value && typeof value === "object" ? (value as Partial<RewardedAdState>) : {};
  const date = typeof raw.date === "string" ? raw.date : today;
  const watched = Number(raw.watched);

  if (date !== today) {
    return { date: today, watched: 0 };
  }

  return {
    date,
    watched: Math.max(0, Math.min(DAILY_REWARDED_AD_LIMIT, Math.floor(Number.isFinite(watched) ? watched : 0))),
  };
}

function getMissionHourKey(time = Date.now()) {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}-${hour}`;
}

function getMissionResetCountdown(time = Date.now()) {
  const nextHour = new Date(time);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  const remainingMs = Math.max(0, nextHour.getTime() - time);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function missionHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickHourlyMissions(difficulty: MissionDifficulty, count: number, hourKey: string) {
  return MISSION_DEFINITIONS.filter((mission) => mission.difficulty === difficulty)
    .sort((first, second) => missionHash(`${hourKey}:${first.id}`) - missionHash(`${hourKey}:${second.id}`))
    .slice(0, count);
}

function getHourlyMissionPlan(hourKey: string) {
  return [
    ...pickHourlyMissions("easy", 2, hourKey),
    ...pickHourlyMissions("medium", 2, hourKey),
    ...pickHourlyMissions("hard", 1, hourKey),
  ];
}

function createMissionBaselines(stats: MissionStats): Record<MissionMetric, number> {
  return {
    soloGames: stats.soloGames,
    slotSpins: stats.slotSpins,
    blackjackHands: stats.blackjackHands,
    plinkoDrops: stats.plinkoDrops,
    rouletteSpins: stats.rouletteSpins,
    rocketLaunches: stats.rocketLaunches,
    casesOpened: stats.casesOpened,
    rewardedAdsWatched: stats.rewardedAdsWatched,
    clawAttempts: stats.clawAttempts,
  };
}

function emptyMissionStats(): MissionStats {
  return {
    soloGames: 0,
    slotSpins: 0,
    blackjackHands: 0,
    plinkoDrops: 0,
    rouletteSpins: 0,
    rocketLaunches: 0,
    casesOpened: 0,
    rewardedAdsWatched: 0,
    clawAttempts: 0,
  };
}

function normalizeMissionCounters(value: unknown): MissionStats {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const counters = emptyMissionStats();

  MISSION_METRICS.forEach((metric) => {
    const amount = Number(raw[metric]);
    counters[metric] = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  });

  return counters;
}

function normalizeMissionState(value: unknown): HourlyMissionState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<HourlyMissionState>;
  const hourKey = typeof raw.hourKey === "string" ? raw.hourKey : "";
  const knownIds = new Set(MISSION_DEFINITIONS.map((mission) => mission.id));
  const claimedMissionIds = sanitizeClaimedMissionIds(raw.claimedMissionIds);
  const rawBaselines = raw.baselines && typeof raw.baselines === "object" ? raw.baselines : {};
  const baselines = MISSION_METRICS.reduce(
    (result, key) => {
      const metric = key as MissionMetric;
      const value = Number((rawBaselines as Record<string, unknown>)[metric]);
      result[metric] = Number.isFinite(value) ? Math.max(0, value) : 0;
      return result;
    },
    {} as Record<MissionMetric, number>,
  );

  if (!hourKey) {
    return null;
  }

  return {
    hourKey,
    baselines,
    claimedMissionIds: claimedMissionIds.filter((id) => knownIds.has(id)),
  };
}

const slotRules = [
  { label: "3x 7", reward: "x50", probability: "1 / 512 = 0,20 %" },
  { label: "3x etoile", reward: "x20", probability: "1 / 512 = 0,20 %" },
  { label: "3 symboles identiques", reward: "x10", probability: "6 / 512 = 1,17 %" },
  { label: "2 symboles identiques", reward: "x2", probability: "168 / 512 = 32,81 %" },
  { label: "Aucune paire", reward: "perte", probability: "336 / 512 = 65,63 %" },
];

const blackjackRules = [
  "As = 1 ou 11, figures = 10.",
  "Blackjack naturel : paiement x2.5.",
  "Victoire normale : x2. Egalite : mise remboursee. Defaite : mise perdue.",
  "Le croupier tire jusqu'a 17 minimum.",
  "Blackjack naturel au depart : 64 / 1 326, soit environ 4,8 % avec un paquet standard.",
  "Les autres probabilites varient avec la main, la carte visible du croupier et les cartes deja tirees.",
];

const rouletteBetOptions: Array<{ label: string; value: RouletteBetKind }> = [
  { label: "Numero plein", value: "straight" },
  { label: "Rouge", value: "red" },
  { label: "Noir", value: "black" },
  { label: "Pair", value: "even" },
  { label: "Impair", value: "odd" },
  { label: "1-18", value: "low" },
  { label: "19-36", value: "high" },
  { label: "1re douzaine", value: "dozen1" },
  { label: "2e douzaine", value: "dozen2" },
  { label: "3e douzaine", value: "dozen3" },
];

const rouletteRules = [
  { label: "Numero plein", reward: "x36", probability: "1 / 37 = 2,70 %" },
  { label: "Rouge ou noir", reward: "x2", probability: "18 / 37 = 48,65 %" },
  { label: "Pair ou impair", reward: "x2", probability: "18 / 37 = 48,65 %" },
  { label: "1-18 ou 19-36", reward: "x2", probability: "18 / 37 = 48,65 %" },
  { label: "Douzaine", reward: "x3", probability: "12 / 37 = 32,43 %" },
];

const ROULETTE_SPIN_DURATION_MS = 2600;
const ROCKET_FLIGHT_DURATION_MS = 2200;

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function sanitizeOwnedSkinIds(value: unknown) {
  const knownIds = new Set(SHOP_ITEMS.map((item) => item.id));
  const ids = readArray<string>(value).filter((id) => knownIds.has(id));
  const counts = new Map(ids.map((id) => [id, true]));
  const missingDefaults = Object.values(DEFAULT_EQUIPPED_SKINS).filter((id) => !counts.has(id));
  return [...missingDefaults, ...ids];
}

function sanitizeSpecialInventory(value: unknown): SpecialInventory {
  const base = emptySpecialInventory();
  const raw = value && typeof value === "object" ? (value as Partial<SpecialInventory>) : {};

  SPECIAL_CHESTS.forEach((chest) => {
    base.chests[chest.id] = Math.max(0, Math.floor(Number(raw.chests?.[chest.id] ?? 0)));
    base.keys[chest.id] = Math.max(0, Math.floor(Number(raw.keys?.[chest.id] ?? 0)));
    base.fragments[chest.id] = Math.max(0, Math.floor(Number(raw.fragments?.[chest.id] ?? 0)));
  });

  return base;
}

function ensureEquippedSkinsAreOwned(ownedSkinIds: readonly string[], equippedSkins: EquippedSkins) {
  const ownedSet = new Set(ownedSkinIds);
  const missingEquipped = Object.values(equippedSkins).filter((id) => !ownedSet.has(id));

  return [...missingEquipped, ...ownedSkinIds];
}

function countOwnedSkins(ownedSkinIds: readonly string[]) {
  return ownedSkinIds.reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});
}

function buildPublicInventory(ownedSkinIds: readonly string[]) {
  const ownedCounts = countOwnedSkins(ownedSkinIds);

  return sortSkinsByRarity(SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0)).map((item) => ({
    id: item.id,
    count: ownedCounts[item.id],
  }));
}

function buildPublicSpecialInventory(specialInventory: SpecialInventory) {
  return {
    chests: { ...specialInventory.chests },
    keys: { ...specialInventory.keys },
    fragments: { ...specialInventory.fragments },
  };
}

type SpecialTradeKind = "chest" | "key" | "fragment";

function specialTradeItemId(kind: SpecialTradeKind, chestId: SpecialChestId) {
  return `special:${kind}:${chestId}`;
}

function parseSpecialTradeItemId(id: string): { kind: SpecialTradeKind; chestId: SpecialChestId } | null {
  const [prefix, kind, chestId] = id.split(":");
  if (prefix !== "special" || (kind !== "chest" && kind !== "key" && kind !== "fragment")) {
    return null;
  }

  const chest = SPECIAL_CHESTS.find((candidate) => candidate.id === chestId);
  return chest ? { kind, chestId: chest.id } : null;
}

function specialTradeItemCount(specialInventory: SpecialInventory, id: string) {
  const parsed = parseSpecialTradeItemId(id);
  if (!parsed) {
    return 0;
  }

  if (parsed.kind === "chest") {
    return specialInventory.chests[parsed.chestId] ?? 0;
  }

  if (parsed.kind === "key") {
    return specialInventory.keys[parsed.chestId] ?? 0;
  }

  return specialInventory.fragments[parsed.chestId] ?? 0;
}

function updateSpecialInventoryCopy(specialInventory: SpecialInventory, id: string, delta: number): SpecialInventory {
  const parsed = parseSpecialTradeItemId(id);
  if (!parsed) {
    return specialInventory;
  }

  const bucket = parsed.kind === "chest" ? "chests" : parsed.kind === "key" ? "keys" : "fragments";
  return {
    ...specialInventory,
    [bucket]: {
      ...specialInventory[bucket],
      [parsed.chestId]: Math.max(0, (specialInventory[bucket][parsed.chestId] ?? 0) + delta),
    },
  };
}

function hasTradeItemCopy(ownedSkinIds: readonly string[], specialInventory: SpecialInventory, id: string) {
  if (!id) {
    return true;
  }

  return parseSpecialTradeItemId(id) ? specialTradeItemCount(specialInventory, id) > 0 : hasSkinCopy(ownedSkinIds, id);
}

function buildSpecialTradeOptions(specialInventory: SpecialInventory) {
  return SPECIAL_CHESTS.flatMap((chest) => [
    { id: specialTradeItemId("chest", chest.id), name: chest.title, count: specialInventory.chests[chest.id] ?? 0 },
    { id: specialTradeItemId("key", chest.id), name: chest.keyName, count: specialInventory.keys[chest.id] ?? 0 },
    { id: specialTradeItemId("fragment", chest.id), name: chest.fragmentName, count: specialInventory.fragments[chest.id] ?? 0 },
  ]).filter((item) => item.count > 0);
}

function removeOneSkinCopy(ownedSkinIds: readonly string[], skinId: string) {
  let removed = false;
  return ownedSkinIds.filter((id) => {
    if (!removed && id === skinId) {
      removed = true;
      return false;
    }

    return true;
  });
}

function hasSkinCopy(ownedSkinIds: readonly string[], skinId: string) {
  return ownedSkinIds.includes(skinId);
}

function normalizeTradeCredits(value: string) {
  const normalized = Number(value.replace(",", "."));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }

  return Math.floor(normalized);
}

function normalizePrivateMessageBody(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
}

function areUsersFriends(friendRequests: readonly FriendRequestEntry[], firstUid: string, secondUid: string) {
  return friendRequests.some(
    (request) =>
      request.status === "accepted" &&
      ((request.fromUid === firstUid && request.toUid === secondUid) || (request.fromUid === secondUid && request.toUid === firstUid)),
  );
}

function getActivityMillis(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
}

function formatActivityTime(value: unknown) {
  const millis = getActivityMillis(value);

  if (!millis) {
    return "a l'instant";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
}

function sanitizeEquippedSkins(value: unknown): EquippedSkins {
  const saved = value && typeof value === "object" ? (value as Partial<EquippedSkins>) : {};
  return (Object.keys(DEFAULT_EQUIPPED_SKINS) as SkinCategory[]).reduce((skins, category) => {
    const id = saved[category];
    const item = typeof id === "string" ? SHOP_ITEMS.find((candidate) => candidate.id === id) : undefined;
    return {
      ...skins,
      [category]: item?.category === category ? item.id : DEFAULT_EQUIPPED_SKINS[category],
    };
  }, {} as EquippedSkins);
}

function sanitizeCaseHistory(value: unknown) {
  return readArray<CaseHistoryItem>(value)
    .map((historyItem) => {
      const shopItem = SHOP_ITEMS.find((item) => item.id === historyItem.item?.id);
      return shopItem ? { ...historyItem, item: shopItem } : null;
    })
    .filter((historyItem): historyItem is CaseHistoryItem => historyItem !== null)
    .slice(0, 10);
}

function sanitizeClaimedMissionIds(value: unknown): MissionId[] {
  const knownIds = new Set(MISSION_DEFINITIONS.map((mission) => mission.id));
  return [...new Set(readArray<string>(value).filter((id): id is MissionId => knownIds.has(id as MissionId)))];
}

function normalizeSavedGame(parsed: Partial<SavedGameState>): SavedGameState | null {
  if (!parsed) {
    return null;
  }

  if (parsed.version !== 1) {
    return null;
  }

  const equippedSkins = sanitizeEquippedSkins(parsed.equippedSkins);
  const ownedSkinIds = ensureEquippedSkinsAreOwned(sanitizeOwnedSkinIds(parsed.ownedSkinIds), equippedSkins);

  return {
    version: 1,
    balance: typeof parsed.balance === "number" && Number.isFinite(parsed.balance) ? parsed.balance : INITIAL_BALANCE,
    ownedSkinIds,
    equippedSkins,
    slotHistory: readArray<SlotHistoryItem>(parsed.slotHistory).slice(0, 10),
    blackjackHistory: readArray<BlackjackHistoryItem>(parsed.blackjackHistory).slice(0, 10),
    plinkoHistory: readArray<PlinkoHistoryItem>(parsed.plinkoHistory).slice(0, 10),
    rouletteHistory: readArray<RouletteHistoryItem>(parsed.rouletteHistory).slice(0, 10),
    rocketHistory: readArray<RocketHistoryItem>(parsed.rocketHistory).slice(0, 10),
    caseHistory: sanitizeCaseHistory(parsed.caseHistory),
    specialInventory: sanitizeSpecialInventory(parsed.specialInventory),
    clawHistory: readArray<ClawOutcome>(parsed.clawHistory).slice(0, 10),
    rewardedAds: normalizeRewardedAds(parsed.rewardedAds),
    missionCounters: normalizeMissionCounters(parsed.missionCounters),
    missionState: normalizeMissionState(parsed.missionState),
  };
}

function loadSavedGame(): SavedGameState | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const rawSave = window.localStorage.getItem(SAVE_KEY);
    if (!rawSave) {
      return null;
    }

    const parsed = JSON.parse(rawSave) as Partial<SavedGameState>;
    return normalizeSavedGame(parsed);
  } catch {
    return null;
  }
}

function saveGame(state: SavedGameState) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
  } catch {
    // La sauvegarde locale peut etre bloquee par le navigateur, le jeu doit continuer.
  }
}

function firebaseTimeToMillis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return null;
}

function formatWaitingRoomCountdown(room: OnlineRoomEntry, now: number) {
  if (room.status !== "waiting") {
    return "";
  }

  const createdAt = firebaseTimeToMillis(room.createdAt);

  if (createdAt === null) {
    return "Suppression auto dans 30 min";
  }

  const remainingMs = Math.max(0, WAITING_ROOM_TTL_MS - (now - createdAt));
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

  return `Suppression auto dans ${remainingMinutes} min`;
}

function getNextHistoryId(items: Array<{ id: number }> | undefined) {
  return Math.max(-1, ...(items ?? []).map((item) => item.id)) + 1;
}

function App() {
  const savedGame = useMemo(() => loadSavedGame(), []);
  const plinkoLayout: PlinkoLayout = useMediaQuery("(max-width: 520px)") ? "mobile" : "desktop";
  const [balance, setBalance] = useState(savedGame?.balance ?? INITIAL_BALANCE);
  const [activeSection, setActiveSection] = useState<MainSection>("home");
  const [activeGame, setActiveGame] = useState<CasinoGame>("slots");
  const [activeOnlineGame, setActiveOnlineGame] = useState<OnlineRoomType>("duel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const paused = false;

  const [slotBet, setSlotBet] = useState<Bet>(25);
  const [slotHistory, setSlotHistory] = useState<SlotHistoryItem[]>(savedGame?.slotHistory ?? []);
  const [currentReels, setCurrentReels] = useState(SYMBOLS.slice(0, 3));
  const [slotMessage, setSlotMessage] = useState("Pret a lancer une partie fictive.");
  const [slotSpinning, setSlotSpinning] = useState(false);

  const [blackjackBet, setBlackjackBet] = useState<Bet>(25);
  const [activeBlackjackBet, setActiveBlackjackBet] = useState(25);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [blackjackPhase, setBlackjackPhase] = useState<BlackjackPhase>("betting");
  const [blackjackMessage, setBlackjackMessage] = useState("Choisis une mise virtuelle pour commencer.");
  const [blackjackHistory, setBlackjackHistory] = useState<BlackjackHistoryItem[]>(savedGame?.blackjackHistory ?? []);
  const [hasPlayerAction, setHasPlayerAction] = useState(false);

  const [plinkoBet, setPlinkoBet] = useState<Bet>(25);
  const [plinkoRows, setPlinkoRows] = useState<PlinkoRows>(10);
  const [plinkoHistory, setPlinkoHistory] = useState<PlinkoHistoryItem[]>(savedGame?.plinkoHistory ?? []);
  const [plinkoMessage, setPlinkoMessage] = useState("Choisis une mise virtuelle et lance la bille.");
  const [plinkoBallSlots, setPlinkoBallSlots] = useState<number[]>([]);
  const [activePlinkoLaunches, setActivePlinkoLaunches] = useState<PlinkoLaunch[]>([]);

  const [rouletteBet, setRouletteBet] = useState<Bet>(25);
  const [rouletteBetKind, setRouletteBetKind] = useState<RouletteBetKind>("red");
  const [rouletteNumber, setRouletteNumber] = useState(17);
  const [rouletteHistory, setRouletteHistory] = useState<RouletteHistoryItem[]>(savedGame?.rouletteHistory ?? []);
  const [rouletteMessage, setRouletteMessage] = useState("Choisis une mise virtuelle et un pari.");
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  const [pendingRouletteResult, setPendingRouletteResult] = useState<number | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteRunId, setRouletteRunId] = useState(0);
  const [ownedSkinIds, setOwnedSkinIds] = useState(savedGame?.ownedSkinIds ?? Object.values(DEFAULT_EQUIPPED_SKINS));
  const [equippedSkins, setEquippedSkins] = useState<EquippedSkins>(savedGame?.equippedSkins ?? DEFAULT_EQUIPPED_SKINS);
  const [shopMessage, setShopMessage] = useState("Les skins sont cosmetiques et ne changent pas les probabilites.");
  const [selectedCase, setSelectedCase] = useState<SkinCategory>("plinkoBall");
  const [caseMessage, setCaseMessage] = useState("Choisis une caisse et ouvre-la avec des credits virtuels.");
  const [caseOpening, setCaseOpening] = useState(false);
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [caseModalPhase, setCaseModalPhase] = useState<"box" | "reel">("box");
  const [caseModalTitle, setCaseModalTitle] = useState(getCaseDefinition("plinkoBall").title);
  const [caseReelItems, setCaseReelItems] = useState<ShopItem[]>([]);
  const [lastCaseDrop, setLastCaseDrop] = useState<CaseHistoryItem | null>(savedGame?.caseHistory[0] ?? null);
  const [caseHistory, setCaseHistory] = useState<CaseHistoryItem[]>(savedGame?.caseHistory ?? []);
  const [specialInventory, setSpecialInventory] = useState<SpecialInventory>(savedGame?.specialInventory ?? emptySpecialInventory());
  const [clawHistory, setClawHistory] = useState<ClawOutcome[]>(savedGame?.clawHistory ?? []);
  const [clawMessage, setClawMessage] = useState("Tente d'attraper des cles ou des fragments de cles.");
  const [rewardedAds, setRewardedAds] = useState<RewardedAdState>(savedGame?.rewardedAds ?? normalizeRewardedAds(null));
  const [rewardedAdMessage, setRewardedAdMessage] = useState("Regarde une pub volontaire pour gagner des credits virtuels.");
  const [rewardedAdWatching, setRewardedAdWatching] = useState(false);
  const [missionCounters, setMissionCounters] = useState<MissionStats>(savedGame?.missionCounters ?? emptyMissionStats());
  const [missionState, setMissionState] = useState<HourlyMissionState | null>(savedGame?.missionState ?? null);
  const [rocketBet, setRocketBet] = useState<Bet>(25);
  const [rocketTarget, setRocketTarget] = useState<RocketTarget>(2);
  const [rocketMessage, setRocketMessage] = useState("Choisis une cible et lance la fusee.");
  const [rocketHistory, setRocketHistory] = useState<RocketHistoryItem[]>(savedGame?.rocketHistory ?? []);
  const [rocketAnimating, setRocketAnimating] = useState(false);
  const [rocketFlight, setRocketFlight] = useState<RocketOutcome | null>(null);
  const [accountUser, setAccountUser] = useState<CasinoUser | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState("Connecte-toi avec un compte admin.");
  const [adminPlayers, setAdminPlayers] = useState<LeaderboardEntry[]>([]);
  const [adminRooms, setAdminRooms] = useState<OnlineRoomEntry[]>([]);
  const [adminTrades, setAdminTrades] = useState<SkinTradeEntry[]>([]);
  const [adminPriceOverrides, setAdminPriceOverrides] = useState<AdminPriceOverrides>({ skins: {}, cases: {}, chests: {} });
  const [lastAdminResult, setLastAdminResult] = useState<AdminCommandResult | null>(null);
  const [accountMessage, setAccountMessage] = useState(
    isFirebaseConfigured()
      ? "Connecte-toi avec Google pour sauvegarder en ligne."
      : "Ajoute les cles Firebase pour activer les comptes Google.",
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState("Connecte-toi pour apparaitre dans le classement.");
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardEntry | null>(null);
  const [profileEditMessage, setProfileEditMessage] = useState("");
  const [friendRequestMessage, setFriendRequestMessage] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequestEntry[]>([]);
  const [friendsMessage, setFriendsMessage] = useState("Connecte-toi pour voir tes amis.");
  const [privateMessages, setPrivateMessages] = useState<PrivateMessageEntry[]>([]);
  const [messagesMessage, setMessagesMessage] = useState("Connecte-toi pour envoyer des messages.");
  const [skinTrades, setSkinTrades] = useState<SkinTradeEntry[]>([]);
  const [tradesMessage, setTradesMessage] = useState("Connecte-toi pour echanger des skins.");
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoomEntry[]>([]);
  const [onlineMessage, setOnlineMessage] = useState("Connecte-toi pour creer ou rejoindre un salon.");
  const [duelHistory, setDuelHistory] = useState<OnlineRoomEntry[]>([]);
  const [selectedProfileStats, setSelectedProfileStats] = useState<DuelStats | null>(null);
  const [onlineActionRoomId, setOnlineActionRoomId] = useState<string | null>(null);
  const settledPokerRoomsRef = useRef(new Set<string>(JSON.parse(localStorage.getItem("casino-fictif-settled-poker") ?? "[]") as string[]));
  const paidPokerAnteRoomsRef = useRef(new Set<string>(JSON.parse(localStorage.getItem("casino-fictif-paid-poker-ante") ?? "[]") as string[]));
  const refundedInactivePokerRoomsRef = useRef(new Set<string>(JSON.parse(localStorage.getItem(REFUNDED_INACTIVE_POKER_STORAGE_KEY) ?? "[]") as string[]));
  const hiddenInactivePokerRoomsRef = useRef(new Set<string>(JSON.parse(localStorage.getItem(HIDDEN_INACTIVE_POKER_STORAGE_KEY) ?? "[]") as string[]));
  const forceClosedPokerRoomsRef = useRef(new Set<string>(JSON.parse(localStorage.getItem(FORCE_CLOSED_POKER_STORAGE_KEY) ?? "[]") as string[]));
  const settledDuelRewardsRef = useRef(readStoredSet(DUEL_REWARDS_KEY));
  const settledRussianRouletteRewardsRef = useRef(readStoredSet(RUSSIAN_ROULETTE_REWARDS_KEY));
  const appliedTradeKeysRef = useRef(new Set<string>(JSON.parse(localStorage.getItem(APPLIED_TRADE_KEYS_STORAGE_KEY) ?? "[]") as string[]));
  const lastPrivateMessageSentAtRef = useRef(0);
  const [now, setNow] = useState(Date.now());

  const spinId = useRef(getNextHistoryId(savedGame?.slotHistory));
  const slotIntervalId = useRef<number | null>(null);
  const slotTimeoutId = useRef<number | null>(null);
  const cloudSaveReadyRef = useRef(false);
  const cloudSaveTimeoutRef = useRef<number | null>(null);
  const handId = useRef(getNextHistoryId(savedGame?.blackjackHistory));
  const plinkoId = useRef(getNextHistoryId(savedGame?.plinkoHistory));
  const rouletteId = useRef(getNextHistoryId(savedGame?.rouletteHistory));
  const rocketId = useRef(getNextHistoryId(savedGame?.rocketHistory));
  const caseId = useRef(getNextHistoryId(savedGame?.caseHistory));
  const clawId = useRef(getNextHistoryId(savedGame?.clawHistory));

  function addMissionProgress(metric: MissionMetric, amount = 1) {
    setMissionCounters((current) => ({
      ...current,
      [metric]: current[metric] + amount,
      soloGames:
        metric === "slotSpins" || metric === "blackjackHands" || metric === "plinkoDrops" || metric === "rouletteSpins" || metric === "rocketLaunches"
          ? current.soloGames + amount
          : current.soloGames,
    }));
  }

  function rememberAppliedTrade(tradeApplyKey: string) {
    if (appliedTradeKeysRef.current.has(tradeApplyKey)) {
      return;
    }

    appliedTradeKeysRef.current.add(tradeApplyKey);
    const recentKeys = [...appliedTradeKeysRef.current].slice(-300);
    appliedTradeKeysRef.current = new Set(recentKeys);
    localStorage.setItem(APPLIED_TRADE_KEYS_STORAGE_KEY, JSON.stringify(recentKeys));
  }

  function rememberInactivePokerRefund(refundKey: string) {
    if (refundedInactivePokerRoomsRef.current.has(refundKey)) {
      return;
    }

    refundedInactivePokerRoomsRef.current.add(refundKey);
    const recentKeys = [...refundedInactivePokerRoomsRef.current].slice(-300);
    refundedInactivePokerRoomsRef.current = new Set(recentKeys);
    localStorage.setItem(REFUNDED_INACTIVE_POKER_STORAGE_KEY, JSON.stringify(recentKeys));
  }

  function rememberHiddenInactivePokerRoom(roomId: string) {
    if (hiddenInactivePokerRoomsRef.current.has(roomId)) {
      return;
    }

    hiddenInactivePokerRoomsRef.current.add(roomId);
    const recentKeys = [...hiddenInactivePokerRoomsRef.current].slice(-300);
    hiddenInactivePokerRoomsRef.current = new Set(recentKeys);
    localStorage.setItem(HIDDEN_INACTIVE_POKER_STORAGE_KEY, JSON.stringify(recentKeys));
  }

  function forgetHiddenInactivePokerRoom(roomId: string) {
    if (!hiddenInactivePokerRoomsRef.current.has(roomId)) {
      return;
    }

    hiddenInactivePokerRoomsRef.current.delete(roomId);
    localStorage.setItem(HIDDEN_INACTIVE_POKER_STORAGE_KEY, JSON.stringify([...hiddenInactivePokerRoomsRef.current]));
  }

  function restoreVisiblePokerRooms(rooms: OnlineRoomEntry[]) {
    rooms.forEach((room) => {
      if (
        room.type === "poker" &&
        room.status === "playing" &&
        Object.keys(room.pokerPaidByPlayer).length > 0 &&
        !isInactivePokerRoom(room) &&
        !forceClosedPokerRoomsRef.current.has(room.id)
      ) {
        forgetHiddenInactivePokerRoom(room.id);
      }
    });
  }

  function rememberForceClosedPokerRoom(roomId: string) {
    forceClosedPokerRoomsRef.current.add(roomId);
    const recentKeys = [...forceClosedPokerRoomsRef.current].slice(-300);
    forceClosedPokerRoomsRef.current = new Set(recentKeys);
    localStorage.setItem(FORCE_CLOSED_POKER_STORAGE_KEY, JSON.stringify(recentKeys));
  }

  const totalNet = useMemo(() => {
    const slotNet = slotHistory.reduce((sum, item) => sum + item.net, 0);
    const blackjackNet = blackjackHistory.reduce((sum, item) => sum + item.net, 0);
    const plinkoNet = plinkoHistory.reduce((sum, item) => sum + item.net, 0);
    const rouletteNet = rouletteHistory.reduce((sum, item) => sum + item.net, 0);
    const rocketNet = rocketHistory.reduce((sum, item) => sum + item.net, 0);
    return slotNet + blackjackNet + plinkoNet + rouletteNet + rocketNet;
  }, [slotHistory, blackjackHistory, plinkoHistory, rouletteHistory, rocketHistory]);

  const slotBetAvailable = canPlaceBet(balance, slotBet);
  const blackjackBetAvailable = canPlaceBet(balance, blackjackBet);
  const plinkoBetAvailable = canPlaceBet(balance, plinkoBet) && plinkoBet <= PLINKO_MAX_BET;
  const plinkoAnimating = activePlinkoLaunches.length > 0;
  const rouletteBetAvailable = canPlaceBet(balance, rouletteBet);
  const rocketBetAvailable = canPlaceBet(balance, rocketBet);
  const canDouble = blackjackPhase === "player" && !hasPlayerAction && balance >= activeBlackjackBet * 2;
  const pendingFriendRequestsCount = accountUser
    ? friendRequests.filter((request) => request.status === "pending" && request.toUid === accountUser.uid).length
    : 0;
  const pendingTradeOffersCount = accountUser
    ? skinTrades.filter((trade) => trade.status === "pending" && trade.toUid === accountUser.uid).length
    : 0;
  const unreadMessagesCount = accountUser
    ? privateMessages.filter((message) => message.toUid === accountUser.uid && !message.readBy.includes(accountUser.uid)).length
    : 0;
  const activityBadgeCount = pendingFriendRequestsCount + pendingTradeOffersCount + unreadMessagesCount;
  const equippedItems = useMemo(
    () => ({
      plinkoBall: getShopItem(equippedSkins.plinkoBall),
      cardBack: getShopItem(equippedSkins.cardBack),
      rouletteBall: getShopItem(equippedSkins.rouletteBall),
      rocketShip: getShopItem(equippedSkins.rocketShip),
    }),
    [equippedSkins],
  );
  const visibleOnlineRooms = useMemo(
    () => onlineRooms.filter((room) => !forceClosedPokerRoomsRef.current.has(room.id) && !hiddenInactivePokerRoomsRef.current.has(room.id) && !isInactivePokerRoom(room, now)),
    [onlineRooms, now],
  );
  const activityItems = useMemo(
    () => buildActivityItems(accountUser?.uid ?? "", friendRequests, skinTrades, privateMessages, duelHistory, visibleOnlineRooms),
    [accountUser, friendRequests, skinTrades, privateMessages, duelHistory, visibleOnlineRooms],
  );
  const priceTools = useMemo(
    () => ({
      skin: (item: ShopItem) => adminPriceOverrides.skins[item.id] ?? item.price,
      caseCost: (category: SkinCategory) => adminPriceOverrides.cases[category] ?? getCaseDefinition(category).cost,
      chest: (chest: SpecialChestDefinition) => adminPriceOverrides.chests[chest.id] ?? chest.price,
    }),
    [adminPriceOverrides],
  );
  const missionStats = useMemo<MissionStats>(
    () => ({
      ...missionCounters,
      rewardedAdsWatched: missionCounters.rewardedAdsWatched,
    }),
    [missionCounters],
  );
  const missionHourKey = getMissionHourKey(now);
  const missionResetCountdown = getMissionResetCountdown(now);
  const activeMissions = useMemo(() => getHourlyMissionPlan(missionHourKey), [missionHourKey]);
  const activeMissionState =
    missionState?.hourKey === missionHourKey
      ? missionState
      : {
          hourKey: missionHourKey,
          baselines: createMissionBaselines(missionStats),
          claimedMissionIds: [],
        };

  useEffect(() => {
    if (missionState?.hourKey === missionHourKey) {
      return;
    }

    setMissionState({
      hourKey: missionHourKey,
      baselines: createMissionBaselines(missionStats),
      claimedMissionIds: [],
    });
  }, [missionHourKey, missionState?.hourKey, missionStats]);

  useEffect(() => {
    saveGame({
      version: 1,
      balance,
      ownedSkinIds,
      equippedSkins,
      slotHistory,
      blackjackHistory,
      plinkoHistory,
      rouletteHistory,
      rocketHistory,
      caseHistory,
      specialInventory,
      clawHistory,
      rewardedAds,
      missionCounters,
      missionState: activeMissionState,
    });
  }, [
    balance,
    ownedSkinIds,
    equippedSkins,
    slotHistory,
    blackjackHistory,
    plinkoHistory,
    rouletteHistory,
    rocketHistory,
    caseHistory,
    specialInventory,
    clawHistory,
    rewardedAds,
    missionCounters,
    activeMissionState,
  ]);

  useEffect(() => {
    return watchCasinoUser(async (user) => {
      setAccountUser(user);
      cloudSaveReadyRef.current = false;

      if (!user) {
        setFriendRequests([]);
        setFriendsMessage("Connecte-toi pour voir tes amis.");
        setPrivateMessages([]);
        setMessagesMessage("Connecte-toi pour envoyer des messages.");
        setSkinTrades([]);
        setTradesMessage("Connecte-toi pour echanger des skins.");
        setOnlineRooms([]);
        setDuelHistory([]);
        setOnlineMessage("Connecte-toi pour creer ou rejoindre un salon.");
        setAccountMessage(
          isFirebaseConfigured()
            ? "Connecte-toi avec Google pour sauvegarder en ligne."
            : "Ajoute les cles Firebase pour activer les comptes Google.",
        );
        return;
      }

      setAccountLoading(true);
      setAccountMessage("Chargement de ta sauvegarde Google...");

      try {
        const cloudSave = normalizeSavedGame((await loadCloudSave(user.uid)) as Partial<SavedGameState>);

        if (cloudSave) {
          applyCloudSave(cloudSave);
          await saveLeaderboardEntry(
            user,
            cloudSave.balance,
            buildPublicInventory(cloudSave.ownedSkinIds),
            cloudSave.equippedSkins,
            buildPublicSpecialInventory(cloudSave.specialInventory),
          );
          setAccountMessage("Sauvegarde Google chargee.");
        } else {
          const currentSave = getCurrentSaveState();
          await saveCloudSave(user.uid, currentSave);
          await saveLeaderboardEntry(
            user,
            currentSave.balance,
            buildPublicInventory(currentSave.ownedSkinIds),
            currentSave.equippedSkins,
            buildPublicSpecialInventory(currentSave.specialInventory),
          );
          setAccountMessage("Compte Google cree avec ta partie actuelle.");
        }

        await refreshLeaderboard();
        await refreshFriendRequests(user.uid);
        await refreshPrivateMessages(user.uid);
        await refreshSkinTrades(user.uid);
        await refreshOnlineRooms();
        await refreshDuelHistory(user.uid);
        cloudSaveReadyRef.current = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        setAccountMessage(`Sauvegarde Google impossible : ${message}`);
      } finally {
        setAccountLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    if (cloudSaveTimeoutRef.current !== null) {
      window.clearTimeout(cloudSaveTimeoutRef.current);
    }

    cloudSaveTimeoutRef.current = window.setTimeout(() => {
      const currentSave = getCurrentSaveState();

      Promise.all([
        saveCloudSave(accountUser.uid, currentSave),
        saveLeaderboardEntry(
          accountUser,
          currentSave.balance,
          buildPublicInventory(currentSave.ownedSkinIds),
          currentSave.equippedSkins,
          buildPublicSpecialInventory(currentSave.specialInventory),
        ),
      ])
        .then(() => {
          setAccountMessage("Sauvegarde Google a jour.");
          return refreshLeaderboard();
        })
        .catch(() => setAccountMessage("La sauvegarde Google a echoue. La sauvegarde locale reste active."));
    }, 700);
  }, [
    accountUser,
    balance,
    ownedSkinIds,
    equippedSkins,
    slotHistory,
    blackjackHistory,
    plinkoHistory,
    rouletteHistory,
    rocketHistory,
    caseHistory,
    specialInventory,
    clawHistory,
    rewardedAds,
    missionCounters,
    activeMissionState,
  ]);

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (accountUser) {
      refreshFriendRequests(accountUser.uid);
      refreshSkinTrades(accountUser.uid);
    }
  }, [accountUser]);

  useEffect(() => {
    if (!accountUser) {
      setIsAdmin(false);
      setAdminPlayers([]);
      setAdminRooms([]);
      setAdminTrades([]);
      setAdminMessage("Connecte-toi avec un compte admin.");
      return;
    }

    return watchAdminStatus(accountUser.uid, (enabled, statusMessage) => {
      setIsAdmin(enabled);
      setAdminMessage(statusMessage);
    });
  }, [accountUser]);

  useEffect(() => subscribeAdminPriceOverrides(setAdminPriceOverrides), []);

  useEffect(() => {
    if (isAdmin) {
      refreshAdminData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && activeSection === "admin") {
      setActiveSection("games");
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (!accountUser) {
      setOnlineRooms([]);
      setDuelHistory([]);
      return;
    }

    if (!isFirebaseConfigured()) {
      setOnlineRooms([]);
      setDuelHistory([]);
      setOnlineMessage("Firebase doit etre configure pour les jeux en ligne.");
      return;
    }

    setOnlineMessage("Synchronisation des salons en ligne...");

    const unsubscribeRooms = subscribeOnlineRooms(
      (rooms) => {
        restoreVisiblePokerRooms(rooms);
        setOnlineRooms(rooms);
        const visibleRooms = rooms.filter((room) => !isInactivePokerRoom(room));
        setOnlineMessage(visibleRooms.length ? "Salons en ligne synchronises." : "Aucun salon ouvert pour le moment.");
      },
      () => {
        setOnlineMessage("Synchronisation des salons impossible pour le moment.");
      },
    );
    const unsubscribeHistory = subscribeDuelHistory(
      accountUser.uid,
      (history) => {
        setDuelHistory(history);
      },
      () => {
        setDuelHistory([]);
      },
    );

    return () => {
      unsubscribeRooms();
      unsubscribeHistory();
    };
  }, [accountUser]);

  useEffect(() => {
    if (!accountUser) {
      return;
    }

    const finishedDuels = [...onlineRooms, ...duelHistory].filter(
      (room, index, rooms) =>
        room.type === "duel" &&
        room.duelRewardMode === "gameplay-v1" &&
        room.status === "finished" &&
        room.playerIds.includes(accountUser.uid) &&
        rooms.findIndex((candidate) => candidate.id === room.id) === index,
    );

    finishedDuels.forEach((room) => {
      const currentScore = room.duelScores[accountUser.uid] ?? { rounds: [], total: 0 };
      const opponentTotal = room.players
        .filter((player) => player.uid !== accountUser.uid)
        .reduce((sum, player) => sum + (room.duelScores[player.uid]?.total ?? 0), 0);
      const rewardKey = `${room.id}:${accountUser.uid}:${room.winnerUid}:${currentScore.total}:${opponentTotal}`;

      if (settledDuelRewardsRef.current.has(rewardKey) || currentScore.rounds.length < 3 || !room.winnerUid) {
        return;
      }

      const balanceDelta = room.winnerUid === accountUser.uid ? currentScore.total + opponentTotal : -currentScore.total;
      setBalance((current) => Math.max(0, current + balanceDelta));
      settledDuelRewardsRef.current.add(rewardKey);
      storeSet(DUEL_REWARDS_KEY, settledDuelRewardsRef.current);
      setOnlineMessage(
        room.winnerUid === accountUser.uid
          ? `Duel gagne : tu remportes ${(currentScore.total + opponentTotal).toLocaleString("fr-FR")} credits virtuels.`
          : `Duel perdu : tu perds ${currentScore.total.toLocaleString("fr-FR")} credits virtuels.`,
      );
    });
  }, [accountUser, onlineRooms, duelHistory]);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    onlineRooms.forEach((room) => {
      if (room.type !== "poker" || room.status !== "finished" || !room.players.some((player) => player.uid === accountUser.uid)) {
        return;
      }

      const settlementKey = `${room.id}:${room.pokerHandId}`;

      if (settledPokerRoomsRef.current.has(settlementKey)) {
        return;
      }

      const winnerUids = room.pokerWinnerUids.length ? room.pokerWinnerUids : room.pokerWinnerUid ? [room.pokerWinnerUid] : [];
      const winnerCount = Math.max(1, winnerUids.length);

      if (winnerUids.includes(accountUser.uid)) {
        const share = Math.floor(room.pokerPot / winnerCount);
        setBalance((current) => current + share);
        setOnlineMessage(winnerCount > 1 ? `Egalite poker : tu recuperes ${share} credits.` : `Victoire poker : tu gagnes ${share} credits.`);
      }

      settledPokerRoomsRef.current.add(settlementKey);
      localStorage.setItem("casino-fictif-settled-poker", JSON.stringify([...settledPokerRoomsRef.current]));
    });
  }, [accountUser, onlineRooms]);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    onlineRooms.forEach((room) => {
      if (room.type !== "russian-roulette" || room.status !== "finished" || !room.players.some((player) => player.uid === accountUser.uid) || !room.winnerUid) {
        return;
      }

      const settlementKey = `${room.id}:${room.winnerUid}:${room.russianPot}`;

      if (settledRussianRouletteRewardsRef.current.has(settlementKey)) {
        return;
      }

      if (room.winnerUid === accountUser.uid) {
        setBalance((current) => current + room.russianPot);
        setOnlineMessage(`Roulette russe gagnee : tu remportes ${room.russianPot.toLocaleString("fr-FR")} credits.`);
      }

      settledRussianRouletteRewardsRef.current.add(settlementKey);
      storeSet(RUSSIAN_ROULETTE_REWARDS_KEY, settledRussianRouletteRewardsRef.current);
    });
  }, [accountUser, onlineRooms]);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    onlineRooms.forEach((room) => {
      if (room.type !== "poker" || room.status !== "playing" || !room.players.some((player) => player.uid === accountUser.uid)) {
        return;
      }

      const anteKey = `${room.id}:${room.pokerHandId}:${accountUser.uid}`;

      if (paidPokerAnteRoomsRef.current.has(anteKey)) {
        return;
      }

      paidPokerAnteRoomsRef.current.add(anteKey);
      localStorage.setItem("casino-fictif-paid-poker-ante", JSON.stringify([...paidPokerAnteRoomsRef.current]));
      setBalance((current) => Math.max(0, current - 25));
    });
  }, [accountUser, onlineRooms]);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    onlineRooms.forEach((room) => {
      if (!isInactivePokerRoom(room, now) || !room.players.some((player) => player.uid === accountUser.uid)) {
        return;
      }

      rememberHiddenInactivePokerRoom(room.id);
      const refundKey = `${room.id}:${room.pokerHandId}:${accountUser.uid}`;

      if (!refundedInactivePokerRoomsRef.current.has(refundKey)) {
        const anteKey = `${room.id}:${room.pokerHandId}:${accountUser.uid}`;
        const anteRefund = paidPokerAnteRoomsRef.current.has(anteKey) ? 25 : 0;
        const contributionRefund = room.pokerContributions[accountUser.uid] ?? 0;
        const trackedRefund = room.pokerPaidByPlayer[accountUser.uid];
        const refundAmount = trackedRefund ?? anteRefund + contributionRefund;

        if (refundAmount > 0) {
          setBalance((current) => current + refundAmount);
          setOnlineMessage(`Table poker inactive : ${refundAmount} credits rembourses.`);
        }

        rememberInactivePokerRefund(refundKey);
      }

      deleteInactivePokerRoom(room, accountUser).catch(() => {
        setOnlineMessage("La table inactive sera retiree des qu'un joueur pourra la nettoyer.");
      });
    });
  }, [accountUser, onlineRooms, now]);

  useEffect(() => {
    if (!accountUser || !cloudSaveReadyRef.current) {
      return;
    }

    skinTrades.forEach((trade) => {
      const isSender = trade.fromUid === accountUser.uid;
      const isReceiver = trade.toUid === accountUser.uid;

      if (!isSender && !isReceiver) {
        return;
      }

      if (isSender && trade.appliedFromUid) {
        return;
      }

      if (isReceiver && trade.appliedToUid) {
        return;
      }

      const tradeApplyKey = `${trade.id}:${isSender ? "from" : "to"}`;
      if (appliedTradeKeysRef.current.has(tradeApplyKey)) {
        return;
      }

      if (trade.status === "accepted") {
        if (isSender) {
          rememberAppliedTrade(tradeApplyKey);
          if (trade.requestedItemId) {
            if (parseSpecialTradeItemId(trade.requestedItemId)) {
              setSpecialInventory((current) => updateSpecialInventoryCopy(current, trade.requestedItemId, 1));
            } else {
              setOwnedSkinIds((current) => [...current, trade.requestedItemId]);
            }
          }
          if (trade.requestedCredits > 0) {
            setBalance((current) => current + trade.requestedCredits);
          }
          markSkinTradeApplied(trade.id, "from").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
        }

        if (isReceiver) {
          if (trade.requestedItemId && !hasTradeItemCopy(ownedSkinIds, specialInventory, trade.requestedItemId)) {
            setTradesMessage("Un echange accepte n'a pas pu etre applique : objet manquant.");
            return;
          }

          rememberAppliedTrade(tradeApplyKey);
          if (trade.requestedItemId) {
            if (parseSpecialTradeItemId(trade.requestedItemId)) {
              setSpecialInventory((current) => updateSpecialInventoryCopy(current, trade.requestedItemId, -1));
            } else {
              setOwnedSkinIds((current) => removeOneSkinCopy(current, trade.requestedItemId));
            }
          }
          if (trade.offeredItemId) {
            if (parseSpecialTradeItemId(trade.offeredItemId)) {
              setSpecialInventory((current) => updateSpecialInventoryCopy(current, trade.offeredItemId, 1));
            } else {
              setOwnedSkinIds((current) => [...current, trade.offeredItemId]);
            }
          }
          setBalance((current) => Math.max(0, current - trade.requestedCredits) + trade.offeredCredits);
          markSkinTradeApplied(trade.id, "to").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
        }
      }

      if ((trade.status === "rejected" || trade.status === "canceled") && isSender) {
        rememberAppliedTrade(tradeApplyKey);
        if (trade.offeredItemId) {
          if (parseSpecialTradeItemId(trade.offeredItemId)) {
            setSpecialInventory((current) => updateSpecialInventoryCopy(current, trade.offeredItemId, 1));
          } else {
            setOwnedSkinIds((current) => [...current, trade.offeredItemId]);
          }
        }
        if (trade.offeredCredits > 0) {
          setBalance((current) => current + trade.offeredCredits);
        }
        markSkinTradeApplied(trade.id, "from").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
      }

      if ((trade.status === "rejected" || trade.status === "canceled") && isReceiver) {
        rememberAppliedTrade(tradeApplyKey);
        markSkinTradeApplied(trade.id, "to").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
      }
    });
  }, [accountUser, ownedSkinIds, skinTrades, specialInventory]);

  async function refreshLeaderboard() {
    if (!isFirebaseConfigured()) {
      setLeaderboard([]);
      setLeaderboardMessage("Firebase doit etre configure pour afficher le classement.");
      return;
    }

    try {
      const entries = await loadLeaderboard(10);
      setLeaderboard(entries);
      setSelectedProfile((profile) => (profile ? entries.find((entry) => entry.uid === profile.uid) ?? profile : null));
      setLeaderboardMessage(entries.length ? "Classement des comptes connectes." : "Aucun joueur classe pour le moment.");
    } catch {
      setLeaderboardMessage("Classement indisponible pour le moment.");
    }
  }

  async function refreshFriendRequests(userId: string) {
    if (!isFirebaseConfigured()) {
      setFriendRequests([]);
      setFriendsMessage("Firebase doit etre configure pour afficher les amis.");
      return;
    }

    try {
      const requests = await loadFriendRequests(userId);
      setFriendRequests(requests);
      setFriendsMessage(requests.length ? "Demandes et amis synchronises." : "Aucune demande d'ami pour le moment.");
    } catch {
      setFriendsMessage("Impossible de charger les amis pour le moment.");
    }
  }

  async function refreshPrivateMessages(userId: string) {
    if (!isFirebaseConfigured()) {
      setPrivateMessages([]);
      setMessagesMessage("Firebase doit etre configure pour les messages.");
      return;
    }

    try {
      const messages = await loadPrivateMessages(userId);
      setPrivateMessages(messages);
      setMessagesMessage(messages.length ? "Messages synchronises." : "Aucun message pour le moment.");
    } catch {
      setMessagesMessage("Impossible de charger les messages pour le moment.");
    }
  }

  async function refreshSkinTrades(userId: string) {
    if (!isFirebaseConfigured()) {
      setSkinTrades([]);
      setTradesMessage("Firebase doit etre configure pour les echanges.");
      return;
    }

    try {
      const trades = await loadSkinTrades(userId);
      setSkinTrades(trades);
      setTradesMessage(trades.length ? "Echanges synchronises." : "Aucun echange pour le moment.");
    } catch {
      setTradesMessage("Impossible de charger les echanges pour le moment.");
    }
  }

  async function refreshOnlineRooms() {
    if (!isFirebaseConfigured()) {
      setOnlineRooms([]);
      setOnlineMessage("Firebase doit etre configure pour les jeux en ligne.");
      return;
    }

    try {
      const rooms = await loadOnlineRooms();
      restoreVisiblePokerRooms(rooms);
      let removedAfterSyncCount = 0;
      const inactivePokerRooms = rooms.filter((room) => isInactivePokerRoom(room));
      inactivePokerRooms.forEach((room) => rememberHiddenInactivePokerRoom(room.id));
      setOnlineRooms((currentRooms) => {
        const nextRooms = rooms.filter((room) => !forceClosedPokerRoomsRef.current.has(room.id) && !hiddenInactivePokerRoomsRef.current.has(room.id));
        removedAfterSyncCount = rooms.length - nextRooms.length;
        return nextRooms.length === currentRooms.length && nextRooms.every((room, index) => room.id === currentRooms[index]?.id) ? currentRooms : nextRooms;
      });
      const visibleRooms = rooms.filter((room) => !forceClosedPokerRoomsRef.current.has(room.id) && !hiddenInactivePokerRoomsRef.current.has(room.id) && !isInactivePokerRoom(room));

      if (inactivePokerRooms.length > 0 || removedAfterSyncCount > 0) {
        setOnlineMessage(`${Math.max(inactivePokerRooms.length, removedAfterSyncCount)} table(s) poker bloquee(s) retiree(s).`);
      } else {
        setOnlineMessage(visibleRooms.length ? "Salons en ligne disponibles." : "Aucun salon ouvert pour le moment.");
      }

      if (accountUser) {
        await Promise.allSettled(
          inactivePokerRooms
            .filter((room) => room.players.some((player) => player.uid === accountUser.uid))
            .map((room) => deleteInactivePokerRoom(room, accountUser)),
        );
      }
    } catch {
      setOnlineMessage("Impossible de charger les salons en ligne pour le moment.");
    }
  }

  async function refreshDuelHistory(userId: string) {
    if (!isFirebaseConfigured()) {
      setDuelHistory([]);
      return;
    }

    try {
      const history = await loadDuelHistory(userId);
      setDuelHistory(history);
    } catch {
      setDuelHistory([]);
    }
  }

  async function refreshAdminData() {
    if (!isAdmin) {
      return;
    }

    try {
      const [players, rooms, trades] = await Promise.all([loadAdminPlayers(), loadAdminRooms(), loadAdminTrades()]);
      setAdminPlayers(players);
      setAdminRooms(rooms);
      setAdminTrades(trades);
      setAdminMessage("Donnees admin synchronisees.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setAdminMessage(`Admin indisponible : ${message}`);
    }
  }

  async function handleAdminCommand(command: string) {
    if (!accountUser || !isAdmin) {
      setAdminMessage("Compte admin requis.");
      return false;
    }

    const result = await executeAdminCommand(accountUser, command);
    setLastAdminResult(result);
    setAdminMessage(result.message);
    await Promise.allSettled([refreshAdminData(), refreshLeaderboard(), refreshOnlineRooms()]);
    return result.ok;
  }

  async function handleOpenPlayerProfile(entry: LeaderboardEntry) {
    setFriendRequestMessage("");
    setProfileEditMessage("");
    setSelectedProfile(entry);
    setSelectedProfileStats(null);

    try {
      const stats = await loadDuelStats(entry.uid);
      setSelectedProfileStats(stats);
    } catch {
      setSelectedProfileStats(null);
    }
  }

  function handleOpenOwnProfile() {
    if (!accountUser) {
      setAccountMessage("Connecte-toi pour ouvrir ton profil.");
      return;
    }

    const leaderboardProfile = leaderboard.find((entry) => entry.uid === accountUser.uid);
    setFriendRequestMessage("");
    setProfileEditMessage("");
    setSelectedProfile(
      leaderboardProfile ?? {
        uid: accountUser.uid,
        displayName: accountUser.displayName || accountUser.email || "Joueur",
        photoURL: publicProfilePhotoURL(accountUser.photoURL),
        balance,
        inventory: buildPublicInventory(ownedSkinIds),
        specialInventory: buildPublicSpecialInventory(specialInventory),
        equippedSkins,
        isAdmin,
      },
    );
    setSelectedProfileStats(null);
    loadDuelStats(accountUser.uid).then(setSelectedProfileStats).catch(() => setSelectedProfileStats(null));
    setMobileMenuOpen(false);
  }

  async function handleSaveOwnProfile(displayName: string, photoURL: string) {
    if (!accountUser) {
      setProfileEditMessage("Connecte-toi pour modifier ton profil.");
      return;
    }

    try {
      setProfileEditMessage("Sauvegarde du profil...");
      const updatedUser = await updateCasinoUserProfile(displayName, photoURL);
      const nextUser = updatedUser ?? { ...accountUser, displayName: displayName.trim(), photoURL: photoURL.trim() };
      setAccountUser(nextUser);
      await saveLeaderboardEntry(nextUser, balance, buildPublicInventory(ownedSkinIds), equippedSkins, buildPublicSpecialInventory(specialInventory));
      await refreshLeaderboard();
      setSelectedProfile((profile) =>
        profile
          ? {
              ...profile,
              displayName: nextUser.displayName || "Joueur anonyme",
              photoURL: publicProfilePhotoURL(nextUser.photoURL),
              balance,
              inventory: buildPublicInventory(ownedSkinIds),
              specialInventory: buildPublicSpecialInventory(specialInventory),
              equippedSkins,
            }
          : profile,
      );
      setProfileEditMessage("Profil mis a jour.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setProfileEditMessage(`Profil impossible a modifier : ${message}`);
    }
  }

  async function handleSendFriendRequest(entry: LeaderboardEntry) {
    if (!accountUser) {
      setFriendRequestMessage("Connecte-toi avec Google pour envoyer une demande.");
      return;
    }

    if (accountUser.uid === entry.uid) {
      setFriendRequestMessage("C'est ton profil.");
      return;
    }

    try {
      await sendFriendRequest(accountUser, entry);
      setFriendRequestMessage(`Demande envoyee a ${entry.displayName}.`);
      await refreshFriendRequests(accountUser.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setFriendRequestMessage(`Demande impossible : ${message}`);
    }
  }

  async function handleAnswerFriendRequest(request: FriendRequestEntry, status: "accepted" | "rejected") {
    if (!accountUser) {
      setFriendsMessage("Connecte-toi pour gerer tes demandes.");
      return;
    }

    try {
      await answerFriendRequest(request.id, status);
      setFriendsMessage(status === "accepted" ? "Demande acceptee." : "Demande refusee.");
      await refreshFriendRequests(accountUser.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setFriendsMessage(`Action impossible : ${message}`);
    }
  }

  async function handleSendPrivateMessage(friend: { uid: string; displayName: string }, body: string) {
    if (!accountUser) {
      setMessagesMessage("Connecte-toi pour envoyer un message.");
      return false;
    }

    const cleanBody = normalizePrivateMessageBody(body);

    if (!cleanBody) {
      setMessagesMessage("Ecris un message avant de l'envoyer.");
      return false;
    }

    if (!areUsersFriends(friendRequests, accountUser.uid, friend.uid)) {
      setMessagesMessage("Tu peux envoyer des messages uniquement a tes amis.");
      return false;
    }

    const nowMs = Date.now();
    if (nowMs - lastPrivateMessageSentAtRef.current < MESSAGE_SEND_COOLDOWN_MS) {
      setMessagesMessage("Attends un petit instant avant d'envoyer un autre message.");
      return false;
    }

    try {
      lastPrivateMessageSentAtRef.current = nowMs;
      await sendPrivateMessage(accountUser, friend, cleanBody);
      setMessagesMessage(`Message envoye a ${friend.displayName}.`);
      await refreshPrivateMessages(accountUser.uid);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setMessagesMessage(`Message impossible : ${message}`);
      return false;
    }
  }

  async function handleMarkPrivateMessagesRead(messages: PrivateMessageEntry[]) {
    if (!accountUser || messages.length === 0) {
      return;
    }

    try {
      await markPrivateMessagesRead(accountUser.uid, messages);
      await refreshPrivateMessages(accountUser.uid);
    } catch {
      setMessagesMessage("Certains messages n'ont pas pu etre marques comme lus.");
    }
  }

  async function handleCreateOnlineRoom(type: OnlineRoomType, game: string, invitedPlayer?: OnlineRoomPlayer, options: { russianBet?: number } = {}) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour creer un salon.");
      return;
    }

    try {
      await createOnlineRoom(accountUser, type, game, invitedPlayer, options);
      setOnlineMessage(
        invitedPlayer
          ? `Invitation envoyee a ${invitedPlayer.displayName}.`
          : type === "poker"
            ? "Table de poker creee."
            : type === "russian-roulette"
              ? "Salon de roulette russe cree."
              : "Salon de duel cree.",
      );
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Creation impossible : ${message}`);
    }
  }

  async function handleJoinOnlineRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour rejoindre un salon.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await joinOnlineRoom(room, accountUser);
      setOnlineMessage(`Tu as rejoint ${room.game}.`);
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Impossible de rejoindre : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleLeaveOnlineRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour quitter un salon.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await leaveOnlineRoom(room, accountUser);
      setOnlineMessage(`Tu as quitte ${room.game}.`);
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Impossible de quitter : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleStartDuelRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour lancer un duel.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await startDuelRoom(room, accountUser);
      setOnlineMessage("Duel lance. Chaque joueur doit jouer 3 manches.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Lancement impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handlePlayDuelRound(room: OnlineRoomEntry, roundScore?: number) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour jouer une manche.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await playDuelRound(room, accountUser, roundScore);
      setOnlineMessage("Manche jouee et score sauvegarde.");
      await refreshOnlineRooms();
      await refreshDuelHistory(accountUser.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Manche impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleStartRussianRouletteRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour lancer la roulette russe.");
      return;
    }

    if (balance < room.russianBet) {
      setOnlineMessage("Solde insuffisant pour payer la premiere mise.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await startRussianRouletteRoom(room, accountUser);
      setOnlineMessage("Roulette russe lancee. Chaque survivant repaie a son tour.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Lancement impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handlePlayRussianRouletteRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour jouer.");
      return;
    }

    const bet = Math.max(25, Math.floor(room.russianBet || 25));

    if (balance < bet) {
      setOnlineMessage(`Il faut ${bet.toLocaleString("fr-FR")} credits pour jouer ce round.`);
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      setBalance((current) => current - bet);
      const result = await playRussianRouletteTurn(room, accountUser);
      await refreshOnlineRooms();

      if (!result) {
        setOnlineMessage("Tour joue.");
      } else if (result.winnerUid) {
        setOnlineMessage(
          result.winnerUid === accountUser.uid
            ? `Tu survis et tu remportes le pot de ${result.pot.toLocaleString("fr-FR")} credits.`
            : `${result.winnerName || "Un joueur"} gagne le pot de ${result.pot.toLocaleString("fr-FR")} credits.`,
        );
      } else {
        setOnlineMessage(result.eliminated ? "Tu es elimine de la roulette russe." : "Tu survis a ce round.");
      }
    } catch (error) {
      setBalance((current) => current + bet);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleStartPokerRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour lancer la table.");
      return;
    }

    if (balance < 25) {
      setOnlineMessage("Il faut au moins 25 credits pour entrer dans une main de poker.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await startPokerRoom(room, accountUser);
      setOnlineMessage("Table lancee. Les cartes sont distribuees.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Lancement poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleAdvancePokerPhase(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour avancer la table.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await advancePokerPhase(room, accountUser);
      setOnlineMessage("La table avance.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleCheckPoker(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour checker.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await checkPokerPlayer(room, accountUser);
      setOnlineMessage("Check enregistre.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleCallPoker(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour suivre la mise.");
      return;
    }

    const amountToCall = Math.max(0, room.pokerCurrentBet - (room.pokerContributions[accountUser.uid] ?? 0));

    if (balance < amountToCall) {
      setOnlineMessage("Solde insuffisant pour suivre.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await callPokerPlayer(room, accountUser);
      setBalance((current) => current - amountToCall);
      setOnlineMessage("Mise suivie.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleAllInPoker(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour faire tapis.");
      return;
    }

    const amountToCall = Math.max(0, room.pokerCurrentBet - (room.pokerContributions[accountUser.uid] ?? 0));

    if (amountToCall <= 0) {
      setOnlineMessage("Tu peux checker, il n'y a rien a suivre.");
      return;
    }

    if (balance <= 0) {
      setOnlineMessage("Tu n'as plus de credits pour faire tapis.");
      return;
    }

    if (balance >= amountToCall) {
      setOnlineMessage("Tu as assez de credits pour suivre normalement.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await allInPokerPlayer(room, accountUser, balance);
      setBalance(0);
      setOnlineMessage("Tapis envoye : les cartes sont revelees.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Tapis impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleRaisePoker(room: OnlineRoomEntry, targetBet: number) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour relancer.");
      return;
    }

    const newBet = Math.floor(targetBet);

    if (!Number.isFinite(newBet) || newBet < 25) {
      setOnlineMessage("La mise minimum est de 25 credits.");
      return;
    }

    if (newBet <= room.pokerCurrentBet) {
      setOnlineMessage("Ta relance doit depasser la mise actuelle.");
      return;
    }

    const amountToPay = Math.max(0, newBet - (room.pokerContributions[accountUser.uid] ?? 0));

    if (balance < amountToPay) {
      setOnlineMessage("Solde insuffisant pour relancer.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await raisePokerPlayer(room, accountUser, newBet);
      setBalance((current) => current - amountToPay);
      setOnlineMessage(`Mise de ${newBet.toLocaleString("fr-FR")} credits enregistree.`);
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleFoldPoker(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour te coucher.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await foldPokerPlayer(room, accountUser);
      setOnlineMessage("Tu t'es couche sur cette main.");
      await refreshOnlineRooms();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setOnlineMessage(`Action poker impossible : ${message}`);
    } finally {
      setOnlineActionRoomId(null);
    }
  }

  async function handleForceClosePokerRoom(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour retirer cette table.");
      return;
    }

    if (room.type !== "poker" || !room.players.some((player) => player.uid === accountUser.uid)) {
      setOnlineMessage("Tu ne peux retirer que tes tables poker.");
      return;
    }

    const refundKey = `${room.id}:${room.pokerHandId}:${accountUser.uid}`;

    if (!refundedInactivePokerRoomsRef.current.has(refundKey)) {
      const anteKey = `${room.id}:${room.pokerHandId}:${accountUser.uid}`;
      const anteRefund = paidPokerAnteRoomsRef.current.has(anteKey) ? 25 : 0;
      const contributionRefund = room.pokerContributions[accountUser.uid] ?? 0;
      const trackedRefund = room.pokerPaidByPlayer[accountUser.uid];
      const refundAmount = trackedRefund ?? anteRefund + contributionRefund;

      if (refundAmount > 0) {
        setBalance((current) => current + refundAmount);
      }

      rememberInactivePokerRefund(refundKey);
    }

    rememberHiddenInactivePokerRoom(room.id);
    rememberForceClosedPokerRoom(room.id);
    setOnlineRooms((currentRooms) => currentRooms.filter((currentRoom) => currentRoom.id !== room.id));
    setOnlineMessage("Table poker retiree de ton affichage.");

    try {
      await deleteInactivePokerRoom(room, accountUser);
    } catch {
      setOnlineMessage("Table retiree de ton affichage. La suppression Firebase attendra les regles publiees.");
    }
  }

  async function handleCreateSkinTrade(
    friend: { uid: string; displayName: string },
    offeredItemId: string,
    requestedItemId: string,
    offeredCredits: number,
    requestedCredits: number,
  ) {
    if (!accountUser) {
      setTradesMessage("Connecte-toi pour proposer un echange.");
      return false;
    }

    if ((!offeredItemId && offeredCredits <= 0) || (!requestedItemId && requestedCredits <= 0)) {
      setTradesMessage("Choisis au moins un objet ou des credits de chaque cote.");
      return false;
    }

    if (offeredItemId && !hasTradeItemCopy(ownedSkinIds, specialInventory, offeredItemId)) {
      setTradesMessage("Tu ne possedes plus cet objet.");
      return false;
    }

    if (offeredCredits > balance) {
      setTradesMessage("Tu n'as pas assez de credits pour envoyer cette offre.");
      return false;
    }

    const previousOwnedSkinIds = ownedSkinIds;
    const previousSpecialInventory = specialInventory;
    const previousBalance = balance;
    if (offeredItemId) {
      if (parseSpecialTradeItemId(offeredItemId)) {
        setSpecialInventory((current) => updateSpecialInventoryCopy(current, offeredItemId, -1));
      } else {
        setOwnedSkinIds((current) => removeOneSkinCopy(current, offeredItemId));
      }
    }
    if (offeredCredits > 0) {
      setBalance((current) => current - offeredCredits);
    }

    try {
      await createSkinTrade(accountUser, friend, offeredItemId, requestedItemId, offeredCredits, requestedCredits);
      setTradesMessage(`Offre envoyee a ${friend.displayName}.`);
      await refreshSkinTrades(accountUser.uid);
      return true;
    } catch (error) {
      setOwnedSkinIds(previousOwnedSkinIds);
      setSpecialInventory(previousSpecialInventory);
      setBalance(previousBalance);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setTradesMessage(`Echange impossible : ${message}`);
      return false;
    }
  }

  async function handleCounterSkinTrade(
    originalTrade: SkinTradeEntry,
    friend: { uid: string; displayName: string },
    offeredItemId: string,
    requestedItemId: string,
    offeredCredits: number,
    requestedCredits: number,
  ) {
    if (!accountUser) {
      setTradesMessage("Connecte-toi pour proposer une contre-offre.");
      return false;
    }

    const created = await handleCreateSkinTrade(friend, offeredItemId, requestedItemId, offeredCredits, requestedCredits);

    if (!created) {
      return false;
    }

    try {
      await answerSkinTrade(originalTrade, accountUser, "rejected");
      setTradesMessage(`Contre-offre envoyee a ${friend.displayName}.`);
      await refreshSkinTrades(accountUser.uid);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setTradesMessage(`Contre-offre envoyee, mais l'ancienne offre n'a pas pu etre fermee : ${message}`);
      return true;
    }
  }

  async function handleAnswerSkinTrade(trade: SkinTradeEntry, status: "accepted" | "rejected" | "canceled") {
    if (!accountUser) {
      setTradesMessage("Connecte-toi pour gerer tes echanges.");
      return false;
    }

    if (status === "accepted" && trade.requestedItemId && !hasTradeItemCopy(ownedSkinIds, specialInventory, trade.requestedItemId)) {
      setTradesMessage("Tu n'as plus l'objet demande pour accepter cet echange.");
      return false;
    }

    if (status === "accepted" && trade.requestedCredits > balance) {
      setTradesMessage("Tu n'as pas assez de credits pour accepter cet echange.");
      return false;
    }

    try {
      await answerSkinTrade(trade, accountUser, status);
      setTradesMessage(status === "accepted" ? "Echange accepte." : status === "rejected" ? "Echange refuse." : "Echange annule.");
      await refreshSkinTrades(accountUser.uid);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setTradesMessage(`Action impossible : ${message}`);
      return false;
    }
  }

  function getCurrentSaveState(): SavedGameState {
    return {
      version: 1,
      balance,
      ownedSkinIds,
      equippedSkins,
      slotHistory,
      blackjackHistory,
      plinkoHistory,
      rouletteHistory,
      rocketHistory,
      caseHistory,
      specialInventory,
      clawHistory,
      rewardedAds,
      missionCounters,
      missionState: activeMissionState,
    };
  }

  function applyCloudSave(importedSave: SavedGameState) {
    setBalance(importedSave.balance);
    setOwnedSkinIds(importedSave.ownedSkinIds);
    setEquippedSkins(importedSave.equippedSkins);
    setSlotHistory(importedSave.slotHistory);
    setBlackjackHistory(importedSave.blackjackHistory);
    setPlinkoHistory(importedSave.plinkoHistory);
    setRouletteHistory(importedSave.rouletteHistory);
    setRocketHistory(importedSave.rocketHistory);
    setCaseHistory(importedSave.caseHistory);
    setSpecialInventory(importedSave.specialInventory);
    setClawHistory(importedSave.clawHistory);
    setRewardedAds(importedSave.rewardedAds);
    setMissionCounters(importedSave.missionCounters);
    setMissionState(importedSave.missionState);
    setLastCaseDrop(importedSave.caseHistory[0] ?? null);
    setActivePlinkoLaunches([]);
    setRocketAnimating(false);
    setRocketFlight(null);
    setCaseOpening(false);
    setCaseModalVisible(false);
    spinId.current = getNextHistoryId(importedSave.slotHistory);
    handId.current = getNextHistoryId(importedSave.blackjackHistory);
    plinkoId.current = getNextHistoryId(importedSave.plinkoHistory);
    rouletteId.current = getNextHistoryId(importedSave.rouletteHistory);
    rocketId.current = getNextHistoryId(importedSave.rocketHistory);
    caseId.current = getNextHistoryId(importedSave.caseHistory);
    clawId.current = getNextHistoryId(importedSave.clawHistory);
  }

  async function handleGoogleSignIn() {
    if (!isFirebaseConfigured()) {
      setAccountMessage("Firebase n'est pas encore configure dans le fichier .env.");
      return;
    }

    setAccountLoading(true);
    setAccountMessage("Ouverture de la connexion Google...");

    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      setAccountMessage(`Connexion Google impossible : ${message}`);
      setAccountLoading(false);
    }
  }

  async function handleGoogleSignOut() {
    setAccountLoading(true);
    try {
      await signOutGoogle();
    } finally {
      setAccountLoading(false);
    }
  }

  function handleSlotSpin() {
    if (paused) {
      setSlotMessage("La pause est active. Reprends seulement quand tu le souhaites.");
      return;
    }

    if (!slotBetAvailable) {
      setSlotMessage("Solde virtuel insuffisant pour cette mise.");
      return;
    }

    if (slotSpinning) {
      return;
    }

    const outcome = spin(slotBet);
    const nextBalance = balance - slotBet + outcome.payout;
    slotIntervalId.current = window.setInterval(() => {
      setCurrentReels([...createReels()]);
    }, 90);

    setSlotSpinning(true);
    setSlotMessage("Les rouleaux tournent...");

    slotTimeoutId.current = window.setTimeout(() => {
      if (slotIntervalId.current !== null) {
        window.clearInterval(slotIntervalId.current);
        slotIntervalId.current = null;
      }
      setBalance(nextBalance);
      setCurrentReels([...outcome.reels]);
      setSlotMessage(
        outcome.net >= 0
          ? `${outcome.label} : +${outcome.net} credits virtuels.`
          : "Perte de la mise virtuelle.",
      );
      setSlotHistory((items) => [
        {
          ...outcome,
          id: spinId.current++,
          bet: slotBet,
          balanceAfter: nextBalance,
        },
        ...items,
      ].slice(0, 10));
      addMissionProgress("slotSpins");
      setSlotSpinning(false);
      slotTimeoutId.current = null;
    }, 1350);
  }

  function startBlackjackHand() {
    if (paused) {
      setBlackjackMessage("La pause responsable est active.");
      return;
    }

    if (!blackjackBetAvailable) {
      setBlackjackMessage("Solde virtuel insuffisant pour cette mise.");
      return;
    }

    let nextDeck = shuffleDeck(createDeck());
    const dealtPlayer: Card[] = [];
    const dealtDealer: Card[] = [];

    for (let index = 0; index < 2; index += 1) {
      let draw = drawCard(nextDeck);
      dealtPlayer.push(draw.card);
      nextDeck = draw.deck;
      draw = drawCard(nextDeck);
      dealtDealer.push(draw.card);
      nextDeck = draw.deck;
    }

    setActiveBlackjackBet(blackjackBet);
    setDeck(nextDeck);
    setPlayerHand(dealtPlayer);
    setDealerHand(dealtDealer);
    setHasPlayerAction(false);

    if (isBlackjack(dealtPlayer) || isBlackjack(dealtDealer)) {
      finishBlackjackHand(dealtPlayer, dealtDealer, blackjackBet);
      return;
    }

    setBlackjackPhase("player");
    setBlackjackMessage("A toi de jouer : tirer, rester ou doubler.");
  }

  function hitBlackjack() {
    const draw = drawCard(deck);
    const nextPlayerHand = [...playerHand, draw.card];

    setDeck(draw.deck);
    setPlayerHand(nextPlayerHand);
    setHasPlayerAction(true);

    if (isBust(nextPlayerHand)) {
      finishBlackjackHand(nextPlayerHand, dealerHand, activeBlackjackBet);
    } else {
      setBlackjackMessage(`Main joueur : ${handValue(nextPlayerHand)}.`);
    }
  }

  function standBlackjack() {
    playDealerAndFinish(playerHand, dealerHand, deck, activeBlackjackBet);
  }

  function doubleBlackjack() {
    if (!canDouble) {
      setBlackjackMessage("Le double est disponible seulement au premier tour avec assez de credits.");
      return;
    }

    const doubledBet = activeBlackjackBet * 2;
    const draw = drawCard(deck);
    const nextPlayerHand = [...playerHand, draw.card];

    setActiveBlackjackBet(doubledBet);
    setPlayerHand(nextPlayerHand);
    setDeck(draw.deck);
    setHasPlayerAction(true);

    if (isBust(nextPlayerHand)) {
      finishBlackjackHand(nextPlayerHand, dealerHand, doubledBet);
    } else {
      playDealerAndFinish(nextPlayerHand, dealerHand, draw.deck, doubledBet);
    }
  }

  function playDealerAndFinish(
    finalPlayerHand: Card[],
    initialDealerHand: Card[],
    currentDeck: Card[],
    finalBet: number,
  ) {
    let nextDeck = currentDeck;
    const finalDealerHand = [...initialDealerHand];

    while (dealerShouldDraw(finalDealerHand)) {
      const draw = drawCard(nextDeck);
      finalDealerHand.push(draw.card);
      nextDeck = draw.deck;
    }

    setDeck(nextDeck);
    finishBlackjackHand(finalPlayerHand, finalDealerHand, finalBet);
  }

  function finishBlackjackHand(finalPlayerHand: Card[], finalDealerHand: Card[], finalBet: number) {
    const payout = calculateBlackjackPayout(finalBet, finalPlayerHand, finalDealerHand);
    const nextBalance = balance + payout.net;

    setBalance(nextBalance);
    setPlayerHand(finalPlayerHand);
    setDealerHand(finalDealerHand);
    setBlackjackPhase("finished");
    setHasPlayerAction(true);
    setBlackjackMessage(
      payout.net > 0
        ? `${payout.label} : +${payout.net} credits virtuels.`
        : payout.net === 0
          ? "Egalite : mise virtuelle remboursee."
          : `${payout.label} : ${payout.net} credits virtuels.`,
    );
    setBlackjackHistory((items) => [
      {
        ...payout,
        id: handId.current++,
        bet: finalBet,
        playerValue: handValue(finalPlayerHand),
        dealerValue: handValue(finalDealerHand),
        playerCards: formatHand(finalPlayerHand),
        dealerCards: formatHand(finalDealerHand),
        balanceAfter: nextBalance,
      },
      ...items,
    ].slice(0, 10));
    addMissionProgress("blackjackHands");
  }

  function launchPlinko() {
    if (paused) {
      setPlinkoMessage("La pause responsable est active.");
      return;
    }

    if (plinkoBet > PLINKO_MAX_BET) {
      setPlinkoMessage(`La mise Plinko est limitee a ${PLINKO_MAX_BET.toLocaleString("fr-FR")} credits.`);
      return;
    }

    if (!plinkoBetAvailable) {
      setPlinkoMessage("Solde virtuel insuffisant pour cette mise.");
      return;
    }

    const launch: PlinkoLaunch = {
      id: plinkoId.current++,
      bet: plinkoBet,
      rows: plinkoRows,
    };

    setBalance((current) => current - plinkoBet);
    setActivePlinkoLaunches((items) => [...items, launch]);
    setPlinkoMessage(
      activePlinkoLaunches.length === 0
        ? "La premiere bille descend dans la grille..."
        : `${activePlinkoLaunches.length + 1} billes sont en mouvement.`,
    );
  }

  function finishPlinko(launch: PlinkoLaunch, slot: number, path: PlinkoStep[]) {
    const multiplier = getPlinkoMultiplier(slot, launch.rows, plinkoLayout);
    const payout = calculatePlinkoPayout(launch.bet, multiplier);
    const nextBalance = balance + payout.payout;
    const outcome: PlinkoOutcome = {
      path,
      slot,
      multiplier,
      ...payout,
    };

    setBalance((current) => current + payout.payout);
    setPlinkoBallSlots((items) => [slot, ...items].slice(0, 4));
    setPlinkoMessage(
      outcome.net >= 0
        ? `Case ${outcome.slot} : x${outcome.multiplier}, +${outcome.net} credits virtuels.`
        : `Case ${outcome.slot} : x${outcome.multiplier}, ${outcome.net} credits virtuels.`,
    );
    setPlinkoHistory((items) => [
      {
        ...outcome,
        id: launch.id,
        bet: launch.bet,
        rows: launch.rows,
        balanceAfter: nextBalance,
      },
      ...items,
    ].slice(0, 10));
    addMissionProgress("plinkoDrops");
    setActivePlinkoLaunches((items) => items.filter((item) => item.id !== launch.id));
  }

  function spinRoulette() {
    if (paused) {
      setRouletteMessage("La pause responsable est active.");
      return;
    }

    if (!rouletteBetAvailable) {
      setRouletteMessage("Solde virtuel insuffisant pour cette mise.");
      return;
    }

    if (rouletteSpinning) {
      return;
    }

    const outcome = playRoulette(
      { kind: rouletteBetKind, number: rouletteBetKind === "straight" ? rouletteNumber : undefined },
      rouletteBet,
    );

    setPendingRouletteResult(outcome.number);
    setRouletteSpinning(true);
    setRouletteRunId((value) => value + 1);
    setRouletteMessage("La roue tourne...");

    window.setTimeout(() => {
      const nextBalance = balance + outcome.net;

      setBalance(nextBalance);
      setRouletteResult(outcome.number);
      setPendingRouletteResult(null);
      setRouletteMessage(
        outcome.isWin
          ? `${outcome.number} ${formatRouletteColor(outcome.color)} : ${outcome.label}, +${outcome.net} credits virtuels.`
          : `${outcome.number} ${formatRouletteColor(outcome.color)} : perte de la mise virtuelle.`,
      );
      setRouletteHistory((items) => [
        {
          ...outcome,
          id: rouletteId.current++,
          bet: rouletteBet,
          betKind: rouletteBetKind,
          chosenNumber: rouletteNumber,
          balanceAfter: nextBalance,
        },
        ...items,
      ].slice(0, 10));
      addMissionProgress("rouletteSpins");
      setRouletteSpinning(false);
    }, ROULETTE_SPIN_DURATION_MS);
  }

  function handleShopAction(item: ShopItem) {
    const pricedItem = { ...item, price: priceTools.skin(item) };
    const result = buySkin(balance, ownedSkinIds, pricedItem);

    if (!result.purchased) {
      setShopMessage("Solde virtuel insuffisant pour ce skin.");
      return;
    }

    setBalance(result.balance);
    setOwnedSkinIds(result.ownedSkinIds);
    setShopMessage(`${item.name} achete. Tu peux l'equiper depuis l'inventaire.`);
  }

  function handleEquipSkin(item: ShopItem) {
    if (!ownedSkinIds.includes(item.id)) {
      setShopMessage("Tu dois posseder ce skin avant de l'equiper.");
      return;
    }

    setEquippedSkins((current) => equipSkin(current, item));
    setShopMessage(`${item.name} equipe.`);
  }

  function buySpecialChest(chestId: SpecialChestId) {
    const chest = getSpecialChestDefinition(chestId);
    const chestPrice = priceTools.chest(chest);

    if (balance < chestPrice) {
      setShopMessage("Solde insuffisant pour acheter ce coffre special.");
      return;
    }

    setBalance((current) => current - chestPrice);
    setSpecialInventory((current) => ({
      ...current,
      chests: {
        ...current.chests,
        [chestId]: current.chests[chestId] + 1,
      },
    }));
    setShopMessage(`${chest.title} ajoute a ton inventaire.`);
  }

  function handleOpenCase() {
    if (paused) {
      setCaseMessage("La pause est active. Reprends quand tu veux ouvrir une caisse.");
      return;
    }

    if (caseOpening) {
      return;
    }

    const definition = getCaseDefinition(selectedCase);
    const caseCost = priceTools.caseCost(selectedCase);

    if (balance < caseCost) {
      setCaseMessage(`Solde insuffisant pour ouvrir ${definition.title}.`);
      return;
    }

    const balanceAdjustedForAdminPrice = balance + definition.cost - caseCost;
    const outcome = openCase(balanceAdjustedForAdminPrice, ownedSkinIds, SHOP_ITEMS, selectedCase);

    if (!outcome) {
      setCaseMessage("Solde insuffisant pour ouvrir cette caisse.");
      return;
    }

    const historyItem: CaseHistoryItem = {
      id: caseId.current++,
      item: outcome.item,
      caseTitle: definition.title,
      duplicate: outcome.duplicate,
      refund: outcome.refund,
      balanceAfter: outcome.balance,
    };

    setLastCaseDrop(null);
    setCaseReelItems(buildCaseReel(selectedCase, outcome.item));
    setCaseModalTitle(definition.title);
    setCaseModalPhase("box");
    setCaseModalVisible(true);
    setCaseOpening(true);
    setCaseMessage(`${definition.title} en ouverture...`);

    window.setTimeout(() => {
      setCaseModalPhase("reel");
    }, CASE_BOX_OPEN_DURATION_MS);

    window.setTimeout(() => {
      setBalance(outcome.balance);
      setOwnedSkinIds(outcome.ownedSkinIds);
      setLastCaseDrop(historyItem);
      setCaseHistory((items) => [historyItem, ...items].slice(0, 10));
      addMissionProgress("casesOpened");

      if (!outcome.duplicate) {
        setEquippedSkins((current) => equipSkin(current, outcome.item));
      }

      setCaseMessage(
        outcome.duplicate
          ? `Doublon : ${outcome.item.name} ajoute a ton inventaire.`
          : `${outcome.item.name} debloque et equipe.`,
      );
      setCaseOpening(false);
    }, CASE_BOX_OPEN_DURATION_MS + CASE_REEL_DURATION_MS);
  }

  function mergeKeyFragments(chestId: SpecialChestId) {
    const chest = getSpecialChestDefinition(chestId);

    if (specialInventory.fragments[chestId] < KEY_FRAGMENTS_REQUIRED) {
      setCaseMessage(`Il faut ${KEY_FRAGMENTS_REQUIRED} fragments pour creer une ${chest.keyName}.`);
      return;
    }

    setSpecialInventory((current) => ({
      ...current,
      fragments: {
        ...current.fragments,
        [chestId]: current.fragments[chestId] - KEY_FRAGMENTS_REQUIRED,
      },
      keys: {
        ...current.keys,
        [chestId]: current.keys[chestId] + 1,
      },
    }));
    setCaseMessage(`${KEY_FRAGMENTS_REQUIRED} fragments fusionnes en ${chest.keyName}.`);
  }

  function openOwnedSpecialChest(chestId: SpecialChestId) {
    const chest = getSpecialChestDefinition(chestId);

    if (caseOpening) {
      return;
    }

    if (specialInventory.chests[chestId] <= 0) {
      setCaseMessage(`Tu dois posseder un ${chest.title}.`);
      return;
    }

    if (specialInventory.keys[chestId] <= 0) {
      setCaseMessage(`Il faut une ${chest.keyName} pour ouvrir ce coffre.`);
      return;
    }

    const outcome = openSpecialChest(ownedSkinIds, SHOP_ITEMS, chestId);
    const historyItem: CaseHistoryItem = {
      id: caseId.current++,
      item: outcome.item,
      caseTitle: chest.title,
      duplicate: outcome.duplicate,
      refund: 0,
      balanceAfter: balance,
    };

    setLastCaseDrop(null);
    setSelectedCase(outcome.item.category);
    setCaseReelItems(buildCaseReel(outcome.item.category, outcome.item, chest.itemIds));
    setCaseModalTitle(chest.title);
    setCaseModalPhase("box");
    setCaseModalVisible(true);
    setCaseOpening(true);
    setCaseMessage(`${chest.title} en ouverture...`);

    setSpecialInventory((current) => ({
      ...current,
      chests: {
        ...current.chests,
        [chestId]: current.chests[chestId] - 1,
      },
      keys: {
        ...current.keys,
        [chestId]: current.keys[chestId] - 1,
      },
    }));

    window.setTimeout(() => {
      setCaseModalPhase("reel");
    }, CASE_BOX_OPEN_DURATION_MS);

    window.setTimeout(() => {
      setOwnedSkinIds(outcome.ownedSkinIds);
      setLastCaseDrop(historyItem);
      setCaseHistory((items) => [historyItem, ...items].slice(0, 10));
      addMissionProgress("casesOpened");
      if (!outcome.duplicate) {
        setEquippedSkins((current) => equipSkin(current, outcome.item));
      }
      setCaseMessage(outcome.duplicate ? `Doublon exclusif : ${outcome.item.name} ajoute.` : `${outcome.item.name} exclusif debloque et equipe.`);
      setCaseOpening(false);
    }, CASE_BOX_OPEN_DURATION_MS + CASE_REEL_DURATION_MS);
  }

  function playClawMachine(chestId?: SpecialChestId) {
    if (paused) {
      setClawMessage("La pause responsable est active.");
      return null;
    }

    if (balance < CLAW_COST) {
      setClawMessage("Solde insuffisant pour tenter la machine a pince.");
      return null;
    }

    const chest = chestId ? getSpecialChestDefinition(chestId) : SPECIAL_CHESTS[Math.floor(Math.random() * SPECIAL_CHESTS.length)];
    const roll = Math.random();
    const rewardType: ClawOutcome["rewardType"] = roll < 0.01 ? "key" : roll < 0.16 ? "fragments" : "credits";
    const creditRoll = Math.random();
    const amount =
      rewardType === "key"
        ? 1
        : rewardType === "fragments"
          ? roll < 0.04
            ? 3
            : roll < 0.09
              ? 2
              : 1
          : creditRoll < 0.44
            ? 25
            : creditRoll < 0.78
              ? 50
              : creditRoll < 0.94
                ? 75
                : creditRoll < 0.99
                  ? 100
                  : 150;
    const nextBalance = balance - CLAW_COST + (rewardType === "credits" ? amount : 0);
    const label =
      rewardType === "key"
        ? `${chest.keyName} attrapee`
        : rewardType === "fragments"
          ? `${amount} ${chest.fragmentName}${amount > 1 ? "s" : ""}`
          : `${amount} credits attrapes`;
    const outcome: ClawOutcome = {
      id: clawId.current++,
      chestId: chest.id,
      rewardType,
      amount,
      label,
      balanceAfter: nextBalance,
    };

    setBalance(nextBalance);
    if (rewardType === "key" || rewardType === "fragments") {
      setSpecialInventory((current) => ({
        ...current,
        keys: {
          ...current.keys,
          [chest.id]: current.keys[chest.id] + (rewardType === "key" ? amount : 0),
        },
        fragments: {
          ...current.fragments,
          [chest.id]: current.fragments[chest.id] + (rewardType === "fragments" ? amount : 0),
        },
      }));
    }
    setClawHistory((items) => [outcome, ...items].slice(0, 10));
    addMissionProgress("clawAttempts");
    setClawMessage(`${label} dans la boule.`);
    return outcome;
  }

  function handleRewardedAd() {
    if (rewardedAdWatching) {
      return;
    }

    const current = normalizeRewardedAds(rewardedAds);
    if (current.watched >= DAILY_REWARDED_AD_LIMIT) {
      setRewardedAds(current);
      setRewardedAdMessage("Limite atteinte pour aujourd'hui. Reviens demain pour d'autres bonus.");
      return;
    }

    setRewardedAdWatching(true);
    setRewardedAdMessage("Pub en cours. Les credits seront ajoutes a la fin.");

    window.setTimeout(() => {
      setBalance((currentBalance) => currentBalance + REWARDED_AD_CREDITS);
      setRewardedAds((latest) => {
        const normalized = normalizeRewardedAds(latest);
        return {
          date: normalized.date,
          watched: Math.min(DAILY_REWARDED_AD_LIMIT, normalized.watched + 1),
        };
      });
      addMissionProgress("rewardedAdsWatched");
      setRewardedAdWatching(false);
      setRewardedAdMessage(`+${REWARDED_AD_CREDITS} credits virtuels ajoutes.`);
    }, REWARDED_AD_WATCH_MS);
  }

  function claimMission(mission: MissionDefinition) {
    if (activeMissionState.claimedMissionIds.includes(mission.id)) {
      return;
    }

    const progress = Math.max(0, missionStats[mission.metric] - (activeMissionState.baselines[mission.metric] ?? 0));
    if (progress < mission.goal) {
      return;
    }

    setMissionState((current) => {
      const base = current?.hourKey === missionHourKey ? current : activeMissionState;
      return base.claimedMissionIds.includes(mission.id)
        ? base
        : {
            ...base,
            claimedMissionIds: [...base.claimedMissionIds, mission.id],
          };
    });
    setBalance((current) => current + mission.reward);
  }

  function launchRocket() {
    if (paused) {
      setRocketMessage("La pause responsable est active.");
      return;
    }

    if (!rocketBetAvailable) {
      setRocketMessage("Solde virtuel insuffisant pour cette mise.");
      return;
    }

    if (rocketAnimating) {
      return;
    }

    const target = normalizeRocketTarget(rocketTarget);
    setRocketTarget(target);

    const outcome = playRocketRound(rocketBet, target);
    setRocketFlight(outcome);
    setRocketAnimating(true);
    setRocketMessage("La fusee monte...");

    window.setTimeout(() => {
      const nextBalance = balance + outcome.net;

      setBalance(nextBalance);
      setRocketMessage(
        outcome.success
          ? `Cible ${formatMultiplier(outcome.target)} atteinte avant ${formatMultiplier(outcome.crashMultiplier)} : +${formatCredits(outcome.net)} credits virtuels.`
          : `Retombee a ${formatMultiplier(outcome.crashMultiplier)} avant ${formatMultiplier(outcome.target)} : perte de la mise virtuelle.`,
      );
      setRocketHistory((items) => [
        {
          ...outcome,
          id: rocketId.current++,
          bet: rocketBet,
          balanceAfter: nextBalance,
        },
        ...items,
      ].slice(0, 10));
      addMissionProgress("rocketLaunches");
      setRocketAnimating(false);
    }, ROCKET_FLIGHT_DURATION_MS);
  }

  function selectMainSection(section: MainSection) {
    setActiveSection(section);
    if (section !== "games" && section !== "online") {
      setMobileMenuOpen(false);
    }
  }

  function selectGame(game: CasinoGame) {
    setActiveGame(game);
    setActiveSection("games");
    setMobileMenuOpen(false);
  }

  function selectOnlineGame(game: OnlineRoomType) {
    setActiveOnlineGame(game);
    setActiveSection("online");
    setMobileMenuOpen(false);
  }

  const currentUserIsLeaderboardLeader = Boolean(accountUser && leaderboard[0]?.uid === accountUser.uid);

  return (
    <main className={styles.app}>
      <section className={styles.shell} aria-label="Jackpot City">
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <h1>Jackpot City</h1>
            <p className={styles.disclaimer}>Casino virtuel</p>
          </div>

          <div className={styles.headerStats} aria-label="Statut de la partie">
            <div>
              <span>Solde</span>
              <strong>{balance.toLocaleString("fr-FR")}</strong>
            </div>
            <div>
              <span>Bilan</span>
              <strong className={totalNet >= 0 ? styles.positive : styles.negative}>
                {totalNet >= 0 ? "+" : ""}
                {totalNet.toLocaleString("fr-FR")}
              </strong>
            </div>
          </div>

          <div className={styles.accountTools}>
            {accountUser ? (
              <>
                <span>{accountUser.displayName || accountUser.email || "Compte Google"}</span>
                <button className={styles.secondaryButton} type="button" onClick={handleGoogleSignOut} disabled={accountLoading}>
                  Déconnexion
                </button>
                <small>{accountMessage}</small>
              </>
            ) : (
              <button
                className={`${styles.secondaryButton} ${styles.googleAccountButton}`}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={accountLoading || !isFirebaseConfigured()}
                title="Connecte-toi pour sauvegarder tes scores"
                data-tooltip="Connecte-toi pour sauvegarder tes scores"
              >
                Connexion avec Google
              </button>
            )}
          </div>

          <div className={styles.ageBadge} aria-label="Reserve aux adultes">
            18+
          </div>
        </header>

        {selectedProfile && (
          <PlayerProfileModal
            currentUserId={accountUser?.uid ?? null}
            duelStats={selectedProfileStats}
            friendRequestMessage={friendRequestMessage}
            editMessage={profileEditMessage}
            isFriend={accountUser ? areUsersFriends(friendRequests, accountUser.uid, selectedProfile.uid) : false}
            isLeaderboardLeader={leaderboard[0]?.uid === selectedProfile.uid}
            isPlayerAdmin={selectedProfile.isAdmin === true || (selectedProfile.uid === accountUser?.uid && isAdmin)}
            player={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onSaveProfile={handleSaveOwnProfile}
            onSendFriendRequest={() => handleSendFriendRequest(selectedProfile)}
          />
        )}

        {!mobileMenuOpen && (
          <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileMenuOpen(true)}>
            Menu
          </button>
        )}
        {mobileMenuOpen ? <button className={styles.mobileMenuBackdrop} type="button" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} /> : null}

        <nav
          className={`${styles.modeTabs} ${mobileMenuOpen ? styles.modeTabsOpen : ""}`}
          aria-label="Section principale"
          style={mobileMenuOpen ? { transform: "translateX(0px)", transition: "none" } : undefined}
        >
          <button className={styles.menuProfile} type="button" onClick={handleOpenOwnProfile}>
            <span className={styles.menuAvatarFrame}>
              {currentUserIsLeaderboardLeader ? (
                <span className={styles.menuRankBadge} aria-label="Premier du classement">
                  <svg viewBox="0 0 32 22" aria-hidden="true">
                    <path d="M4 20 L7 7 L13 14 L16 3 L19 14 L25 7 L28 20 Z" />
                    <path d="M7 20 H25" />
                  </svg>
                </span>
              ) : null}
              <ProfileAvatar
                avatarSeed={accountUser?.uid || accountUser?.email || accountUser?.displayName || "joueur"}
                className={styles.menuAvatar}
                displayName={accountUser?.displayName || "Joueur"}
                photoURL={accountUser?.photoURL}
              />
              {isAdmin ? (
                <span className={styles.menuAdminBadge} aria-label="Admin">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 4 L20 11" />
                    <path d="M11 6 L18 13" />
                    <path d="M5 20 L14 11" />
                    <path d="M3 18 L6 21" />
                    <path d="M10 5 L14 1 L23 10 L19 14 Z" />
                  </svg>
                </span>
              ) : null}
            </span>
            <div>
              <strong>{accountUser?.displayName || "Joueur"}</strong>
              <small>{balance.toLocaleString("fr-FR")} credits</small>
            </div>
          </button>
          <button
            className={activeSection === "home" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("home")}
          >
            <MenuIcon name="home" />
            <span className={styles.tabLabel}>Accueil</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "games" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("games")}
          >
            <MenuIcon name="games" />
            <span className={styles.tabLabel}>Jeux</span>
            <span className={styles.tabChevron} aria-hidden="true">{activeSection === "games" ? "⌄" : "›"}</span>
          </button>
          {activeSection === "games" && (
            <div className={styles.subTabs} aria-label="Choix du jeu">
              <button
                className={activeGame === "slots" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("slots")}
              >
                <MenuIcon name="slots" />
                <span className={styles.tabLabel}>Machine a sous</span>
              </button>
              <button
                className={activeGame === "blackjack" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("blackjack")}
              >
                <MenuIcon name="blackjack" />
                <span className={styles.tabLabel}>Blackjack</span>
              </button>
              <button
                className={activeGame === "plinko" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("plinko")}
              >
                <MenuIcon name="plinko" />
                <span className={styles.tabLabel}>Plinko</span>
              </button>
              <button
                className={activeGame === "roulette" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("roulette")}
              >
                <MenuIcon name="roulette" />
                <span className={styles.tabLabel}>Roulette</span>
              </button>
              <button
                className={activeGame === "rocket" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("rocket")}
              >
                <MenuIcon name="rocket" />
                <span className={styles.tabLabel}>Rocket Games</span>
              </button>
              <button
                className={activeGame === "claw" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectGame("claw")}
              >
                <MenuIcon name="claw" />
                <span className={styles.tabLabel}>Machine a pince</span>
              </button>
            </div>
          )}
          <button
            className={activeSection === "online" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("online")}
          >
            <MenuIcon name="online" />
            <span className={styles.tabLabel}>Jeux en ligne</span>
            <span className={styles.tabChevron} aria-hidden="true">{activeSection === "online" ? "⌄" : "›"}</span>
          </button>
          {activeSection === "online" && (
            <div className={styles.subTabs} aria-label="Choix du jeu en ligne">
              <button
                className={activeOnlineGame === "duel" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectOnlineGame("duel")}
              >
                <MenuIcon name="duel" />
                <span className={styles.tabLabel}>Duel</span>
              </button>
              <button
                className={activeOnlineGame === "poker" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectOnlineGame("poker")}
              >
                <MenuIcon name="poker" />
                <span className={styles.tabLabel}>Poker</span>
              </button>
              <button
                className={activeOnlineGame === "russian-roulette" ? styles.activeTab : ""}
                type="button"
                onClick={() => selectOnlineGame("russian-roulette")}
              >
                <MenuIcon name="roulette" />
                <span className={styles.tabLabel}>Roulette russe</span>
              </button>
            </div>
          )}
          <button
            className={activeSection === "missions" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("missions")}
          >
            <MenuIcon name="missions" />
            <span className={styles.tabLabel}>Missions</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "cases" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("cases")}
          >
            <MenuIcon name="cases" />
            <span className={styles.tabLabel}>Cases</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "shop" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("shop")}
          >
            <MenuIcon name="shop" />
            <span className={styles.tabLabel}>Boutique</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "inventory" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("inventory")}
          >
            <MenuIcon name="inventory" />
            <span className={styles.tabLabel}>Inventaire</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "bonus" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("bonus")}
          >
            <MenuIcon name="bonus" />
            <span className={styles.tabLabel}>Bonus</span>
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "friends" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("friends")}
          >
            <MenuIcon name="friends" />
            <span className={styles.tabLabel}>Amis</span>
            {pendingFriendRequestsCount > 0 ? <span className={styles.tabBadge}>{pendingFriendRequestsCount}</span> : null}
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "trades" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("trades")}
          >
            <MenuIcon name="trades" />
            <span className={styles.tabLabel}>Echanges</span>
            {pendingTradeOffersCount > 0 ? <span className={styles.tabBadge}>{pendingTradeOffersCount}</span> : null}
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "messages" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("messages")}
          >
            <MenuIcon name="messages" />
            <span className={styles.tabLabel}>Messages</span>
            {unreadMessagesCount > 0 ? <span className={styles.tabBadge}>{unreadMessagesCount}</span> : null}
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          <button
            className={activeSection === "activity" ? styles.activeTab : ""}
            type="button"
            onClick={() => selectMainSection("activity")}
          >
            <MenuIcon name="activity" />
            <span className={styles.tabLabel}>Activite</span>
            {activityBadgeCount > 0 ? <span className={styles.tabBadge}>{activityBadgeCount}</span> : null}
            <span className={styles.tabChevron} aria-hidden="true">›</span>
          </button>
          {isAdmin ? (
            <button
              className={activeSection === "admin" ? styles.activeTab : ""}
              type="button"
              onClick={() => selectMainSection("admin")}
            >
              <MenuIcon name="admin" />
              <span className={styles.tabLabel}>Admin</span>
              <span className={styles.tabChevron} aria-hidden="true">›</span>
            </button>
          ) : null}
        </nav>

        {activityBadgeCount > 0 && activeSection !== "activity" ? (
          <div className={styles.socialAlert} role="status">
            {pendingFriendRequestsCount > 0 ? `${pendingFriendRequestsCount} demande${pendingFriendRequestsCount > 1 ? "s" : ""} d'ami` : ""}
            {pendingFriendRequestsCount > 0 && (pendingTradeOffersCount > 0 || unreadMessagesCount > 0) ? ", " : ""}
            {pendingTradeOffersCount > 0 ? `${pendingTradeOffersCount} offre${pendingTradeOffersCount > 1 ? "s" : ""} d'echange` : ""}
            {pendingTradeOffersCount > 0 && unreadMessagesCount > 0 ? " et " : ""}
            {unreadMessagesCount > 0 ? `${unreadMessagesCount} message${unreadMessagesCount > 1 ? "s" : ""} non lu${unreadMessagesCount > 1 ? "s" : ""}` : ""}
            {" en attente."}
          </div>
        ) : null}

        {activeSection === "home" ? (
          <HomeDashboard
            activityCount={activityBadgeCount}
            balance={balance}
            currentUserId={accountUser?.uid ?? null}
            leaderboard={leaderboard}
            leaderboardMessage={leaderboardMessage}
            remainingAds={Math.max(0, DAILY_REWARDED_AD_LIMIT - normalizeRewardedAds(rewardedAds).watched)}
            onGoTo={(section) => setActiveSection(section)}
            onOpenProfile={handleOpenPlayerProfile}
            onSelectGame={selectGame}
            onSelectOnlineGame={selectOnlineGame}
          />
        ) : activeSection === "online" ? (
          <OnlineGames
            balance={balance}
            currentUser={accountUser}
            duelHistory={duelHistory}
            friendRequests={friendRequests}
            leaderboard={leaderboard}
            message={onlineMessage}
            mode={activeOnlineGame}
            actionRoomId={onlineActionRoomId}
            now={now}
            rooms={visibleOnlineRooms}
            onCreateRoom={handleCreateOnlineRoom}
            onAdvancePoker={handleAdvancePokerPhase}
            onAllInPoker={handleAllInPoker}
            onCallPoker={handleCallPoker}
            onCheckPoker={handleCheckPoker}
            onFoldPoker={handleFoldPoker}
            onForceClosePoker={handleForceClosePokerRoom}
            onJoinRoom={handleJoinOnlineRoom}
            onLeaveRoom={handleLeaveOnlineRoom}
            onOpenProfile={handleOpenPlayerProfile}
            onPlayDuelRound={handlePlayDuelRound}
            onPlayRussianRoulette={handlePlayRussianRouletteRoom}
            onRefreshRooms={refreshOnlineRooms}
            onRaisePoker={handleRaisePoker}
            onStartDuel={handleStartDuelRoom}
            onStartPoker={handleStartPokerRoom}
            onStartRussianRoulette={handleStartRussianRouletteRoom}
          />
        ) : activeSection === "missions" ? (
          <MissionsPanel
            balance={balance}
            missionState={activeMissionState}
            missions={activeMissions}
            resetCountdown={missionResetCountdown}
            stats={missionStats}
            onClaim={claimMission}
          />
        ) : activeSection === "cases" ? (
          <CaseOpeningGame
            balance={balance}
            priceOverrides={adminPriceOverrides}
            history={caseHistory}
            lastDrop={lastCaseDrop}
            message={caseMessage}
            modalPhase={caseModalPhase}
            modalTitle={caseModalTitle}
            modalVisible={caseModalVisible}
            opening={caseOpening}
            ownedSkinIds={ownedSkinIds}
            paused={paused}
            reelItems={caseReelItems}
            selectedCase={selectedCase}
            specialInventory={specialInventory}
            onCloseModal={() => setCaseModalVisible(false)}
            onMergeFragments={mergeKeyFragments}
            onOpen={handleOpenCase}
            onOpenSpecialChest={openOwnedSpecialChest}
            onSelectCase={setSelectedCase}
          />
        ) : activeSection === "shop" ? (
          <ShopGame
            balance={balance}
            equippedSkins={equippedSkins}
            message={shopMessage}
            ownedSkinIds={ownedSkinIds}
            priceOverrides={adminPriceOverrides}
            specialInventory={specialInventory}
            onAction={handleShopAction}
            onBuySpecialChest={buySpecialChest}
          />
        ) : activeSection === "inventory" ? (
          <InventoryGame equippedSkins={equippedSkins} ownedSkinIds={ownedSkinIds} specialInventory={specialInventory} onEquip={handleEquipSkin} />
        ) : activeSection === "bonus" ? (
          <RewardedAdsPanel
            balance={balance}
            message={rewardedAdMessage}
            rewardedAds={normalizeRewardedAds(rewardedAds)}
            watching={rewardedAdWatching}
            onWatch={handleRewardedAd}
          />
        ) : activeSection === "friends" ? (
          <FriendsGame
            currentUser={accountUser}
            friendRequests={friendRequests}
            leaderboard={leaderboard}
            message={friendsMessage}
            onAnswer={handleAnswerFriendRequest}
            onOpenProfile={handleOpenPlayerProfile}
          />
        ) : activeSection === "trades" ? (
          <TradesGame
            balance={balance}
            currentUser={accountUser}
            friendRequests={friendRequests}
            leaderboard={leaderboard}
            message={tradesMessage}
            ownedSkinIds={ownedSkinIds}
            specialInventory={specialInventory}
            trades={skinTrades}
            onAnswer={handleAnswerSkinTrade}
            onCounter={handleCounterSkinTrade}
            onCreate={handleCreateSkinTrade}
          />
        ) : activeSection === "messages" ? (
          <MessagesGame
            currentUser={accountUser}
            friendRequests={friendRequests}
            leaderboard={leaderboard}
            message={messagesMessage}
            messages={privateMessages}
            onMarkRead={handleMarkPrivateMessagesRead}
            onSend={handleSendPrivateMessage}
          />
        ) : activeSection === "activity" ? (
          <ActivityPanel currentUser={accountUser} items={activityItems} />
        ) : activeSection === "admin" ? (
          <AdminPanel
            currentUser={accountUser}
            isAdmin={isAdmin}
            lastResult={lastAdminResult}
            message={adminMessage}
            players={adminPlayers}
            priceOverrides={adminPriceOverrides}
            rooms={adminRooms}
            trades={adminTrades}
            onCommand={handleAdminCommand}
            onRefresh={refreshAdminData}
          />
        ) : activeGame === "slots" ? (
          <SlotGame
            bet={slotBet}
            currentReels={currentReels}
            history={slotHistory}
            message={slotMessage}
            paused={paused}
            spinning={slotSpinning}
            canSpin={slotBetAvailable}
            onBetChange={setSlotBet}
            onSpin={handleSlotSpin}
          />
        ) : activeGame === "blackjack" ? (
          <BlackjackGame
            activeBet={activeBlackjackBet}
            bet={blackjackBet}
            canDeal={blackjackBetAvailable}
            canDouble={canDouble}
            dealerHand={dealerHand}
            history={blackjackHistory}
            message={blackjackMessage}
            paused={paused}
            phase={blackjackPhase}
            playerHand={playerHand}
            cardBackSkin={equippedItems.cardBack}
            onBetChange={setBlackjackBet}
            onDeal={startBlackjackHand}
            onDouble={doubleBlackjack}
            onHit={hitBlackjack}
            onStand={standBlackjack}
          />
        ) : activeGame === "plinko" ? (
          <PlinkoGame
            animating={plinkoAnimating}
            ballSlots={plinkoBallSlots}
            bet={plinkoBet}
            canLaunch={plinkoBetAvailable}
            history={plinkoHistory}
            launches={activePlinkoLaunches}
            message={plinkoMessage}
            paused={paused}
            rows={plinkoRows}
            ballSkin={equippedItems.plinkoBall}
            layout={plinkoLayout}
            onBetChange={setPlinkoBet}
            onLaunch={launchPlinko}
            onResolve={finishPlinko}
          />
        ) : activeGame === "roulette" ? (
          <RouletteGame
            bet={rouletteBet}
            betKind={rouletteBetKind}
            canSpin={rouletteBetAvailable}
            chosenNumber={rouletteNumber}
            history={rouletteHistory}
            message={rouletteMessage}
            paused={paused}
            pendingResult={pendingRouletteResult}
            result={rouletteResult}
            runId={rouletteRunId}
            ballSkin={equippedItems.rouletteBall}
            spinning={rouletteSpinning}
            onBetChange={setRouletteBet}
            onBetKindChange={setRouletteBetKind}
            onNumberChange={setRouletteNumber}
            onSpin={spinRoulette}
          />
        ) : activeGame === "rocket" ? (
          <RocketGame
            animating={rocketAnimating}
            bet={rocketBet}
            canLaunch={rocketBetAvailable}
            flight={rocketFlight}
            history={rocketHistory}
            message={rocketMessage}
            paused={paused}
            shipSkin={equippedItems.rocketShip}
            target={rocketTarget}
            onBetChange={setRocketBet}
            onLaunch={launchRocket}
            onTargetChange={setRocketTarget}
          />
        ) : (
          <ClawGame
            balance={balance}
            history={clawHistory}
            message={clawMessage}
            paused={paused}
            specialInventory={specialInventory}
            onPlay={playClawMachine}
          />
        )}
      </section>
    </main>
  );
}

function getTradeItemName(id: string) {
  if (!id) {
    return "";
  }

  const specialItem = parseSpecialTradeItemId(id);
  if (specialItem) {
    const chest = getSpecialChestDefinition(specialItem.chestId);
    return specialItem.kind === "chest" ? chest.title : specialItem.kind === "key" ? chest.keyName : chest.fragmentName;
  }

  return SHOP_ITEMS.find((item) => item.id === id)?.name ?? id;
}

function getTradeAssetLabel(itemId: string, credits: number) {
  const parts = [];
  if (itemId) {
    parts.push(getTradeItemName(itemId));
  }
  if (credits > 0) {
    parts.push(`${credits.toLocaleString("fr-FR")} credits`);
  }
  return parts.join(" + ") || "rien";
}

function buildActivityItems(
  currentUserId: string,
  friendRequests: FriendRequestEntry[],
  skinTrades: SkinTradeEntry[],
  privateMessages: PrivateMessageEntry[],
  duelHistory: OnlineRoomEntry[],
  onlineRooms: OnlineRoomEntry[],
): ActivityItem[] {
  if (!currentUserId) {
    return [];
  }

  const friendItems = friendRequests
    .filter((request) => request.fromUid === currentUserId || request.toUid === currentUserId)
    .map<ActivityItem>((request) => {
      const isIncoming = request.toUid === currentUserId;
      const otherName = isIncoming ? request.fromDisplayName : request.toDisplayName;

      if (request.status === "accepted") {
        return {
          id: `friend-${request.id}-accepted`,
          kind: "friend",
          title: "Ami ajoute",
          detail: `${otherName} est maintenant dans ta liste d'amis.`,
          timestamp: request.respondedAt ?? request.createdAt,
        };
      }

      if (request.status === "rejected") {
        return {
          id: `friend-${request.id}-rejected`,
          kind: "friend",
          title: "Demande d'ami refusee",
          detail: `Demande avec ${otherName} refusee.`,
          timestamp: request.respondedAt ?? request.createdAt,
        };
      }

      return {
        id: `friend-${request.id}-pending`,
        kind: "friend",
        title: isIncoming ? "Nouvelle demande d'ami" : "Demande d'ami envoyee",
        detail: isIncoming ? `${otherName} veut t'ajouter en ami.` : `Tu as envoye une demande a ${otherName}.`,
        timestamp: request.createdAt,
      };
    });

  const tradeItems = skinTrades
    .filter((trade) => trade.fromUid === currentUserId || trade.toUid === currentUserId)
    .map<ActivityItem>((trade) => {
      const isIncoming = trade.toUid === currentUserId;
      const otherName = isIncoming ? trade.fromDisplayName : trade.toDisplayName;
      const offered = getTradeAssetLabel(trade.offeredItemId, trade.offeredCredits);
      const requested = getTradeAssetLabel(trade.requestedItemId, trade.requestedCredits);

      if (trade.status === "accepted") {
        return {
          id: `trade-${trade.id}-accepted`,
          kind: "trade",
          title: "Echange accepte",
          detail: `${otherName} | ${offered} contre ${requested}.`,
          timestamp: trade.respondedAt ?? trade.updatedAt ?? trade.createdAt,
        };
      }

      if (trade.status === "rejected") {
        return {
          id: `trade-${trade.id}-rejected`,
          kind: "trade",
          title: "Echange refuse",
          detail: `${otherName} | ${offered} contre ${requested}.`,
          timestamp: trade.respondedAt ?? trade.updatedAt ?? trade.createdAt,
        };
      }

      if (trade.status === "canceled") {
        return {
          id: `trade-${trade.id}-canceled`,
          kind: "trade",
          title: "Echange annule",
          detail: `${otherName} | ${offered} contre ${requested}.`,
          timestamp: trade.respondedAt ?? trade.updatedAt ?? trade.createdAt,
        };
      }

      return {
        id: `trade-${trade.id}-pending`,
        kind: "trade",
        title: isIncoming ? "Nouvelle offre d'echange" : "Offre d'echange envoyee",
        detail: isIncoming
          ? `${otherName} propose ${offered} contre ${requested}.`
          : `Tu proposes ${offered} contre ${requested} a ${otherName}.`,
        timestamp: trade.createdAt,
      };
    });

  const messageItems = privateMessages
    .filter((message) => message.fromUid === currentUserId || message.toUid === currentUserId)
    .map<ActivityItem>((message) => {
      const isIncoming = message.toUid === currentUserId;
      const otherName = isIncoming ? message.fromDisplayName : message.toDisplayName;

      return {
        id: `message-${message.id}`,
        kind: "message",
        title: isIncoming ? "Nouveau message" : "Message envoye",
        detail: `${otherName} : ${message.body}`,
        timestamp: message.createdAt,
      };
    });

  const duelItems = duelHistory
    .filter((room) => room.type === "duel" && room.status === "finished" && room.playerIds.includes(currentUserId))
    .map<ActivityItem>((room) => ({
      id: `duel-${room.id}-${room.pokerHandId}`,
      kind: "duel",
      title: room.winnerUid === currentUserId ? "Duel gagne" : "Duel termine",
      detail:
        room.winnerUid === currentUserId
          ? `Tu as gagne contre ${room.players.find((player) => player.uid !== currentUserId)?.displayName ?? "un joueur"}.`
          : `${room.winnerName || "Un joueur"} a gagne le duel ${room.game}.`,
      timestamp: room.updatedAt ?? room.createdAt,
    }));

  const pokerItems = onlineRooms
    .filter((room) => room.type === "poker" && room.status === "finished" && room.playerIds.includes(currentUserId))
    .map<ActivityItem>((room) => ({
      id: `poker-${room.id}-${room.pokerHandId}`,
      kind: "poker",
      title: room.pokerWinnerUids.includes(currentUserId) ? "Main de poker gagnee" : "Main de poker terminee",
      detail: room.pokerWinnerNames.length
        ? `Gagnant : ${room.pokerWinnerNames.join(", ")} avec ${room.pokerWinnerHandLabel || "une main gagnante"}.`
        : "La main de poker est terminee.",
      timestamp: room.updatedAt ?? room.createdAt,
    }));

  return [...friendItems, ...tradeItems, ...messageItems, ...duelItems, ...pokerItems]
    .sort((first, second) => getActivityMillis(second.timestamp) - getActivityMillis(first.timestamp))
    .slice(0, 40);
}

function ActivityPanel({ currentUser, items }: { currentUser: CasinoUser | null; items: ActivityItem[] }) {
  if (!currentUser) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Activite</h2>
            <p>Connecte-toi avec Google pour voir tes evenements recents.</p>
          </div>
        </div>
      </section>
    );
  }

  const unreadCount = items.filter((item) => item.kind === "friend" || item.kind === "trade").length;

  return (
    <section className={styles.machine}>
      <div className={styles.shopHeader}>
        <div>
          <h2>Journal d'activite</h2>
          <p>Les derniers evenements de ton compte et de tes interactions en ligne.</p>
        </div>
        <strong>{unreadCount} social</strong>
      </div>

      <div className={styles.activityList}>
        {items.length === 0 ? (
          <p className={styles.empty}>Aucune activite pour le moment.</p>
        ) : (
          items.map((item) => (
            <article className={`${styles.activityItem} ${styles[`activity-${item.kind}`]}`} key={item.id}>
              <span>{item.kind === "friend" ? "Ami" : item.kind === "trade" ? "Trade" : item.kind === "message" ? "Msg" : item.kind === "duel" ? "Duel" : "Poker"}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <time>{formatActivityTime(item.timestamp)}</time>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function normalizeAdminMentionText(value: string) {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function formatAdminMention(displayName: string) {
  return `@${displayName.trim().replace(/\s+/g, "_")}`;
}

function AdminPanel({
  currentUser,
  isAdmin,
  lastResult,
  message,
  players,
  priceOverrides,
  rooms,
  trades,
  onCommand,
  onRefresh,
}: {
  currentUser: CasinoUser | null;
  isAdmin: boolean;
  lastResult: AdminCommandResult | null;
  message: string;
  players: LeaderboardEntry[];
  priceOverrides: AdminPriceOverrides;
  rooms: OnlineRoomEntry[];
  trades: SkinTradeEntry[];
  onCommand: (command: string) => Promise<boolean>;
  onRefresh: () => void;
}) {
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const examples = [
    "/add money 500 @Lucas",
    "/remove money 100 @Daniel",
    "/set money 1000 @Yoann_H92",
    "/reset money @all",
    '/rename "Lucas" to "Lucas VIP"',
    "/add skin cards-aqua @Lucas",
    "/remove skin cards-aqua @Lucas",
    "/reset skins @Lucas",
    "/add key nebula 1 @Lucas",
    "/add fragments orbital 3 @Lucas",
    "/reset fragments @all",
    "/add chest royal 1 @Lucas",
    "/set price skin cards-aqua 500",
    "/set price case plinkoBall 150",
    "/set price chest nebula 1200",
    "/ban @Lucas",
    "/unban @Lucas",
    "/delete room ROOM_ID",
    "/finish room ROOM_ID",
  ];
  const mentionMatch = command.match(/@[^@]*$/);
  const mentionQuery = mentionMatch ? normalizeAdminMentionText(mentionMatch[0].replace(/^@+/, "").replace(/^,+/, "")) : "";
  const playerSuggestions = useMemo(() => {
    if (!mentionQuery) {
      return mentionMatch ? players.slice(0, 8) : [];
    }

    return players
      .filter((player) => {
        const name = normalizeAdminMentionText(player.displayName);
        const uid = player.uid.toLowerCase();
        return name.startsWith(mentionQuery) || uid.startsWith(mentionQuery);
      })
      .slice(0, 8);
  }, [mentionQuery, players]);

  async function submitCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!command.trim() || running) {
      return;
    }

    setRunning(true);
    const ok = await onCommand(command);
    setRunning(false);
    if (ok) {
      setCommand("");
    }
  }

  function selectPlayerSuggestion(player: LeaderboardEntry) {
    if (!mentionMatch) {
      return;
    }

    const start = mentionMatch.index ?? command.length;
    const mention = formatAdminMention(player.displayName);
    setCommand(`${command.slice(0, start)}${mention}`);
  }

  if (!currentUser || !isAdmin) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Admin</h2>
            <p>{message}</p>
          </div>
        </div>
        {currentUser ? (
          <div className={styles.rulesTable}>
            <div className={styles.ruleRow}>
              <span>UID utilise par le site</span>
              <strong>{currentUser.uid}</strong>
            </div>
            <div className={styles.ruleRow}>
              <span>Document attendu dans Firestore</span>
              <strong>admins/{currentUser.uid}</strong>
            </div>
            <div className={styles.ruleRow}>
              <span>Champ attendu</span>
              <strong>enabled = true</strong>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Console admin</h2>
            <p>{message}</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={onRefresh}>
            Actualiser
          </button>
        </div>
        <form className={styles.adminConsole} onSubmit={submitCommand}>
          <input
            type="text"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="/add money 500 @Ilyes_Benabdelkader"
            spellCheck={false}
          />
          <button className={styles.primaryButton} type="submit" disabled={running || !command.trim()}>
            Executer
          </button>
        </form>
        {playerSuggestions.length > 0 ? (
          <div className={styles.adminSuggestions}>
            {playerSuggestions.map((player) => (
              <button type="button" key={player.uid} onClick={() => selectPlayerSuggestion(player)}>
                {formatAdminMention(player.displayName)}
              </button>
            ))}
          </div>
        ) : null}
        {lastResult ? (
          <p className={lastResult.ok ? styles.adminSuccess : styles.adminError}>{lastResult.message}</p>
        ) : null}
        <div className={styles.adminExamples}>
          {examples.map((example) => (
            <button type="button" key={example} onClick={() => setCommand(example)}>
              {example}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Joueurs</h2>
          <ul className={styles.adminList}>
            {players.map((player) => (
              <li key={player.uid}>
                <strong>{player.displayName}</strong>
                <span>{player.balance.toLocaleString("fr-FR")} credits</span>
                <small>{player.banned ? "Banni" : player.uid}</small>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.panel}>
          <h2>Salons</h2>
          <ul className={styles.adminList}>
            {rooms.map((room) => (
              <li key={room.id}>
                <strong>{room.game}</strong>
                <span>{room.type} | {room.status}</span>
                <small>{room.id}</small>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Trades recents</h2>
          <ul className={styles.adminList}>
            {trades.map((trade) => (
              <li key={trade.id}>
                <strong>{trade.fromDisplayName} vers {trade.toDisplayName}</strong>
                <span>{trade.status}</span>
                <small>{getTradeAssetLabel(trade.offeredItemId, trade.offeredCredits)} contre {getTradeAssetLabel(trade.requestedItemId, trade.requestedCredits)}</small>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.panel}>
          <h2>Prix modifies</h2>
          <div className={styles.rulesTable}>
            {Object.entries(priceOverrides.skins).map(([id, price]) => <div className={styles.ruleRow} key={`skin-${id}`}><span>Skin {id}</span><strong>{price} credits</strong></div>)}
            {Object.entries(priceOverrides.cases).map(([id, price]) => <div className={styles.ruleRow} key={`case-${id}`}><span>Caisse {id}</span><strong>{price} credits</strong></div>)}
            {Object.entries(priceOverrides.chests).map(([id, price]) => <div className={styles.ruleRow} key={`chest-${id}`}><span>Coffre {id}</span><strong>{price} credits</strong></div>)}
            {Object.keys(priceOverrides.skins).length + Object.keys(priceOverrides.cases).length + Object.keys(priceOverrides.chests).length === 0 ? (
              <p className={styles.empty}>Aucun prix admin modifie.</p>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}

function MessagesGame({
  currentUser,
  friendRequests,
  leaderboard,
  message,
  messages,
  onMarkRead,
  onSend,
}: {
  currentUser: CasinoUser | null;
  friendRequests: FriendRequestEntry[];
  leaderboard: LeaderboardEntry[];
  message: string;
  messages: PrivateMessageEntry[];
  onMarkRead: (messages: PrivateMessageEntry[]) => void;
  onSend: (friend: { uid: string; displayName: string }, body: string) => Promise<boolean>;
}) {
  const currentUserId = currentUser?.uid ?? "";
  const [selectedFriendUid, setSelectedFriendUid] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const leaderboardById = new Map(leaderboard.map((entry) => [entry.uid, entry]));
  const friends = friendRequests
    .filter((request) => request.status === "accepted" && (request.fromUid === currentUserId || request.toUid === currentUserId))
    .reduce<Array<{ uid: string; displayName: string; profile?: LeaderboardEntry }>>((items, request) => {
      const isSender = request.fromUid === currentUserId;
      const uid = isSender ? request.toUid : request.fromUid;

      if (!items.some((item) => item.uid === uid)) {
        items.push({
          uid,
          displayName: isSender ? request.toDisplayName : request.fromDisplayName,
          profile: leaderboardById.get(uid),
        });
      }

      return items;
    }, []);
  const selectedFriend = friends.find((friend) => friend.uid === selectedFriendUid) ?? friends[0];
  const selectedConversation = selectedFriend
    ? messages.filter(
        (privateMessage) =>
          (privateMessage.fromUid === currentUserId && privateMessage.toUid === selectedFriend.uid) ||
          (privateMessage.fromUid === selectedFriend.uid && privateMessage.toUid === currentUserId),
      )
    : [];
  const unreadByFriend = friends.reduce<Record<string, number>>((counts, friend) => {
    counts[friend.uid] = messages.filter(
      (privateMessage) => privateMessage.fromUid === friend.uid && privateMessage.toUid === currentUserId && !privateMessage.readBy.includes(currentUserId),
    ).length;
    return counts;
  }, {});

  useEffect(() => {
    if (!currentUser || !selectedFriend) {
      return;
    }

    const unreadMessages = selectedConversation.filter(
      (privateMessage) => privateMessage.toUid === currentUser.uid && !privateMessage.readBy.includes(currentUser.uid),
    );

    if (unreadMessages.length > 0) {
      onMarkRead(unreadMessages);
    }
  }, [currentUser?.uid, selectedFriend?.uid, messages.length]);

  async function submitMessage() {
    const cleanMessage = normalizePrivateMessageBody(draftMessage);

    if (!selectedFriend || !cleanMessage) {
      return;
    }

    const sent = await onSend(selectedFriend, cleanMessage);
    if (sent) {
      setDraftMessage("");
      setSelectedFriendUid(selectedFriend.uid);
    }
  }

  if (!currentUser) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Messages</h2>
            <p>Connecte-toi avec Google pour discuter avec tes amis.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.machine}>
      <div className={styles.shopHeader}>
        <div>
          <h2>Messages</h2>
          <p>{message}</p>
        </div>
        <strong>{messages.length} message{messages.length > 1 ? "s" : ""}</strong>
      </div>

      {friends.length === 0 ? (
        <p className={styles.empty}>Ajoute un ami pour commencer une conversation.</p>
      ) : (
        <div className={styles.messagesLayout}>
          <aside className={styles.messagesFriends}>
            {friends.map((friend) => (
              <button
                className={(selectedFriend?.uid === friend.uid ? styles.activeMessageFriend : "")}
                key={friend.uid}
                type="button"
                onClick={() => setSelectedFriendUid(friend.uid)}
              >
                <span>{friend.displayName}</span>
                {unreadByFriend[friend.uid] > 0 ? <strong>{unreadByFriend[friend.uid]}</strong> : null}
              </button>
            ))}
          </aside>

          <div className={styles.messagesConversation}>
            <div className={styles.messagesThread}>
              {selectedConversation.length === 0 ? (
                <p className={styles.empty}>Aucun message avec {selectedFriend?.displayName}.</p>
              ) : (
                selectedConversation.map((privateMessage) => {
                  const isMine = privateMessage.fromUid === currentUserId;

                  return (
                    <article className={`${styles.messageBubble} ${isMine ? styles.messageMine : styles.messageTheirs}`} key={privateMessage.id}>
                      <strong>{isMine ? "Toi" : privateMessage.fromDisplayName}</strong>
                      <p>{privateMessage.body}</p>
                      <time>{formatActivityTime(privateMessage.createdAt)}</time>
                    </article>
                  );
                })
              )}
            </div>

            <div className={styles.messageComposer}>
              <input
                maxLength={280}
                placeholder={`Message pour ${selectedFriend?.displayName ?? "un ami"}`}
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitMessage();
                  }
                }}
              />
              <button className={styles.primaryButton} type="button" onClick={submitMessage} disabled={!draftMessage.trim()}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SlotGame({
  bet,
  currentReels,
  history,
  message,
  paused,
  spinning,
  canSpin,
  onBetChange,
  onSpin,
}: {
  bet: Bet;
  currentReels: readonly string[];
  history: SlotHistoryItem[];
  message: string;
  paused: boolean;
  spinning: boolean;
  canSpin: boolean;
  onBetChange: (bet: Bet) => void;
  onSpin: () => void;
}) {
  return (
    <>
      <section className={styles.machine}>
        <div className={styles.reels} aria-live="polite">
          {currentReels.map((symbol, index) => (
            <div className={`${styles.reel} ${spinning ? styles.reelSpinning : ""}`} key={`${symbol}-${index}`}>
              {symbol}
            </div>
          ))}
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.controls}>
          <label htmlFor="slotBet">Mise virtuelle</label>
          <BetAmountInput id="slotBet" value={bet} onChange={onBetChange} />
          <button className={styles.primaryButton} type="button" onClick={onSpin} disabled={paused || !canSpin || spinning}>
            Lancer
          </button>
        </div>

        {paused && (
          <div className={styles.pausePanel} role="status">
            Pause active. Les credits sont gratuits et sans valeur reelle.
          </div>
        )}
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Regles</h2>
          <p>
            Chaque rouleau utilise les 8 symboles avec la meme probabilite. Les resultats sont
            independants et ne promettent aucun gain reel.
          </p>
          <div className={styles.rulesTable}>
            {slotRules.map((rule) => (
              <div className={styles.ruleRow} key={rule.label}>
                <span>{rule.label}</span>
                <strong>{rule.reward}</strong>
                <small>{rule.probability}</small>
              </div>
            ))}
          </div>
        </article>

        <HistoryPanel title="Historique" empty="Aucun tour pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>{item.reels.join(" ")}</span>
              <small>
                mise {item.bet} | {item.net >= 0 ? "+" : ""}
                {item.net} | solde {item.balanceAfter}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function BetAmountInput({
  disabled = false,
  id,
  max,
  value,
  onChange,
}: {
  disabled?: boolean;
  id: string;
  max?: number;
  value: Bet;
  onChange: (bet: Bet) => void;
}) {
  return (
    <input
      id={id}
      max={max}
      min={MIN_BET}
      step="1"
      type="number"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(parseBetInput(event.target.value, max))}
    />
  );
}

function LeaderboardPanel({
  currentUserId,
  entries,
  message,
  onOpenProfile,
}: {
  currentUserId: string | null;
  entries: LeaderboardEntry[];
  message: string;
  onOpenProfile: (entry: LeaderboardEntry) => void;
}) {
  return (
    <section className={styles.leaderboardPanel} aria-label="Classement des joueurs">
      <div>
        <h2>Tableau des scores</h2>
        <p>{message}</p>
      </div>
      <ol className={styles.leaderboardList}>
        {entries.map((entry, index) => (
          <li className={entry.uid === currentUserId ? styles.currentLeaderboardPlayer : ""} key={entry.uid}>
            <button className={styles.leaderboardPlayerButton} type="button" onClick={() => onOpenProfile(entry)}>
              <span>{index + 1}</span>
              <ProfileAvatar avatarSeed={entry.uid} className={styles.leaderboardAvatar} displayName={entry.displayName} photoURL={entry.photoURL} />
              <strong>{entry.displayName}</strong>
              <em>{entry.balance.toLocaleString("fr-FR")} credits</em>
            </button>
          </li>
        ))}
      </ol>
      {entries.length === 0 && <p className={styles.empty}>Connecte-toi avec Google pour entrer dans le classement.</p>}
    </section>
  );
}

function FriendsGame({
  currentUser,
  friendRequests,
  leaderboard,
  message,
  onAnswer,
  onOpenProfile,
}: {
  currentUser: CasinoUser | null;
  friendRequests: FriendRequestEntry[];
  leaderboard: LeaderboardEntry[];
  message: string;
  onAnswer: (request: FriendRequestEntry, status: "accepted" | "rejected") => void;
  onOpenProfile: (entry: LeaderboardEntry) => void;
}) {
  const currentUserId = currentUser?.uid ?? "";
  const acceptedRequests = friendRequests.filter(
    (request) => request.status === "accepted" && (request.fromUid === currentUserId || request.toUid === currentUserId),
  );
  const leaderboardById = new Map(leaderboard.map((entry) => [entry.uid, entry]));

  function getOtherUid(request: FriendRequestEntry) {
    return request.fromUid === currentUserId ? request.toUid : request.fromUid;
  }

  const acceptedFriendIds = new Set(acceptedRequests.map(getOtherUid));
  const incoming = friendRequests.filter(
    (request) => request.status === "pending" && request.toUid === currentUserId && !acceptedFriendIds.has(request.fromUid),
  );
  const outgoing = friendRequests.filter(
    (request) => request.status === "pending" && request.fromUid === currentUserId && !acceptedFriendIds.has(request.toUid),
  );
  const friends = Array.from(
    acceptedRequests
      .reduce((uniqueFriends, request) => {
        const friendUid = getOtherUid(request);
        if (!uniqueFriends.has(friendUid)) {
          uniqueFriends.set(friendUid, request);
        }
        return uniqueFriends;
      }, new Map<string, FriendRequestEntry>())
      .values(),
  );

  function getOtherPlayer(request: FriendRequestEntry) {
    const isSender = request.fromUid === currentUserId;
    const uid = getOtherUid(request);
    const displayName = isSender ? request.toDisplayName : request.fromDisplayName;
    return { uid, displayName, profile: leaderboardById.get(uid) };
  }

  if (!currentUser) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Amis</h2>
            <p>Connecte-toi avec Google pour voir tes demandes et ta liste d'amis.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Amis</h2>
            <p>{message}</p>
          </div>
          <strong>
            {friends.length} ami{friends.length > 1 ? "s" : ""}
          </strong>
        </div>
      </section>

      <div className={styles.socialSections}>
        <section className={styles.panel}>
          <div className={styles.socialSectionHeader}>
            <h2>Demandes recues</h2>
            <span>{incoming.length}</span>
          </div>
          <div className={styles.socialList}>
            {incoming.length === 0 ? (
              <p className={styles.empty}>Aucune demande recue.</p>
            ) : (
              incoming.map((request) => {
                const player = getOtherPlayer(request);

                return (
                  <article className={styles.socialItem} key={request.id}>
                    <div>
                      <strong>{player.displayName}</strong>
                      <small>veut t'ajouter en ami</small>
                    </div>
                    <div className={styles.socialActions}>
                      {player.profile && (
                        <button className={styles.secondaryButton} type="button" onClick={() => onOpenProfile(player.profile!)}>
                          Profil
                        </button>
                      )}
                      <button className={styles.primaryButton} type="button" onClick={() => onAnswer(request, "accepted")}>
                        Accepter
                      </button>
                      <button className={styles.secondaryButton} type="button" onClick={() => onAnswer(request, "rejected")}>
                        Refuser
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.socialSectionHeader}>
            <h2>Demandes envoyees</h2>
            <span>{outgoing.length}</span>
          </div>
          <div className={styles.socialList}>
            {outgoing.length === 0 ? (
              <p className={styles.empty}>Aucune demande envoyee.</p>
            ) : (
              outgoing.map((request) => {
                const player = getOtherPlayer(request);

                return (
                  <article className={styles.socialItem} key={request.id}>
                    <div>
                      <strong>{player.displayName}</strong>
                      <small>en attente de reponse</small>
                    </div>
                    {player.profile && (
                      <button className={styles.secondaryButton} type="button" onClick={() => onOpenProfile(player.profile!)}>
                        Profil
                      </button>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.socialSectionHeader}>
            <h2>Mes amis</h2>
            <span>{friends.length}</span>
          </div>
          <div className={styles.socialList}>
            {friends.length === 0 ? (
              <p className={styles.empty}>Aucun ami ajoute pour le moment.</p>
            ) : (
              friends.map((request) => {
                const player = getOtherPlayer(request);

                return (
                  <article className={styles.socialItem} key={request.id}>
                    <div>
                      <strong>{player.displayName}</strong>
                      <small>Ami ajoute</small>
                    </div>
                    {player.profile ? (
                      <button className={styles.primaryButton} type="button" onClick={() => onOpenProfile(player.profile!)}>
                        Voir profil
                      </button>
                    ) : (
                      <small>Profil public pas encore disponible</small>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function TradesGame({
  balance,
  currentUser,
  friendRequests,
  leaderboard,
  message,
  ownedSkinIds,
  specialInventory,
  trades,
  onAnswer,
  onCounter,
  onCreate,
}: {
  balance: number;
  currentUser: CasinoUser | null;
  friendRequests: FriendRequestEntry[];
  leaderboard: LeaderboardEntry[];
  message: string;
  ownedSkinIds: string[];
  specialInventory: SpecialInventory;
  trades: SkinTradeEntry[];
  onAnswer: (trade: SkinTradeEntry, status: "accepted" | "rejected" | "canceled") => Promise<boolean>;
  onCounter: (
    originalTrade: SkinTradeEntry,
    friend: { uid: string; displayName: string },
    offeredItemId: string,
    requestedItemId: string,
    offeredCredits: number,
    requestedCredits: number,
  ) => Promise<boolean>;
  onCreate: (
    friend: { uid: string; displayName: string },
    offeredItemId: string,
    requestedItemId: string,
    offeredCredits: number,
    requestedCredits: number,
  ) => Promise<boolean>;
}) {
  const currentUserId = currentUser?.uid ?? "";
  const [friendUid, setFriendUid] = useState("");
  const [offeredItemId, setOfferedItemId] = useState("");
  const [requestedItemId, setRequestedItemId] = useState("");
  const [offeredCreditsText, setOfferedCreditsText] = useState("0");
  const [requestedCreditsText, setRequestedCreditsText] = useState("0");
  const [counterTradeId, setCounterTradeId] = useState("");
  const leaderboardById = new Map(leaderboard.map((entry) => [entry.uid, entry]));
  const ownedCounts = countOwnedSkins(ownedSkinIds);
  const ownItems = [
    ...sortSkinsByRarity(SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0)).map((item) => ({
      id: item.id,
      name: item.name,
      count: ownedCounts[item.id],
    })),
    ...buildSpecialTradeOptions(specialInventory),
  ];
  const friends = friendRequests
    .filter((request) => request.status === "accepted" && (request.fromUid === currentUserId || request.toUid === currentUserId))
    .reduce<Array<{ uid: string; displayName: string; profile?: LeaderboardEntry }>>((items, request) => {
      const isSender = request.fromUid === currentUserId;
      const uid = isSender ? request.toUid : request.fromUid;

      if (!items.some((item) => item.uid === uid)) {
        items.push({
          uid,
          displayName: isSender ? request.toDisplayName : request.fromDisplayName,
          profile: leaderboardById.get(uid),
        });
      }

      return items;
    }, []);
  const incoming = trades.filter((trade) => trade.status === "pending" && trade.toUid === currentUserId);
  const outgoing = trades.filter((trade) => trade.status === "pending" && trade.fromUid === currentUserId);
  const history = trades.filter((trade) => trade.status !== "pending").slice(0, 8);
  const counterTrade = incoming.find((trade) => trade.id === counterTradeId);
  const selectedFriend =
    friends.find((friend) => friend.uid === friendUid) ??
    (counterTrade && counterTrade.fromUid === friendUid
      ? {
          uid: counterTrade.fromUid,
          displayName: counterTrade.fromDisplayName,
          profile: leaderboardById.get(counterTrade.fromUid),
        }
      : undefined);
  const friendInventory = selectedFriend?.profile?.inventory ?? [];
  const friendSkinItems = friendInventory
    .map((entry) => SHOP_ITEMS.find((item) => item.id === entry.id))
    .filter((item): item is ShopItem => Boolean(item));
  const friendItems = [
    ...friendSkinItems.map((item) => ({ id: item.id, name: item.name, count: friendInventory.find((entry) => entry.id === item.id)?.count ?? 1 })),
    ...buildSpecialTradeOptions(sanitizeSpecialInventory(selectedFriend?.profile?.specialInventory)),
  ];
  const offeredCredits = normalizeTradeCredits(offeredCreditsText);
  const requestedCredits = normalizeTradeCredits(requestedCreditsText);

  function tradeItemName(id: string) {
    return id ? getTradeItemName(id) : "Aucun objet";
  }

  function tradeCreditsLabel(credits: number) {
    return `${credits.toLocaleString("fr-FR")} credits`;
  }

  function tradeAssetLabel(itemId: string, credits: number) {
    const parts = [];
    if (itemId) {
      parts.push(tradeItemName(itemId));
    }
    if (credits > 0) {
      parts.push(tradeCreditsLabel(credits));
    }
    return parts.join(" + ") || "Rien";
  }

  function tradeItem(id: string) {
    return SHOP_ITEMS.find((item) => item.id === id);
  }

  function tradeSpecialItem(id: string) {
    const parsed = parseSpecialTradeItemId(id);
    if (!parsed) {
      return null;
    }

    const chest = getSpecialChestDefinition(parsed.chestId);
    return {
      ...parsed,
      chest,
      name: parsed.kind === "chest" ? chest.title : parsed.kind === "key" ? chest.keyName : chest.fragmentName,
      detail: parsed.kind === "chest" ? "Coffre special" : parsed.kind === "key" ? "Cle de coffre" : "Fragment de cle",
      icon: parsed.kind === "chest" ? "▣" : parsed.kind === "key" ? "◇" : "◆",
    };
  }

  function tradeStatusLabel(status: SkinTradeEntry["status"]) {
    if (status === "accepted") {
      return "Accepte";
    }

    if (status === "rejected") {
      return "Refuse";
    }

    if (status === "canceled") {
      return "Annule";
    }

    return "En attente";
  }

  function TradeSkinPreview({ id, label }: { id: string; label: string }) {
    const item = tradeItem(id);
    const specialItem = tradeSpecialItem(id);

    return (
      <div className={styles.tradeSkinPreview}>
        <span>{label}</span>
        <div className={styles.inventoryPreview}>
          {item ? <SkinPreview item={item} /> : specialItem ? <SpecialResourcePreview icon={specialItem.icon} theme={specialItem.chest.theme} /> : <strong>?</strong>}
        </div>
        <strong>{item?.name ?? specialItem?.name ?? id}</strong>
        <small>{item?.rarity ?? specialItem?.detail ?? "Objet"}</small>
      </div>
    );
  }

  function TradeCreditsPreview({ credits, label }: { credits: number; label: string }) {
    if (credits <= 0) {
      return null;
    }

    return (
      <div className={styles.tradeCreditPreview}>
        <span>{label}</span>
        <strong>{tradeCreditsLabel(credits)}</strong>
        <small>Credits virtuels</small>
      </div>
    );
  }

  function startCounterOffer(trade: SkinTradeEntry) {
    setCounterTradeId(trade.id);
    setFriendUid(trade.fromUid);
    setOfferedItemId(trade.requestedItemId && hasTradeItemCopy(ownedSkinIds, specialInventory, trade.requestedItemId) ? trade.requestedItemId : "");
    setRequestedItemId(trade.offeredItemId);
    setOfferedCreditsText(trade.requestedCredits > 0 ? String(trade.requestedCredits) : "0");
    setRequestedCreditsText(trade.offeredCredits > 0 ? String(trade.offeredCredits) : "0");
  }

  function clearCounterOffer() {
    setCounterTradeId("");
  }

  async function submitTradeOffer() {
    if (!selectedFriend) {
      return;
    }

    const created = counterTrade
      ? await onCounter(counterTrade, selectedFriend, offeredItemId, requestedItemId, offeredCredits, requestedCredits)
      : await onCreate(selectedFriend, offeredItemId, requestedItemId, offeredCredits, requestedCredits);

    if (created) {
      setOfferedItemId("");
      setRequestedItemId("");
      setOfferedCreditsText("0");
      setRequestedCreditsText("0");
      clearCounterOffer();
    }
  }

  if (!currentUser) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Echanges</h2>
            <p>Connecte-toi avec Google pour echanger des skins avec tes amis.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.socialSections}>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Echanges</h2>
            <p>{message}</p>
          </div>
          <strong>{trades.length} echange{trades.length > 1 ? "s" : ""}</strong>
        </div>
        <div className={styles.tradeForm}>
          <label>
            Ami
            <select
              value={friendUid}
              onChange={(event) => {
                setFriendUid(event.target.value);
                clearCounterOffer();
              }}
            >
              <option value="">Choisir un ami</option>
              {friends.map((friend) => (
                <option key={friend.uid} value={friend.uid}>
                  {friend.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tu donnes
            <select value={offeredItemId} onChange={(event) => setOfferedItemId(event.target.value)}>
              <option value="">Aucun objet</option>
              {ownItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} x{item.count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credits donnes
            <input
              type="number"
              min="0"
              max={balance}
              step="1"
              value={offeredCreditsText}
              onChange={(event) => setOfferedCreditsText(event.target.value)}
            />
          </label>
          <label>
            Tu demandes
            <select value={requestedItemId} onChange={(event) => setRequestedItemId(event.target.value)} disabled={!selectedFriend}>
              <option value="">Aucun objet</option>
              {friendItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} x{item.count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credits demandes
            <input
              type="number"
              min="0"
              step="1"
              value={requestedCreditsText}
              onChange={(event) => setRequestedCreditsText(event.target.value)}
            />
          </label>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={submitTradeOffer}
            disabled={
              !selectedFriend ||
              offeredCredits > balance ||
              (!offeredItemId && offeredCredits <= 0) ||
              (!requestedItemId && requestedCredits <= 0)
            }
          >
            {counterTrade ? "Envoyer la contre-offre" : "Envoyer l'offre"}
          </button>
        </div>
        {counterTrade ? (
          <div className={styles.tradeCounterBanner}>
            <span>
              Contre-offre pour {counterTrade.fromDisplayName} : l'offre recue sera refusee automatiquement si la nouvelle offre part bien.
            </span>
            <button className={styles.secondaryButton} type="button" onClick={clearCounterOffer}>
              Annuler la contre-offre
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.panel}>
        <div className={styles.socialSectionHeader}>
          <h2>Offres recues</h2>
          <span>{incoming.length}</span>
        </div>
        <div className={styles.socialList}>
          {incoming.length === 0 ? (
            <p className={styles.empty}>Aucune offre recue.</p>
          ) : (
            incoming.map((trade) => (
              <article className={styles.socialItem} key={trade.id}>
                <div className={styles.tradeCardBody}>
                  <div>
                    <strong>{trade.fromDisplayName}</strong>
                    <small>Te propose un echange.</small>
                  </div>
                  <div className={styles.tradeSummary}>
                    {trade.offeredItemId ? <TradeSkinPreview id={trade.offeredItemId} label="Tu recois" /> : null}
                    <TradeCreditsPreview credits={trade.offeredCredits} label="Tu recois" />
                    {trade.requestedItemId ? <TradeSkinPreview id={trade.requestedItemId} label="Tu donnes" /> : null}
                    <TradeCreditsPreview credits={trade.requestedCredits} label="Tu donnes" />
                  </div>
                  {trade.requestedItemId && !hasTradeItemCopy(ownedSkinIds, specialInventory, trade.requestedItemId) ? (
                    <small className={styles.tradeWarning}>Tu ne possedes plus l'objet demande.</small>
                  ) : null}
                  {trade.requestedCredits > balance ? <small className={styles.tradeWarning}>Tu n'as pas assez de credits.</small> : null}
                </div>
                <div className={styles.socialActions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => onAnswer(trade, "accepted")}
                    disabled={(trade.requestedItemId ? !hasTradeItemCopy(ownedSkinIds, specialInventory, trade.requestedItemId) : false) || trade.requestedCredits > balance}
                  >
                    Accepter
                  </button>
                  <button className={styles.secondaryButton} type="button" onClick={() => onAnswer(trade, "rejected")}>
                    Refuser
                  </button>
                  <button className={styles.secondaryButton} type="button" onClick={() => startCounterOffer(trade)}>
                    Contre-offre
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.socialSectionHeader}>
          <h2>Offres envoyees</h2>
          <span>{outgoing.length}</span>
        </div>
        <div className={styles.socialList}>
          {outgoing.length === 0 ? (
            <p className={styles.empty}>Aucune offre envoyee.</p>
          ) : (
            outgoing.map((trade) => (
              <article className={styles.socialItem} key={trade.id}>
                <div className={styles.tradeCardBody}>
                  <div>
                    <strong>{trade.toDisplayName}</strong>
                    <small>Offre en attente. Ton objet est reserve.</small>
                  </div>
                  <div className={styles.tradeSummary}>
                    {trade.offeredItemId ? <TradeSkinPreview id={trade.offeredItemId} label="Tu donnes" /> : null}
                    <TradeCreditsPreview credits={trade.offeredCredits} label="Tu donnes" />
                    {trade.requestedItemId ? <TradeSkinPreview id={trade.requestedItemId} label="Tu demandes" /> : null}
                    <TradeCreditsPreview credits={trade.requestedCredits} label="Tu demandes" />
                  </div>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={() => onAnswer(trade, "canceled")}>
                  Annuler
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <HistoryPanel title="Historique des echanges" empty="Aucun echange termine.">
        {history.map((trade) => (
          <li key={trade.id}>
            <span>{tradeStatusLabel(trade.status)}</span>
            <small>
              {trade.fromDisplayName} propose {tradeAssetLabel(trade.offeredItemId, trade.offeredCredits)} contre{" "}
              {tradeAssetLabel(trade.requestedItemId, trade.requestedCredits)}
            </small>
          </li>
        ))}
      </HistoryPanel>
    </div>
  );
}

function OnlineGames({
  actionRoomId,
  balance,
  currentUser,
  duelHistory,
  friendRequests,
  leaderboard,
  message,
  mode,
  now,
  rooms,
  onAdvancePoker,
  onAllInPoker,
  onCallPoker,
  onCheckPoker,
  onCreateRoom,
  onFoldPoker,
  onForceClosePoker,
  onJoinRoom,
  onLeaveRoom,
  onOpenProfile,
  onPlayDuelRound,
  onPlayRussianRoulette,
  onRefreshRooms,
  onRaisePoker,
  onStartDuel,
  onStartPoker,
  onStartRussianRoulette,
}: {
  actionRoomId: string | null;
  balance: number;
  currentUser: CasinoUser | null;
  duelHistory: OnlineRoomEntry[];
  friendRequests: FriendRequestEntry[];
  leaderboard: LeaderboardEntry[];
  message: string;
  mode: OnlineRoomType;
  now: number;
  rooms: OnlineRoomEntry[];
  onAdvancePoker: (room: OnlineRoomEntry) => void;
  onAllInPoker: (room: OnlineRoomEntry) => void;
  onCallPoker: (room: OnlineRoomEntry) => void;
  onCheckPoker: (room: OnlineRoomEntry) => void;
  onCreateRoom: (type: OnlineRoomType, game: string, invitedPlayer?: OnlineRoomPlayer, options?: { russianBet?: number }) => void;
  onFoldPoker: (room: OnlineRoomEntry) => void;
  onForceClosePoker: (room: OnlineRoomEntry) => void;
  onJoinRoom: (room: OnlineRoomEntry) => void;
  onLeaveRoom: (room: OnlineRoomEntry) => void;
  onOpenProfile: (entry: LeaderboardEntry) => void;
  onPlayDuelRound: (room: OnlineRoomEntry, roundScore?: number) => void;
  onPlayRussianRoulette: (room: OnlineRoomEntry) => void;
  onRefreshRooms: () => void;
  onRaisePoker: (room: OnlineRoomEntry, targetBet: number) => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
  onStartPoker: (room: OnlineRoomEntry) => void;
  onStartRussianRoulette: (room: OnlineRoomEntry) => void;
}) {
  const [russianBetText, setRussianBetText] = useState("25");
  const currentUserId = currentUser?.uid ?? "";
  const leaderboardById = new Map(leaderboard.map((entry) => [entry.uid, entry]));
  const friends = friendRequests
    .filter((request) => request.status === "accepted" && (request.fromUid === currentUserId || request.toUid === currentUserId))
    .reduce<Array<{ uid: string; displayName: string; profile?: LeaderboardEntry }>>((items, request) => {
      const isSender = request.fromUid === currentUserId;
      const uid = isSender ? request.toUid : request.fromUid;

      if (items.some((item) => item.uid === uid)) {
        return items;
      }

      items.push({
        uid,
        displayName: isSender ? request.toDisplayName : request.fromDisplayName,
        profile: leaderboardById.get(uid),
      });
      return items;
    }, []);
  const visibleFriends = friends.slice(0, 9);
  const visibleRooms = rooms.filter(
    (room) =>
      room.type === mode &&
      (!room.invitedUid || room.hostUid === currentUserId || room.invitedUid === currentUserId || room.players.some((player) => player.uid === currentUserId)),
  );

  if (!currentUser) {
    return (
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Jeux en ligne</h2>
            <p>Connecte-toi avec Google pour creer des duels et rejoindre une table en ligne.</p>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "duel") {
    return (
      <>
        <section className={styles.machine}>
          <div className={styles.shopHeader}>
            <div>
              <h2>Duel entre amis</h2>
              <p>Choisis un ami, un mini-jeu, puis lance un duel en manches virtuelles.</p>
            </div>
            <strong>{friends.length} ami{friends.length > 1 ? "s" : ""} disponible{friends.length > 1 ? "s" : ""}</strong>
          </div>

          <div className={styles.onlineDuelGrid}>
            {["Plinko", "Rocket Games", "Roulette"].map((gameName, index) => (
              <article className={styles.onlineModeCard} key={gameName}>
                <span>Mode {index + 1}</span>
                <h3>Duel {gameName}</h3>
                <p>3 manches chacun. Le meilleur bilan virtuel gagne le duel.</p>
                <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("duel", `Duel ${gameName}`)}>
                  Creer un duel
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.socialSectionHeader}>
            <h2>Inviter un ami</h2>
            <span>{friends.length}</span>
          </div>
          <div className={styles.socialList}>
            {friends.length === 0 ? (
              <p className={styles.empty}>Ajoute un ami avant de lancer un duel.</p>
            ) : (
              friends.map((friend) => (
                <article className={styles.socialItem} key={friend.uid}>
                  <div>
                    <strong>{friend.displayName}</strong>
                    <small>{friend.profile ? `${friend.profile.balance.toLocaleString("fr-FR")} credits` : "Profil public pas encore disponible"}</small>
                  </div>
                  <div className={styles.socialActions}>
                    {friend.profile && (
                      <button className={styles.secondaryButton} type="button" onClick={() => onOpenProfile(friend.profile!)}>
                        Profil
                      </button>
                    )}
                    <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("duel", `Duel Plinko avec ${friend.displayName}`, friend)}>
                      Plinko
                    </button>
                    <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("duel", `Duel Roulette avec ${friend.displayName}`, friend)}>
                      Roulette
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <OnlineRoomsPanel
          balance={balance}
          currentUserId={currentUser.uid}
          message={message}
          rooms={visibleRooms}
          onJoinRoom={onJoinRoom}
          onLeaveRoom={onLeaveRoom}
        onPlayDuelRound={onPlayDuelRound}
        onPlayRussianRoulette={onPlayRussianRoulette}
        onRefreshRooms={onRefreshRooms}
        onStartDuel={onStartDuel}
        onStartRussianRoulette={onStartRussianRoulette}
        onAdvancePoker={onAdvancePoker}
        onAllInPoker={onAllInPoker}
        onCallPoker={onCallPoker}
        onCheckPoker={onCheckPoker}
        onFoldPoker={onFoldPoker}
        onForceClosePoker={onForceClosePoker}
        onRaisePoker={onRaisePoker}
        onStartPoker={onStartPoker}
        actionRoomId={actionRoomId}
        now={now}
      />
        <DuelHistoryPanel currentUserId={currentUser.uid} history={duelHistory} />
      </>
    );
  }

  if (mode === "russian-roulette") {
    const russianBet = Math.max(25, Math.floor(Number(russianBetText) || 25));

    return (
      <>
        <section className={styles.machine}>
          <div className={styles.shopHeader}>
            <div>
              <h2>Roulette russe</h2>
              <p>Le createur choisit la mise. A chaque round, les survivants repaient. Le dernier survivant gagne tout le pot.</p>
            </div>
            <strong>Jusqu'a 6 joueurs</strong>
          </div>

          <div className={styles.onlineDuelGrid}>
            <article className={styles.onlineModeCard}>
              <span>Mise de depart</span>
              <h3>{russianBet.toLocaleString("fr-FR")} credits</h3>
              <p>Minimum 25 credits. Chaque tour coute cette mise au joueur qui tente sa chance.</p>
              <input
                className={styles.betInput}
                type="number"
                min={25}
                step={25}
                value={russianBetText}
                onChange={(event) => setRussianBetText(event.target.value)}
              />
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => onCreateRoom("russian-roulette", "Roulette russe", undefined, { russianBet })}
              >
                Creer une roulette russe
              </button>
            </article>
          </div>
        </section>

        <OnlineRoomsPanel
          balance={balance}
          currentUserId={currentUser.uid}
          message={message}
          rooms={visibleRooms}
          onJoinRoom={onJoinRoom}
          onLeaveRoom={onLeaveRoom}
          onPlayDuelRound={onPlayDuelRound}
          onPlayRussianRoulette={onPlayRussianRoulette}
          onRefreshRooms={onRefreshRooms}
          onStartDuel={onStartDuel}
          onStartRussianRoulette={onStartRussianRoulette}
          onAdvancePoker={onAdvancePoker}
          onAllInPoker={onAllInPoker}
          onCallPoker={onCallPoker}
          onCheckPoker={onCheckPoker}
          onFoldPoker={onFoldPoker}
          onForceClosePoker={onForceClosePoker}
          onRaisePoker={onRaisePoker}
          onStartPoker={onStartPoker}
          actionRoomId={actionRoomId}
          now={now}
        />
      </>
    );
  }

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Partie en ligne</h2>
            <p>Table de poker fictive pour jouer entre comptes connectes.</p>
          </div>
          <strong>Texas Hold'em</strong>
        </div>

        <div className={styles.pokerTable} aria-label="Table de poker en ligne">
          <div className={styles.pokerSeats}>
            <span>{currentUser.displayName || "Toi"}</span>
            {visibleFriends.map((friend) => (
              <span key={friend.uid}>{friend.displayName}</span>
            ))}
            {Array.from({ length: Math.max(0, 9 - visibleFriends.length) }).map((_, index) => (
              <span key={`empty-${index}`}>Place libre</span>
            ))}
          </div>
          <div className={styles.pokerBoard}>
            <strong>Pot virtuel : 0 credit</strong>
            <div className={styles.pokerCards} aria-hidden="true">
              <span>A</span>
              <span>K</span>
              <span>Q</span>
              <span>J</span>
              <span>10</span>
            </div>
          </div>
          <div className={styles.pokerActions}>
            <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("poker", "Table poker")}>
              Creer une table
            </button>
            <button className={styles.secondaryButton} type="button" onClick={onRefreshRooms}>
              Actualiser les tables
            </button>
          </div>
        </div>
      </section>

      <OnlineRoomsPanel
        balance={balance}
        currentUserId={currentUser.uid}
        message={message}
        rooms={visibleRooms}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        onPlayDuelRound={onPlayDuelRound}
        onPlayRussianRoulette={onPlayRussianRoulette}
        onRefreshRooms={onRefreshRooms}
        onStartDuel={onStartDuel}
        onStartRussianRoulette={onStartRussianRoulette}
        onAdvancePoker={onAdvancePoker}
        onAllInPoker={onAllInPoker}
        onCallPoker={onCallPoker}
        onCheckPoker={onCheckPoker}
        onFoldPoker={onFoldPoker}
        onForceClosePoker={onForceClosePoker}
        onRaisePoker={onRaisePoker}
        onStartPoker={onStartPoker}
        actionRoomId={actionRoomId}
        now={now}
      />

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Duel</h2>
          <p>Le duel sera le mode le plus simple a rendre vraiment jouable en ligne : invitation, manches, score total, gagnant.</p>
        </article>
        <article className={styles.panel}>
          <h2>Poker</h2>
          <p>La table est prete visuellement. La prochaine etape sera de sauvegarder les salons dans Firebase pour que plusieurs joueurs rejoignent la meme partie.</p>
        </article>
      </section>
    </>
  );
}

function OnlineRoomsPanel({
  actionRoomId,
  balance,
  currentUserId,
  message,
  now,
  rooms,
  onAdvancePoker,
  onAllInPoker,
  onCallPoker,
  onCheckPoker,
  onFoldPoker,
  onForceClosePoker,
  onJoinRoom,
  onLeaveRoom,
  onPlayDuelRound,
  onPlayRussianRoulette,
  onRaisePoker,
  onRefreshRooms,
  onStartDuel,
  onStartPoker,
  onStartRussianRoulette,
}: {
  actionRoomId: string | null;
  balance: number;
  currentUserId: string;
  message: string;
  now: number;
  rooms: OnlineRoomEntry[];
  onAdvancePoker: (room: OnlineRoomEntry) => void;
  onAllInPoker: (room: OnlineRoomEntry) => void;
  onCallPoker: (room: OnlineRoomEntry) => void;
  onCheckPoker: (room: OnlineRoomEntry) => void;
  onFoldPoker: (room: OnlineRoomEntry) => void;
  onForceClosePoker: (room: OnlineRoomEntry) => void;
  onJoinRoom: (room: OnlineRoomEntry) => void;
  onLeaveRoom: (room: OnlineRoomEntry) => void;
  onPlayDuelRound: (room: OnlineRoomEntry, roundScore?: number) => void;
  onPlayRussianRoulette: (room: OnlineRoomEntry) => void;
  onRaisePoker: (room: OnlineRoomEntry, targetBet: number) => void;
  onRefreshRooms: () => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
  onStartPoker: (room: OnlineRoomEntry) => void;
  onStartRussianRoulette: (room: OnlineRoomEntry) => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.socialSectionHeader}>
        <div>
          <h2>Salons ouverts</h2>
          <p>{message}</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={onRefreshRooms}>
          Actualiser
        </button>
      </div>

      <div className={styles.onlineRoomList}>
        {rooms.length === 0 ? (
          <p className={styles.empty}>Aucun salon ouvert dans ce mode.</p>
        ) : (
          rooms.map((room) => {
            const alreadyJoined = room.players.some((player) => player.uid === currentUserId);
            const full = room.players.length >= room.maxPlayers;
            const busy = actionRoomId === room.id;
            const invitedLabel = room.invitedName ? ` | Invite : ${room.invitedName}` : "";
            const countdownLabel = formatWaitingRoomCountdown(room, now);

            return (
              <article className={styles.onlineRoomCard} key={room.id}>
                <div>
                  <span>{room.type === "poker" ? "Table poker" : room.type === "russian-roulette" ? "Roulette russe" : "Duel"}</span>
                  <h3>{room.game}</h3>
                  <p>
                    Hote : {room.hostName}
                    {invitedLabel} | {room.status === "waiting" ? "En attente" : room.status === "playing" ? "En cours" : "Termine"}
                  </p>
                  {countdownLabel && <small className={styles.roomCountdown}>{countdownLabel}</small>}
                </div>
                <div className={styles.onlineRoomPlayers}>
                  {room.players.map((player) => (
                    <span key={player.uid}>{player.displayName}</span>
                  ))}
                  {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, index) => (
                    <span key={`open-${room.id}-${index}`}>Place libre</span>
                  ))}
                </div>
                <button
                  className={alreadyJoined ? styles.secondaryButton : styles.primaryButton}
                  type="button"
                  onClick={() => (alreadyJoined ? onLeaveRoom(room) : onJoinRoom(room))}
                  disabled={busy || room.status !== "waiting" || (!alreadyJoined && full)}
                >
                  {busy ? "..." : room.status !== "waiting" ? "Partie lancee" : alreadyJoined ? "Quitter" : full ? "Complet" : "Rejoindre"}
                </button>
                {room.type === "duel" && (
                  <DuelRoomPanel busy={busy} currentUserId={currentUserId} room={room} onPlayRound={onPlayDuelRound} onStartDuel={onStartDuel} />
                )}
                {room.type === "poker" && (
                  <PokerRoomPanel
                    busy={busy}
                    currentUserId={currentUserId}
                    playerBalance={balance}
                    room={room}
                    onAdvance={onAdvancePoker}
                    onAllIn={onAllInPoker}
                    onCall={onCallPoker}
                    onCheck={onCheckPoker}
                    onFold={onFoldPoker}
                    onForceClose={onForceClosePoker}
                    onRaise={onRaisePoker}
                    onStart={onStartPoker}
                  />
                )}
                {room.type === "russian-roulette" && (
                  <RussianRouletteRoomPanel
                    balance={balance}
                    busy={busy}
                    currentUserId={currentUserId}
                    room={room}
                    onPlay={onPlayRussianRoulette}
                    onStart={onStartRussianRoulette}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function RussianRouletteRoomPanel({
  balance,
  busy,
  currentUserId,
  room,
  onPlay,
  onStart,
}: {
  balance: number;
  busy: boolean;
  currentUserId: string;
  room: OnlineRoomEntry;
  onPlay: (room: OnlineRoomEntry) => void;
  onStart: (room: OnlineRoomEntry) => void;
}) {
  const bet = Math.max(25, Math.floor(room.russianBet || 25));
  const isHost = room.hostUid === currentUserId;
  const isPlayer = room.players.some((player) => player.uid === currentUserId);
  const isAlive = room.russianAliveUids.includes(currentUserId);
  const isTurn = room.russianTurnUid === currentUserId;
  const canStart = room.status === "waiting" && isHost && room.players.length >= 2;
  const canPlay = room.status === "playing" && isPlayer && isAlive && isTurn && balance >= bet;
  const recentShots = room.russianShots.slice(-6).reverse();
  const lastShot = room.russianShots.at(-1);
  const shotState = lastShot ? (lastShot.survived ? "safe" : "danger") : room.status === "playing" ? "armed" : "idle";
  const chamberIndex = room.russianShots.length % 6;
  const statusText =
    room.status === "waiting"
      ? room.players.length < 2
        ? "En attente d'autres joueurs."
        : isHost
          ? "Tu peux lancer la partie."
          : "En attente du lancement par l'hote."
      : room.status === "playing"
        ? isTurn
          ? "A toi de payer la mise et tenter ta chance."
          : `Tour de ${room.russianTurnName || "un joueur"}.`
        : `${room.winnerName || "Un joueur"} gagne le pot.`;

  return (
    <div className={styles.duelRoomPanel}>
      <p className={styles.duelStatus}>{statusText}</p>
      <div className={styles.russianScene} data-state={shotState} key={`${lastShot?.uid ?? "start"}-${lastShot?.round ?? 0}-${lastShot?.survived ?? "none"}`}>
        <div className={styles.russianRevolverWrap}>
          <svg className={styles.russianRevolver} viewBox="0 0 320 170" aria-hidden="true">
            <defs>
              <linearGradient id={`barrel-${room.id}`} x1="0" x2="1">
                <stop offset="0%" stopColor="#6b4a1f" />
                <stop offset="20%" stopColor="#f7d46b" />
                <stop offset="50%" stopColor="#8f6a30" />
                <stop offset="78%" stopColor="#fff0af" />
                <stop offset="100%" stopColor="#5b411e" />
              </linearGradient>
              <linearGradient id={`steel-${room.id}`} x1="0" x2="1">
                <stop offset="0%" stopColor="#171b22" />
                <stop offset="18%" stopColor="#5e6673" />
                <stop offset="42%" stopColor="#d7d2bb" />
                <stop offset="68%" stopColor="#3e4652" />
                <stop offset="100%" stopColor="#101319" />
              </linearGradient>
              <linearGradient id={`wood-${room.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6a3518" />
                <stop offset="52%" stopColor="#2d160d" />
                <stop offset="100%" stopColor="#8d4b1f" />
              </linearGradient>
            </defs>
            <ellipse className={styles.revolverShadow} cx="157" cy="139" rx="118" ry="14" />
            <path className={styles.revolverFlash} d="M282 58 315 45 301 69 319 87 288 83 276 108 272 79 245 67 274 60Z" />
            <path className={styles.revolverBarrelUnder} d="M170 82h105c13 0 23 9 23 21v2H165Z" />
            <path className={styles.revolverBarrel} d="M164 47h107c14 0 25 11 25 25s-11 25-25 25H164Z" fill={`url(#barrel-${room.id})`} />
            <path className={styles.revolverBarrelLine} d="M174 58h90M174 86h96" />
            <path className={styles.revolverMuzzle} d="M272 54h12c9 0 16 8 16 18s-7 18-16 18h-12Z" />
            <path className={styles.revolverHammer} d="M72 37c-11-7-19-11-28-10 6 8 16 16 29 21Z" />
            <path className={styles.revolverFrame} d="M55 57c10-31 50-48 86-31 18 9 31 25 34 44l16 7-18 20c-6 16-21 28-40 33-31 8-66-6-80-31-8-14-8-28 2-42Z" fill={`url(#steel-${room.id})`} />
            <path className={styles.revolverFrameCut} d="M133 93c18-3 30-14 32-29 9 12 8 29-3 42-9 11-23 17-40 17 7-8 11-18 11-30Z" />
            <circle className={styles.revolverCylinder} cx="105" cy="67" r="39" />
            <circle className={styles.revolverCylinderInner} cx="105" cy="67" r="28" />
            {Array.from({ length: 6 }).map((_, index) => {
              const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
              const cx = 105 + Math.cos(angle) * 21;
              const cy = 67 + Math.sin(angle) * 21;
              return <circle key={index} className={index === chamberIndex ? styles.revolverChamberActive : styles.revolverChamber} cx={cx} cy={cy} r="7.5" />;
            })}
            <circle className={styles.revolverCenter} cx="105" cy="67" r="9" />
            <path className={styles.revolverGripBack} d="M99 103h57c-1 30-16 52-40 62-15-18-25-39-17-62Z" />
            <path className={styles.revolverGrip} d="M106 105h42c-2 20-12 37-29 47-9-13-16-29-13-47Z" fill={`url(#wood-${room.id})`} />
            <path className={styles.revolverWoodLine} d="M116 111c2 12 8 24 18 34M134 108c-2 15-8 27-18 38" />
            <path className={styles.revolverTriggerGuard} d="M159 91c28 8 26 43 1 51-17-9-18-33-1-51Z" />
            <path className={styles.revolverTrigger} d="M170 102c11 8 9 24-2 31" />
            <path className={styles.revolverSight} d="M238 41h22M246 37v8" />
            <circle className={styles.revolverScrew} cx="71" cy="84" r="4" />
            <circle className={styles.revolverScrew} cx="136" cy="44" r="3.5" />
          </svg>
        </div>
        <div className={styles.russianSceneInfo}>
          <span>{room.status === "playing" ? `Tour de ${room.russianTurnName || "un joueur"}` : room.status === "finished" ? "Partie terminee" : "En attente"}</span>
          <strong>
            {lastShot
              ? lastShot.survived
                ? `${lastShot.displayName} survit`
                : `${lastShot.displayName} est elimine`
              : "Le barillet est pret"}
          </strong>
          <small>
            {room.status === "playing"
              ? `${room.russianAliveUids.length}/${room.players.length} survivants`
              : room.status === "finished"
                ? `Pot final : ${room.russianPot.toLocaleString("fr-FR")} credits`
                : "L'hote lance la partie quand au moins 2 joueurs sont presents."}
          </small>
        </div>
      </div>
      <div className={styles.pokerPotRow}>
        <span>Mise par round</span>
        <strong>{bet.toLocaleString("fr-FR")} credits</strong>
        <span>Pot</span>
        <strong>{room.russianPot.toLocaleString("fr-FR")} credits</strong>
        <span>Round</span>
        <strong>{Math.max(1, room.russianRound)}</strong>
      </div>

      <div className={styles.duelScoreGrid}>
        {room.players.map((player) => {
          const eliminated = room.russianEliminatedUids.includes(player.uid);
          const alive = room.status === "waiting" || room.russianAliveUids.includes(player.uid);
          const paidThisRound = room.russianPaidRound[player.uid] === room.russianRound;

          return (
            <div className={styles.duelScoreCard} key={player.uid}>
              <strong>{player.displayName}</strong>
              <span>{eliminated ? "Elimine" : alive ? "En vie" : "En attente"}</span>
              <small>{room.russianTurnUid === player.uid ? "Tour actuel" : paidThisRound ? "Mise payee" : room.status === "playing" ? "Doit payer" : "Pret"}</small>
            </div>
          );
        })}
      </div>

      {recentShots.length > 0 && (
        <div className={styles.duelScoreCard}>
          <strong>Derniers tours</strong>
          {recentShots.map((shot, index) => (
            <small key={`${shot.uid}-${shot.round}-${index}`}>
              Round {shot.round} : {shot.displayName} paie {shot.amount.toLocaleString("fr-FR")} credits et {shot.survived ? "survit" : "est elimine"}.
            </small>
          ))}
        </div>
      )}

      <div className={styles.socialActions}>
        {room.status === "waiting" ? (
          <button className={styles.primaryButton} type="button" onClick={() => onStart(room)} disabled={busy || !canStart}>
            Lancer la partie
          </button>
        ) : room.status === "playing" ? (
          <button className={styles.primaryButton} type="button" onClick={() => onPlay(room)} disabled={busy || !canPlay}>
            {busy ? "..." : balance < bet && isTurn ? "Solde insuffisant" : "Payer et jouer"}
          </button>
        ) : (
          <strong>Gagnant : {room.winnerName || "inconnu"}</strong>
        )}
      </div>
    </div>
  );
}

function DuelRoomPanel({
  busy,
  currentUserId,
  room,
  onPlayRound,
  onStartDuel,
}: {
  busy: boolean;
  currentUserId: string;
  room: OnlineRoomEntry;
  onPlayRound: (room: OnlineRoomEntry, roundScore?: number) => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
}) {
  const currentPlayerScore = room.duelScores[currentUserId] ?? { rounds: [], total: 0 };
  const duelGameKind = getDuelGameKind(room.game);
  const [duelRouletteBet, setDuelRouletteBet] = useState<Bet>(25);
  const [duelRouletteKind, setDuelRouletteKind] = useState<RouletteBetKind>("red");
  const [duelRouletteNumber, setDuelRouletteNumber] = useState(17);
  const [duelRoundPreview, setDuelRoundPreview] = useState("");
  const canStart = room.status === "waiting" && room.hostUid === currentUserId && room.players.length >= 2;
  const canPlay = room.status === "playing" && room.players.some((player) => player.uid === currentUserId) && currentPlayerScore.rounds.length < 3;
  const opponent = room.players.find((player) => player.uid !== currentUserId);
  const opponentScore = opponent ? room.duelScores[opponent.uid] ?? { rounds: [], total: 0 } : null;
  const statusText =
    room.status === "waiting"
      ? room.players.length < 2
        ? room.invitedName
          ? `En attente de ${room.invitedName}.`
          : "En attente du joueur 2."
        : room.hostUid === currentUserId
          ? "Deux joueurs sont prets, tu peux lancer."
          : "En attente du lancement par l'hote."
      : room.status === "playing"
        ? canPlay
          ? "A toi de jouer."
          : `Tu as joue ${currentPlayerScore.rounds.length}/3 manches.`
        : `Duel termine.`;
  function playRealDuelRound() {
    if (duelGameKind === "plinko") {
      const launches = Array.from({ length: DUEL_PLINKO_BALLS_PER_ROUND }, () => {
        const path = generatePlinkoPath(10);
        const slot = getFinalSlot(path);
        const multiplier = getPlinkoMultiplier(slot, 10);
        return calculatePlinkoPayout(DUEL_PLINKO_BET_PER_BALL, multiplier).payout;
      });
      const score = Math.round(launches.reduce((sum, payout) => sum + payout, 0));
      setDuelRoundPreview(`15 billes lancees : ${score.toLocaleString("fr-FR")} points.`);
      onPlayRound(room, score);
      return;
    }

    if (duelGameKind === "roulette") {
      const outcome = playRoulette(
        { kind: duelRouletteKind, number: duelRouletteKind === "straight" ? duelRouletteNumber : undefined },
        duelRouletteBet,
      );
      const score = Math.round(outcome.payout);
      setDuelRoundPreview(`${outcome.number} ${formatRouletteColor(outcome.color)} : ${score.toLocaleString("fr-FR")} points.`);
      onPlayRound(room, score);
      return;
    }

    setDuelRoundPreview("Manche rapide jouee.");
    onPlayRound(room);
  }

  return (
    <div className={styles.duelRoomPanel}>
      <p className={styles.duelStatus}>{statusText}</p>
      <div className={styles.duelScoreGrid}>
        {room.players.map((player) => {
          const score = room.duelScores[player.uid] ?? { rounds: [], total: 0 };

          return (
            <div className={styles.duelScoreCard} key={player.uid}>
              <strong>{player.displayName}</strong>
              <span>{score.total >= 0 ? "+" : ""}{score.total} credits</span>
              <small>
                Manches : {score.rounds.length ? score.rounds.map((round) => `${round >= 0 ? "+" : ""}${round}`).join(" / ") : "aucune"}
              </small>
            </div>
          );
        })}
      </div>

      {room.status === "finished" ? (
        <p className={styles.duelWinner}>Gagnant : {room.winnerName || "egalite"}</p>
      ) : (
        <div className={styles.socialActions}>
          {opponentScore && <small>L'adversaire a joue {opponentScore.rounds.length}/3 manches.</small>}
          {room.status === "playing" && duelGameKind === "plinko" && (
            <small>Duel Plinko : {DUEL_PLINKO_BALLS_PER_ROUND} billes par manche, {DUEL_PLINKO_BET_PER_BALL} credits par bille.</small>
          )}
          {room.status === "playing" && duelGameKind === "roulette" && (
            <div className={styles.duelInlineControls}>
              <label htmlFor={`duel-roulette-bet-${room.id}`}>Mise</label>
              <BetAmountInput id={`duel-roulette-bet-${room.id}`} value={duelRouletteBet} onChange={setDuelRouletteBet} />
              <label htmlFor={`duel-roulette-kind-${room.id}`}>Pari</label>
              <select id={`duel-roulette-kind-${room.id}`} value={duelRouletteKind} onChange={(event) => setDuelRouletteKind(event.target.value as RouletteBetKind)}>
                {rouletteBetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {duelRouletteKind === "straight" && (
                <>
                  <label htmlFor={`duel-roulette-number-${room.id}`}>Numero</label>
                  <input
                    id={`duel-roulette-number-${room.id}`}
                    type="number"
                    min={0}
                    max={36}
                    value={duelRouletteNumber}
                    onChange={(event) => setDuelRouletteNumber(Math.max(0, Math.min(36, Number(event.target.value))))}
                  />
                </>
              )}
            </div>
          )}
          {duelRoundPreview && <small>{duelRoundPreview}</small>}
          <button className={styles.primaryButton} type="button" onClick={() => onStartDuel(room)} disabled={busy || !canStart}>
            Lancer le duel
          </button>
          <button className={styles.primaryButton} type="button" onClick={playRealDuelRound} disabled={busy || !canPlay}>
            {duelGameKind === "plinko" ? "Lancer les 15 billes" : duelGameKind === "roulette" ? "Lancer la roulette" : "Jouer une manche"}
          </button>
        </div>
      )}
    </div>
  );
}

function DuelHistoryPanel({ currentUserId, history }: { currentUserId: string; history: OnlineRoomEntry[] }) {
  const wins = history.filter((room) => room.winnerUid === currentUserId).length;
  const losses = history.filter((room) => room.winnerUid && room.winnerUid !== currentUserId).length;
  const ratio = losses === 0 ? wins : wins / losses;

  return (
    <section className={styles.panel}>
      <div className={styles.socialSectionHeader}>
        <div>
          <h2>Historique des duels</h2>
          <p>
            {wins} victoire{wins > 1 ? "s" : ""}, {losses} defaite{losses > 1 ? "s" : ""}, ratio {ratio.toFixed(2)}
          </p>
        </div>
        <span>{history.length}</span>
      </div>

      <div className={styles.socialList}>
        {history.length === 0 ? (
          <p className={styles.empty}>Aucun duel termine pour le moment.</p>
        ) : (
          history.slice(0, 8).map((room) => {
            const playerScore = room.duelScores[currentUserId] ?? { rounds: [], total: 0 };
            const opponent = room.players.find((player) => player.uid !== currentUserId);
            const opponentScore = opponent ? room.duelScores[opponent.uid] ?? { rounds: [], total: 0 } : { rounds: [], total: 0 };
            const won = room.winnerUid === currentUserId;

            return (
              <article className={styles.socialItem} key={room.id}>
                <div>
                  <strong>{room.game}</strong>
                  <small>
                    {won ? "Victoire" : "Defaite"} contre {opponent?.displayName ?? "adversaire"} | {playerScore.total} - {opponentScore.total}
                  </small>
                </div>
                <span className={won ? styles.positive : styles.negative}>{won ? "Gagne" : "Perdu"}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function PokerRoomPanel({
  busy,
  currentUserId,
  playerBalance,
  room,
  onAdvance,
  onAllIn,
  onCall,
  onCheck,
  onFold,
  onForceClose,
  onRaise,
  onStart,
}: {
  busy: boolean;
  currentUserId: string;
  playerBalance: number;
  room: OnlineRoomEntry;
  onAdvance: (room: OnlineRoomEntry) => void;
  onAllIn: (room: OnlineRoomEntry) => void;
  onCall: (room: OnlineRoomEntry) => void;
  onCheck: (room: OnlineRoomEntry) => void;
  onFold: (room: OnlineRoomEntry) => void;
  onForceClose: (room: OnlineRoomEntry) => void;
  onRaise: (room: OnlineRoomEntry, targetBet: number) => void;
  onStart: (room: OnlineRoomEntry) => void;
}) {
  const currentHand = room.pokerHands[currentUserId] ?? [];
  const isHost = room.hostUid === currentUserId;
  const inRoom = room.players.some((player) => player.uid === currentUserId);
  const folded = room.foldedPlayerIds.includes(currentUserId);
  const minimumRaiseTarget = Math.max(25, room.pokerCurrentBet + 1);
  const [raiseInput, setRaiseInput] = useState(String(minimumRaiseTarget));
  const raiseTarget = Math.floor(Number(raiseInput));

  useEffect(() => {
    setRaiseInput((currentValue) => {
      const parsedValue = Number(currentValue);
      return Number.isFinite(parsedValue) && parsedValue >= minimumRaiseTarget ? currentValue : String(minimumRaiseTarget);
    });
  }, [minimumRaiseTarget]);

  const canStart = (room.status === "waiting" || room.status === "finished") && isHost && room.players.length >= 2;
  const activePlayers = room.players.filter((player) => !room.foldedPlayerIds.includes(player.uid));
  const phaseDone =
    room.status === "playing" &&
    activePlayers.every((player) => {
      const action = room.pokerActions[player.uid];
      return (action === "checked" || action === "called" || action === "raised" || action === "folded" || action === "all-in") && (room.pokerContributions[player.uid] ?? 0) >= room.pokerCurrentBet;
    });
  const isTurn = room.pokerTurnUid === currentUserId;
  const currentContribution = room.pokerContributions[currentUserId] ?? 0;
  const amountToCall = Math.max(0, room.pokerCurrentBet - currentContribution);
  const canAdvance = room.status === "playing" && isHost && phaseDone;
  const canCheck = room.status === "playing" && inRoom && !folded && isTurn && amountToCall === 0;
  const canCall = room.status === "playing" && inRoom && !folded && isTurn && amountToCall > 0 && playerBalance >= amountToCall;
  const canAllIn = room.status === "playing" && inRoom && !folded && isTurn && amountToCall > 0 && playerBalance > 0 && playerBalance < amountToCall;
  const canFold = room.status === "playing" && inRoom && !folded && isTurn;
  const canRaise = room.status === "playing" && inRoom && !folded && isTurn && Number.isFinite(raiseTarget) && raiseTarget >= minimumRaiseTarget;
  const canRemoveTable = inRoom && (room.status === "playing" || room.status === "finished");
  const winnerNames = room.pokerWinnerNames.length ? room.pokerWinnerNames : room.pokerWinnerName ? [room.pokerWinnerName] : [];
  const winnerSummary = winnerNames.length > 1 ? `Egalite : ${winnerNames.join(", ")}` : `Gagnant : ${winnerNames[0] || "a determiner"}`;
  const phaseLabel =
    room.status === "waiting"
      ? room.players.length < 2
        ? "En attente d'un joueur."
        : "Table prete a lancer."
      : room.status === "finished"
        ? `${winnerSummary}${room.pokerWinnerHandLabel ? ` avec ${room.pokerWinnerHandLabel}` : ""}`
        : phaseDone
          ? `Phase ${room.pokerPhase} terminee.`
          : isTurn && amountToCall > playerBalance && playerBalance > 0
            ? `Tu n'as pas assez pour suivre ${amountToCall} credits : fais tapis avec ${playerBalance} credits ou couche-toi.`
          : isTurn && amountToCall > 0
            ? `A toi de jouer : tu dois suivre ${amountToCall} credits, relancer, ou te coucher.`
          : `Tour de ${room.pokerTurnName || "joueur"}.`;

  return (
    <div className={styles.pokerRoomPanel}>
      <p className={styles.duelStatus}>{phaseLabel}</p>
      <div className={styles.pokerPotRow}>
        <span>Pot virtuel</span>
        <strong>{room.pokerPot.toLocaleString("fr-FR")} credits</strong>
        <span>Mise actuelle</span>
        <strong>{room.pokerCurrentBet.toLocaleString("fr-FR")} credits</strong>
      </div>
      <div className={styles.pokerTableView}>
        <div className={styles.pokerTableCenter}>
          <span>Pot</span>
          <strong>{room.pokerPot.toLocaleString("fr-FR")}</strong>
          <small>{room.pokerPhase}</small>
        </div>
        <div className={styles.pokerBalanceBadge}>
          <span>Solde</span>
          <strong>{playerBalance.toLocaleString("fr-FR")}</strong>
          <small>credits</small>
        </div>
        <div className={styles.pokerCommunity}>
          <strong>Tes cartes</strong>
          <div className={styles.pokerMiniCards}>
            {currentHand.length ? currentHand.map((card) => <span key={card}>{card}</span>) : <span>?</span>}
          </div>
        </div>
        <div className={styles.pokerCommunity}>
          <strong>Cartes communes</strong>
          <div className={styles.pokerMiniCards}>
            {room.communityCards.length ? room.communityCards.map((card) => <span key={card}>{card}</span>) : <span>Vide</span>}
          </div>
        </div>
      </div>
      {room.status === "finished" && room.pokerWinnerHandLabel && (
        <div className={styles.pokerWinnerBox}>
          <strong>
            {winnerNames.length > 1 ? `${winnerNames.join(", ")} se partagent le pot avec ${room.pokerWinnerHandLabel}` : `${room.pokerWinnerName || "Le gagnant"} gagne avec ${room.pokerWinnerHandLabel}`}
          </strong>
          {room.pokerWinnerHandCards.length > 0 && (
            <div className={styles.pokerMiniCards}>
              {room.pokerWinnerHandCards.map((card) => (
                <span key={`winner-${room.id}-${card}`}>{card}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {room.status === "finished" && (
        <div className={styles.pokerShowdownGrid}>
          {room.players.map((player) => {
            const savedResult = room.pokerShowdownResults.find((result) => result.uid === player.uid);
            const foldedPlayer = room.foldedPlayerIds.includes(player.uid) || savedResult?.folded;
            const handCards = room.pokerHands[player.uid] ?? [];
            const evaluated = !foldedPlayer ? evaluatePokerHand([...handCards, ...room.communityCards]) : null;
            const isWinner = savedResult?.isWinner || room.pokerWinnerUids.includes(player.uid) || room.pokerWinnerUid === player.uid;
            const handLabel = savedResult?.handLabel || (foldedPlayer ? "Couche" : evaluated?.label ?? "");
            const bestCards = savedResult?.handCards?.length ? savedResult.handCards : evaluated?.cards ?? [];

            return (
              <article className={isWinner ? styles.pokerShowdownWinner : styles.pokerShowdownCard} key={`showdown-${room.id}-${player.uid}`}>
                <div>
                  <strong>{player.displayName}</strong>
                  <span>{handLabel}</span>
                </div>
                <div className={styles.pokerMiniCards}>
                  {handCards.length ? handCards.map((card) => <span key={`${player.uid}-hand-${card}`}>{card}</span>) : <span>?</span>}
                </div>
                {!foldedPlayer && bestCards.length > 0 && (
                  <small>Meilleure main : {bestCards.join(" ")}</small>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className={styles.onlineRoomPlayers}>
        {room.players.map((player) => {
          const action = room.pokerActions[player.uid];
          const actionLabel = room.foldedPlayerIds.includes(player.uid)
            ? "couche"
            : action === "checked"
              ? "check"
              : action === "called"
                ? "suivi"
                : action === "raised"
                  ? "relance"
                  : action === "all-in"
                    ? "tapis"
                    : room.pokerTurnUid === player.uid
                      ? "joue"
                      : "attend";
          const contribution = room.pokerContributions[player.uid] ?? 0;

          return (
            <span key={player.uid}>
              {player.displayName} | {actionLabel} | {contribution.toLocaleString("fr-FR")}
            </span>
          );
        })}
      </div>
      <div className={styles.socialActions}>
        <button className={styles.primaryButton} type="button" onClick={() => onStart(room)} disabled={busy || !canStart}>
          {room.status === "finished" ? "Nouvelle main" : "Lancer la partie"}
        </button>
        <button className={styles.primaryButton} type="button" onClick={() => onCheck(room)} disabled={busy || !canCheck}>
          Check
        </button>
        <button className={styles.primaryButton} type="button" onClick={() => onCall(room)} disabled={busy || !canCall}>
          Suivre{amountToCall > 0 ? ` ${amountToCall}` : ""}
        </button>
        <button className={styles.primaryButton} type="button" onClick={() => onAllIn(room)} disabled={busy || !canAllIn}>
          Tapis{canAllIn ? ` ${playerBalance}` : ""}
        </button>
        <label className={styles.visuallyHidden} htmlFor={`poker-raise-${room.id}`}>
          Montant de la mise
        </label>
        <input
          className={styles.pokerRaiseInput}
          id={`poker-raise-${room.id}`}
          min={minimumRaiseTarget}
          step="1"
          type="number"
          value={raiseInput}
          onChange={(event) => setRaiseInput(event.target.value)}
          disabled={busy || !inRoom || folded || room.status !== "playing"}
        />
        <button className={styles.primaryButton} type="button" onClick={() => onRaise(room, raiseTarget)} disabled={busy || !canRaise}>
          Relancer
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onFold(room)} disabled={busy || !canFold}>
          Se coucher
        </button>
        <button className={styles.primaryButton} type="button" onClick={() => onAdvance(room)} disabled={busy || !canAdvance}>
          Suivant
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onForceClose(room)} disabled={busy || !canRemoveTable}>
          Retirer la table
        </button>
      </div>
    </div>
  );
}

function PlayerProfileModal({
  currentUserId,
  duelStats,
  editMessage,
  friendRequestMessage,
  isFriend,
  isLeaderboardLeader,
  isPlayerAdmin,
  player,
  onClose,
  onSaveProfile,
  onSendFriendRequest,
}: {
  currentUserId: string | null;
  duelStats: DuelStats | null;
  editMessage: string;
  friendRequestMessage: string;
  isFriend: boolean;
  isLeaderboardLeader: boolean;
  isPlayerAdmin: boolean;
  player: LeaderboardEntry;
  onClose: () => void;
  onSaveProfile: (displayName: string, photoURL: string) => void;
  onSendFriendRequest: () => void;
}) {
  const [draftDisplayName, setDraftDisplayName] = useState(player.displayName);
  const [draftPhotoURL, setDraftPhotoURL] = useState(player.photoURL?.startsWith("casino-avatar:") ? player.photoURL : "");
  useEffect(() => {
    setDraftDisplayName(player.displayName);
    setDraftPhotoURL(player.photoURL?.startsWith("casino-avatar:") ? player.photoURL : "");
  }, [player.displayName, player.photoURL]);

  const inventory = player.inventory
    .map((inventoryItem) => {
      const item = SHOP_ITEMS.find((candidate) => candidate.id === inventoryItem.id);
      return item ? { item, count: inventoryItem.count } : null;
    })
    .filter((item): item is { item: ShopItem; count: number } => item !== null);
  const groupedInventory = (Object.keys(DEFAULT_EQUIPPED_SKINS) as SkinCategory[]).map((category) => ({
    category,
    items: inventory.filter(({ item }) => item.category === category),
  }));
  const profileSpecialInventory = sanitizeSpecialInventory(player.specialInventory);
  const profileSpecialItems = SPECIAL_CHESTS.flatMap((chest) => [
    {
      id: specialTradeItemId("chest", chest.id),
      title: chest.title,
      detail: "Coffre special",
      count: profileSpecialInventory.chests[chest.id],
      theme: chest.theme,
      icon: "▣",
    },
    {
      id: specialTradeItemId("key", chest.id),
      title: chest.keyName,
      detail: "Cle de coffre",
      count: profileSpecialInventory.keys[chest.id],
      theme: chest.theme,
      icon: "◇",
    },
    {
      id: specialTradeItemId("fragment", chest.id),
      title: chest.fragmentName,
      detail: "Fragment de cle",
      count: profileSpecialInventory.fragments[chest.id],
      theme: chest.theme,
      icon: "◆",
    },
  ]).filter((item) => item.count > 0);
  const isCurrentUser = player.uid === currentUserId;
  const avatarChoices = [
    { id: "auto", label: "Auto", photoURL: "" },
    ...CASINO_AVATAR_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.shortLabel,
      photoURL: casinoAvatarToken(preset.id),
    })),
  ];

  return (
    <div className={styles.profileModalBackdrop} role="dialog" aria-modal="true" aria-label={`Profil de ${player.displayName}`}>
      <section className={styles.profileModal}>
        <header className={styles.profileModalHeader}>
          <span className={styles.profileAvatarFrame}>
            {isLeaderboardLeader ? (
              <span className={styles.profileRankBadge} aria-label="Premier du classement">
                <svg viewBox="0 0 32 22" aria-hidden="true">
                  <path d="M4 20 L7 7 L13 14 L16 3 L19 14 L25 7 L28 20 Z" />
                  <path d="M7 20 H25" />
                </svg>
              </span>
            ) : null}
            <ProfileAvatar avatarSeed={player.uid} className={styles.profileAvatar} displayName={player.displayName} photoURL={player.photoURL ?? ""} />
            {isPlayerAdmin ? (
              <span className={styles.profileAdminBadge} aria-label="Admin">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 4 L20 11" />
                  <path d="M11 6 L18 13" />
                  <path d="M5 20 L14 11" />
                  <path d="M3 18 L6 21" />
                  <path d="M10 5 L14 1 L23 10 L19 14 Z" />
                </svg>
              </span>
            ) : null}
          </span>
          <div>
            <span>Profil joueur</span>
            <h2>{player.displayName}</h2>
            <p>{player.balance.toLocaleString("fr-FR")} credits</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            Fermer
          </button>
        </header>

        <div className={styles.profileActions}>
          {isCurrentUser ? (
            <div className={styles.profileEditor}>
              <label htmlFor="profileDisplayName">Pseudo</label>
              <input
                id="profileDisplayName"
                maxLength={28}
                value={draftDisplayName}
                onChange={(event) => setDraftDisplayName(event.target.value)}
              />
              <label>Avatar de profil</label>
              <div className={styles.profileAvatarChoices} aria-label="Choix rapides de photo">
                {avatarChoices.map((choice) => (
                  <button
                    className={draftPhotoURL === choice.photoURL ? styles.activeAvatarChoice : ""}
                    key={choice.id}
                    type="button"
                    onClick={() => setDraftPhotoURL(choice.photoURL)}
                  >
                    <ProfileAvatar
                      avatarSeed={choice.id === "auto" ? player.uid : choice.id}
                      className={styles.profileAvatarChoice}
                      displayName={player.displayName}
                      photoURL={choice.photoURL}
                    />
                    <span>{choice.label}</span>
                  </button>
                ))}
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => onSaveProfile(draftDisplayName, draftPhotoURL)}>
                Enregistrer le profil
              </button>
              <small>{editMessage || "Ton pseudo et ta photo seront visibles dans le classement."}</small>
            </div>
          ) : (
            <>
              <button className={isFriend ? styles.secondaryButton : styles.primaryButton} type="button" onClick={onSendFriendRequest} disabled={!currentUserId || isFriend}>
                {isFriend ? "Ami" : "Demander en ami"}
              </button>
              <small>{isFriend ? "Vous etes deja amis." : friendRequestMessage || (currentUserId ? "Clique pour envoyer une demande d'ami." : "Connecte-toi pour envoyer une demande.")}</small>
            </>
          )}
        </div>

        {!isCurrentUser && (
          <>
            <div className={styles.profileStats}>
              <span>
                <strong>{duelStats?.wins ?? 0}</strong>
                victoires
              </span>
              <span>
                <strong>{duelStats?.losses ?? 0}</strong>
                defaites
              </span>
              <span>
                <strong>{(duelStats?.ratio ?? 0).toFixed(2)}</strong>
                ratio
              </span>
            </div>

            <div className={styles.profileInventory}>
              {inventory.length === 0 && profileSpecialItems.length === 0 ? (
                <p className={styles.empty}>Aucun inventaire public pour le moment.</p>
              ) : (
                <>
                  {groupedInventory.map((group) =>
                    group.items.length > 0 ? (
                      <section className={styles.profileInventorySection} key={group.category}>
                        <h3>{skinCategoryLabel(group.category)}</h3>
                        <div className={styles.profileInventoryGrid}>
                          {group.items.map(({ item, count }) => {
                            const equipped = player.equippedSkins[item.category] === item.id;

                            return (
                              <article className={`${styles.profileInventoryItem} ${styles[`rarity-${item.rarity}`]}`} key={item.id}>
                                <div className={styles.inventoryPreview}>
                                  <SkinPreview item={item} large />
                                  <span className={styles.inventoryCount}>x{count}</span>
                                </div>
                                <div>
                                  <small>{rarityLabel(item.rarity)}</small>
                                  <h4>{item.name}</h4>
                                  <p>{equipped ? "Equipe" : "Dans l'inventaire"}</p>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ) : null,
                  )}
                  {profileSpecialItems.length > 0 ? (
                    <section className={styles.profileInventorySection}>
                      <h3>Ressources speciales</h3>
                      <div className={styles.profileInventoryGrid}>
                        {profileSpecialItems.map((item) => (
                          <article className={`${styles.profileInventoryItem} ${styles["rarity-rare"]}`} key={item.id}>
                            <div className={styles.inventoryPreview}>
                              <SpecialResourcePreview icon={item.icon} theme={item.theme} />
                              <span className={styles.inventoryCount}>x{item.count}</span>
                            </div>
                            <div>
                              <small>{item.detail}</small>
                              <h4>{item.title}</h4>
                              <p>Dans l'inventaire</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

type MenuIconName =
  | "home"
  | "games"
  | "slots"
  | "blackjack"
  | "plinko"
  | "roulette"
  | "rocket"
  | "claw"
  | "online"
  | "duel"
  | "poker"
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

function MenuIcon({ name }: { name: MenuIconName }) {
  return (
    <span className={styles.tabIcon} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        {name === "home" && (
          <>
            <path d="M6 15.5 16 7l10 8.5" />
            <path d="M9.5 14.5V25h13V14.5" />
            <path d="M13.5 25v-7h5v7" />
            <path d="M21.5 9.5v-3h3v5.5" />
          </>
        )}
        {name === "games" && (
          <>
            <rect x="6" y="10" width="11" height="11" rx="2.5" transform="rotate(-12 11.5 15.5)" />
            <rect x="15" y="12" width="11" height="11" rx="2.5" transform="rotate(10 20.5 17.5)" />
            <circle cx="10.5" cy="14" r="0.8" />
            <circle cx="13.5" cy="17" r="0.8" />
            <circle cx="19" cy="16" r="0.8" />
            <circle cx="22" cy="19" r="0.8" />
          </>
        )}
        {name === "slots" && (
          <>
            <rect x="6" y="9" width="18" height="15" rx="2" />
            <path d="M10 9V6h10v3M8 24h16M11 13h3M15 13h3M19 13h3" />
            <path d="M12.5 18h7" />
            <path d="M25 11h2v7h-2" />
          </>
        )}
        {name === "blackjack" || name === "poker" ? (
          <>
            <path d="M16 6c4.8 4.2 8 7.4 8 11.2 0 3-2.3 5.1-5.2 5.1-1.1 0-2.1-.3-2.8-.9.4 2.5 1.6 3.8 3.7 4.6h-7.4c2.1-.8 3.3-2.1 3.7-4.6-.8.6-1.7.9-2.8.9-2.9 0-5.2-2.1-5.2-5.1C8 13.4 11.2 10.2 16 6Z" />
            <path d="M16 9.5v12" />
          </>
        ) : null}
        {name === "plinko" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M16 10v12M12 13h6.4a3 3 0 0 1 0 6H12" />
            <path d="M8.5 9.5 6.8 7.8M23.5 9.5l1.7-1.7M8.5 22.5l-1.7 1.7M23.5 22.5l1.7 1.7" />
          </>
        )}
        {name === "roulette" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <circle cx="16" cy="16" r="4" />
            <path d="M16 6v20M6 16h20M9 9l14 14M23 9 9 23" />
            <circle cx="20.8" cy="11.5" r="1.3" />
          </>
        )}
        {name === "rocket" && (
          <>
            <path d="M17 5c4.2 3 5.8 8.2 3.8 13.5L14 11.7C15 8.5 16.1 6.2 17 5Z" />
            <path d="M14 11.7 8 13l4.8 2.6M20.8 18.5 19.5 25l-2.8-4.7" />
            <circle cx="17.9" cy="11.2" r="1.6" />
            <path d="M11.5 20.5 7 25M9 18l-3 3M14 23l-3 3" />
          </>
        )}
        {name === "claw" && (
          <>
            <rect x="7" y="9" width="12" height="14" rx="2" />
            <rect x="10" y="13" width="6" height="5" rx="1" />
            <path d="M21 8v15M19 8h4M21 23l-3 3M21 23l3 3" />
            <path d="M8 26h10" />
          </>
        )}
        {name === "online" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M6 16h20M16 6c3 3.1 4.4 6.5 4.4 10S19 22.9 16 26M16 6c-3 3.1-4.4 6.5-4.4 10S13 22.9 16 26" />
          </>
        )}
        {name === "duel" && (
          <>
            <path d="M8 23 23 8M9.5 8.5l14 14" />
            <path d="M6 20.5 11.5 26 8 26 6 24ZM20.5 6 26 11.5 26 8 24 6Z" />
            <path d="M6 11.5 11.5 6 8 6 6 8ZM20.5 26 26 20.5 26 24 24 26Z" />
          </>
        )}
        {name === "missions" && (
          <>
            <rect x="8" y="6" width="16" height="20" rx="2.5" />
            <path d="M12 11h8M12 16h8M12 21h5" />
            <path d="m11 16 1.6 1.6L16 14" />
            <path d="M13 6h6l-1-2h-4Z" />
          </>
        )}
        {name === "cases" && (
          <>
            <path d="M7 12 16 7l9 5-9 5Z" />
            <path d="M7 12v9l9 5 9-5v-9M16 17v9" />
            <path d="M11.5 9.5 20.5 14.5" />
          </>
        )}
        {name === "shop" && (
          <>
            <path d="M7 9h3l2.2 11h10.3L25 12H11" />
            <circle cx="14" cy="25" r="1.7" />
            <circle cx="22" cy="25" r="1.7" />
            <path d="M16 15h4M18 13v4" />
          </>
        )}
        {name === "inventory" && (
          <>
            <rect x="8" y="10" width="16" height="15" rx="3" />
            <path d="M11 10V8a5 5 0 0 1 10 0v2M8 17h16M12 21h8" />
            <path d="M10 25v2M22 25v2" />
          </>
        )}
        {name === "bonus" && (
          <>
            <rect x="7" y="13" width="18" height="12" rx="2" />
            <path d="M6 13h20M16 13v12M8.5 10.5c0-2 1.5-3 3-2.5 1.7.6 3.2 3 4.5 5-2.8.1-5.4-.2-7.5-2.5ZM23.5 10.5c0-2-1.5-3-3-2.5-1.7.6-3.2 3-4.5 5 2.8.1 5.4-.2 7.5-2.5Z" />
          </>
        )}
        {name === "friends" && (
          <>
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="21" cy="13" r="3" />
            <path d="M5.5 25c.8-4.5 4-7 7.2-7s6.2 2.5 7 7" />
            <path d="M18.5 25c.5-2.7 2.3-4.5 5-4.8 1.4.7 2.5 2.3 3 4.8" />
          </>
        )}
        {name === "trades" && (
          <>
            <path d="M8 11h15l-3-3M24 21H9l3 3" />
            <path d="M23 8v6M9 18v6" />
            <circle cx="13" cy="16" r="2" />
          </>
        )}
        {name === "messages" && (
          <>
            <rect x="6" y="9" width="20" height="15" rx="2.5" />
            <path d="m7 11 9 7 9-7" />
            <path d="m7 23 6.5-6M25 23l-6.5-6" />
          </>
        )}
        {name === "activity" && (
          <>
            <path d="M16 7v11" />
            <circle cx="16" cy="23" r="1.5" />
            <path d="M10 10c1.5-2 3.5-3 6-3s4.5 1 6 3M9 25h14" />
          </>
        )}
        {name === "admin" && (
          <>
            <path d="M16 6 25 10v6.5c0 5.1-3.4 8.6-9 10-5.6-1.4-9-4.9-9-10V10Z" />
            <path d="m16 12 1.4 2.8 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4Z" />
          </>
        )}
      </svg>
    </span>
  );
}

function ProfileAvatar({
  avatarSeed,
  className,
  displayName,
  photoURL,
}: {
  avatarSeed?: string;
  className: string;
  displayName: string;
  photoURL?: string | null;
}) {
  const avatar = publicCasinoAvatarUrl(photoURL, avatarSeed || displayName || "joueur");

  return (
    <span className={className} data-avatar-source={avatar.source}>
      <img alt="" src={avatar.url} />
    </span>
  );
}

function BlackjackGame({
  activeBet,
  bet,
  canDeal,
  canDouble,
  dealerHand,
  history,
  message,
  paused,
  phase,
  playerHand,
  cardBackSkin,
  onBetChange,
  onDeal,
  onDouble,
  onHit,
  onStand,
}: {
  activeBet: number;
  bet: Bet;
  canDeal: boolean;
  canDouble: boolean;
  dealerHand: Card[];
  history: BlackjackHistoryItem[];
  message: string;
  paused: boolean;
  phase: BlackjackPhase;
  playerHand: Card[];
  cardBackSkin: ShopItem;
  onBetChange: (bet: Bet) => void;
  onDeal: () => void;
  onDouble: () => void;
  onHit: () => void;
  onStand: () => void;
}) {
  const revealDealer = phase === "finished";

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.blackjackTable}>
          <CardHand
            title="Croupier"
            cards={dealerHand}
            cardBackSkin={cardBackSkin}
            hiddenSecondCard={!revealDealer && dealerHand.length > 0}
            value={revealDealer ? handValue(dealerHand) : undefined}
          />
          <CardHand
            title="Joueur"
            cards={playerHand}
            cardBackSkin={cardBackSkin}
            value={playerHand.length ? handValue(playerHand) : undefined}
          />
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.controls}>
          <label htmlFor="blackjackBet">Mise virtuelle</label>
          <BetAmountInput id="blackjackBet" value={bet} onChange={onBetChange} disabled={phase === "player"} />

          {phase === "player" ? (
            <>
              <button className={styles.primaryButton} type="button" onClick={onHit} disabled={paused}>
                Tirer
              </button>
              <button className={styles.secondaryButton} type="button" onClick={onStand} disabled={paused}>
                Rester
              </button>
              <button className={styles.secondaryButton} type="button" onClick={onDouble} disabled={paused || !canDouble}>
                Doubler
              </button>
            </>
          ) : (
            <>
              <button className={styles.primaryButton} type="button" onClick={onDeal} disabled={paused || !canDeal}>
                Distribuer
              </button>
            </>
          )}
        </div>

        {phase === "player" && <small className={styles.betNote}>Mise de la main : {activeBet} credits virtuels.</small>}

        {paused && (
          <div className={styles.pausePanel} role="status">
            Pause active. Aucun credit virtuel n'a de valeur reelle.
          </div>
        )}
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Regles blackjack</h2>
          <ul className={styles.ruleList}>
            {blackjackRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p>
            Avertissement : ce jeu est une simulation gratuite. Il n'y a ni paiement, ni crypto,
            ni promesse de gain reel.
          </p>
        </article>

        <HistoryPanel title="10 dernieres mains" empty="Aucune main pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>
                {item.label} ({item.playerValue}-{item.dealerValue})
              </span>
              <small>
                mise {item.bet} | {item.net >= 0 ? "+" : ""}
                {item.net} | solde {item.balanceAfter}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function CardHand({
  title,
  cards,
  cardBackSkin,
  hiddenSecondCard = false,
  value,
}: {
  title: string;
  cards: Card[];
  cardBackSkin: ShopItem;
  hiddenSecondCard?: boolean;
  value?: number;
}) {
  return (
    <div className={styles.hand}>
      <div className={styles.handHeader}>
        <h2>{title}</h2>
        <span>{value ? `${value}` : "-"}</span>
      </div>
      <div className={styles.cards}>
        {cards.length === 0 ? (
          <div
            className={`${styles.cardBack} ${styles.cardBackImage} ${styles.cardPlaceholder} ${cardBackClass(cardBackSkin.id)}`}
            style={blackjackSkinImageStyle(cardBackSkin.id)}
          >
            ?
          </div>
        ) : (
          cards.map((card, index) =>
            hiddenSecondCard && index === 1 ? (
              <div
                className={`${styles.cardBack} ${styles.cardBackImage} ${styles.cardAnimated} ${styles.cardHidden} ${cardBackClass(cardBackSkin.id)}`}
                style={{ "--card-index": index, ...blackjackSkinImageStyle(cardBackSkin.id) } as CSSProperties}
                key="hidden"
              >
                ?
              </div>
            ) : (
              <ThemedBlackjackCard
                card={card}
                skinId={cardBackSkin.id}
                className={styles.cardAnimated}
                style={{ "--card-index": index } as CSSProperties}
                key={`${card.rank}-${card.suit}-${index}`}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function ThemedBlackjackCard({
  card,
  skinId,
  className = "",
  style,
  preview = false,
}: {
  card: Card;
  skinId: string;
  className?: string;
  style?: CSSProperties;
  preview?: boolean;
}) {
  const model = getBlackjackCardFaceModel(card, skinId);
  const cornerSuit =
    model.kind === "figure" ? (
      <DeckArtSprite className={styles.cardCornerSuit} cell={model.suit.illustration.assetCell} skinId={model.theme.id} />
    ) : null;
  const corner = (
    <>
      <strong>{model.rank}</strong>
      {cornerSuit}
    </>
  );

  return (
    <div
      className={`${styles.card} ${styles.themedCardFace} ${preview ? styles.themedPreviewCard : ""} ${className}`}
      data-theme={model.theme.pattern}
      data-kind={model.kind}
      data-rank={model.rank}
      data-suit={model.suit.baseSuit}
      aria-label={`${model.rank} ${model.suit.baseSuit}`}
      style={{ ...blackjackCardFaceStyle(model), ...style }}
    >
      <span className={styles.cardCorner}>{corner}</span>
      {model.kind === "figure" ? <ThemedFigureArtwork model={model} /> : <ThemedPipArtwork model={model} />}
      <span className={`${styles.cardCorner} ${styles.cardCornerBottom}`}>{corner}</span>
    </div>
  );
}

function ThemedPipArtwork({ model }: { model: Extract<BlackjackCardFaceModel, { kind: "pip" }> }) {
  return (
    <span className={styles.themedPipGrid} aria-hidden="true">
      {model.pips.map((pip, index) => (
        <span
          className={pip.rotate ? styles.themedPipRotated : ""}
          style={{ gridColumn: pip.column, gridRow: pip.row } as CSSProperties}
          key={`${pip.column}-${pip.row}-${index}`}
        >
          <DeckArtSprite className={styles.themedPip} cell={pip.assetCell} skinId={model.theme.id} />
        </span>
      ))}
    </span>
  );
}

function ThemedFigureArtwork({ model }: { model: Extract<BlackjackCardFaceModel, { kind: "figure" }> }) {
  return (
    <span className={styles.themedFigureArt} data-role={model.figure.role} data-frame={model.figure.frame} aria-hidden="true">
      <span className={styles.themedFigureHalo} />
      <DeckArtSprite className={styles.themedFigureImage} cell={model.figure.assetCell} skinId={model.theme.id} />
    </span>
  );
}

function DeckArtSprite({
  cell,
  className = "",
  skinId,
}: {
  cell: DeckArtCell;
  className?: string;
  skinId: string;
}) {
  const atlas = blackjackSkinImages(skinId)?.art;

  return (
    <span className={`${styles.cardArtSprite} ${className}`} data-art-cell={cell.id} style={blackjackArtCellStyle(cell)} aria-hidden="true">
      {atlas ? <img className={styles.cardArtAtlasImage} src={atlas} alt="" draggable={false} /> : null}
    </span>
  );
}

function blackjackCardFaceStyle(model: BlackjackCardFaceModel): CSSProperties {
  return {
    "--card-face-surface": model.theme.surface,
    "--card-face-surface-alt": model.theme.surfaceAlt,
    "--card-face-ink": model.theme.ink,
    "--card-face-border": model.theme.border,
    "--card-face-accent": model.theme.accent,
    "--card-face-foil": model.theme.foil,
    "--card-suit-color": model.suit.color,
    "--card-suit-shadow": model.suit.shadow,
  } as CSSProperties;
}

function blackjackArtCellStyle(cell: DeckArtCell): CSSProperties {
  return {
    "--card-art-translate-x": `${cell.column * -25}%`,
    "--card-art-translate-y": `${cell.row * -50}%`,
  } as CSSProperties;
}

function PlinkoGame({
  animating,
  ballSlots,
  bet,
  canLaunch,
  history,
  launches,
  layout,
  message,
  paused,
  rows,
  ballSkin,
  onBetChange,
  onLaunch,
  onResolve,
}: {
  animating: boolean;
  ballSlots: number[];
  bet: Bet;
  canLaunch: boolean;
  history: PlinkoHistoryItem[];
  launches: PlinkoLaunch[];
  layout: PlinkoLayout;
  message: string;
  paused: boolean;
  rows: PlinkoRows;
  ballSkin: ShopItem;
  onBetChange: (bet: Bet) => void;
  onLaunch: () => void;
  onResolve: (launch: PlinkoLaunch, slot: number, path: PlinkoStep[]) => void;
}) {
  const probabilities = getPlinkoProbabilities(rows, layout);
  const slots = getPlinkoMultipliers(rows, layout);

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.plinkoBoard}>
          <PlinkoPhysicsBoard ballSkin={ballSkin} launches={launches} rows={rows} onResolve={onResolve} />
          <div className={styles.plinkoSlots} style={{ gridTemplateColumns: `repeat(${rows + 1}, minmax(0, 1fr))` }}>
            {slots.map((multiplier, index) => (
              <div className={ballSlots.includes(index) ? `${styles.plinkoSlot} ${styles.activePlinkoSlot}` : styles.plinkoSlot} key={`${multiplier}-${index}`}>
                x{multiplier}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.controls}>
          <label htmlFor="plinkoBet">Mise virtuelle</label>
          <BetAmountInput id="plinkoBet" max={PLINKO_MAX_BET} value={bet} onChange={onBetChange} />
          <label htmlFor="plinkoRows">Rangees</label>
          <input id="plinkoRows" type="text" value={`${rows} rangees`} readOnly disabled={animating} />
          <button
            className={styles.primaryButton}
            type="button"
            onClick={onLaunch}
            disabled={paused || !canLaunch}
          >
            Lancer une bille
          </button>
        </div>
        <small className={styles.betNote}>Mise Plinko maximum : {PLINKO_MAX_BET.toLocaleString("fr-FR")} credits virtuels.</small>

        {paused && (
          <div className={styles.pausePanel} role="status">
            Pause active. Le Plinko utilise seulement des credits virtuels gratuits.
          </div>
        )}
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Regles du Plinko</h2>
          <p>
            A chaque rangee, la bille part a gauche ou a droite avec une probabilite theorique de
            50 %. La case finale depend du nombre de pas a droite.
          </p>
          {layout === "mobile" && (
            <p>
              Sur telephone, les multiplicateurs sont reorganises pour eviter que les bords soient trop faciles.
            </p>
          )}
          <div className={styles.rulesTable}>
            {probabilities.map((item) => (
              <div className={styles.ruleRow} key={item.slot}>
                <span>Case {item.slot}</span>
                <strong>x{item.multiplier}</strong>
                <small>
                  {item.combinations} / {2 ** rows} = {(item.probability * 100).toFixed(2)} %
                </small>
              </div>
            ))}
          </div>
          <p>
            Simulation fictive : les credits n'ont aucune valeur reelle et les multiplicateurs ne
            promettent aucun gain reel.
          </p>
        </article>

        <HistoryPanel title="10 derniers lancers" empty="Aucun lancer pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>
                {item.rows} rangees | case {item.slot} | x{item.multiplier}
              </span>
              <small>
                mise {item.bet} | {item.net >= 0 ? "+" : ""}
                {item.net} | solde {item.balanceAfter}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function PlinkoPhysicsBoard({
  ballSkin,
  launches,
  rows,
  onResolve,
}: {
  ballSkin: ShopItem;
  launches: PlinkoLaunch[];
  rows: PlinkoRows;
  onResolve: (launch: PlinkoLaunch, slot: number, path: PlinkoStep[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const onResolveRef = useRef(onResolve);
  const engineRef = useRef<ReturnType<typeof Engine.create> | null>(null);
  const [boardSizeKey, setBoardSizeKey] = useState(0);
  const activeBodiesRef = useRef(
    new Map<
      number,
      {
        launch: PlinkoLaunch;
        body: ReturnType<typeof Bodies.circle>;
        nextPathY: number;
        path: PlinkoStep[];
        resolved: boolean;
      }
    >(),
  );

  useEffect(() => {
    onResolveRef.current = onResolve;
  }, [onResolve]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setBoardSizeKey((value) => value + 1);
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const engine = Engine.create();
    engineRef.current = engine;
    const runner = Runner.create();
    const dimensions = getPlinkoDimensions(width, height, rows);
    engine.gravity.y = dimensions.gravity;
    const pegs = getPegPositions(width, height, rows).map((peg) =>
      Bodies.circle(peg.x, peg.y, dimensions.pegRadius, {
        isStatic: true,
        restitution: dimensions.pegRestitution,
        friction: 0,
        label: "peg",
      }),
    );
    const slotTop = dimensions.slotTop;
    const slotWidth = dimensions.slotWidth;
    const walls = [
      Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true }),
      Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true }),
      Bodies.rectangle(width / 2, height + 18, width, 36, { isStatic: true }),
      ...Array.from({ length: rows }, (_, index) =>
        Bodies.rectangle((index + 1) * slotWidth, slotTop + 30, dimensions.dividerWidth, 70, {
          isStatic: true,
          restitution: 0.2,
        }),
      ),
    ];

    Composite.add(engine.world, [...pegs, ...walls]);
    Runner.run(runner, engine);

    const render = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(255, 255, 255, 0.92)";
      pegs.forEach((peg) => drawCircle(context, peg.position.x, peg.position.y, dimensions.pegRadius));
      drawSlotDividers(context, width, height, rows);

      activeBodiesRef.current.forEach((entry, id) => {
        const { body } = entry;

        drawSkinnedBall(context, body.position.x, body.position.y, dimensions.ballRadius, ballSkin);
        context.shadowBlur = 0;

        if (entry.path.length < rows && body.position.y >= entry.nextPathY) {
          entry.path.push(body.velocity.x < 0 ? "L" : "R");
          entry.nextPathY += (slotTop - 70) / Math.max(rows - 1, 1);
        }

        if (!entry.resolved && body.position.y >= slotTop + 34) {
          entry.resolved = true;

          const slot = Math.max(0, Math.min(rows, Math.floor(body.position.x / slotWidth)));
          const path = normalizePath(entry.path, rows, slot);

          window.setTimeout(() => onResolveRef.current(entry.launch, slot, path), 180);
          Composite.remove(engine.world, body);
          activeBodiesRef.current.delete(id);
        }
      });

      frameRef.current = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      Runner.stop(runner);
      Engine.clear(engine);
      engineRef.current = null;
      activeBodiesRef.current.clear();
    };
  }, [ballSkin, rows, boardSizeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;

    if (!canvas || !engine) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dimensions = getPlinkoDimensions(width, height, rows);
    const firstPegY = getPegPositions(width, height, rows)[0]?.y ?? 70;
    const launchIds = new Set(launches.map((launch) => launch.id));

    activeBodiesRef.current.forEach((entry, id) => {
      if (!launchIds.has(id)) {
        Composite.remove(engine.world, entry.body);
        activeBodiesRef.current.delete(id);
      }
    });

    launches.forEach((launch) => {
      if (activeBodiesRef.current.has(launch.id)) {
        return;
      }

      const body = Bodies.circle(width / 2 + (Math.random() - 0.5) * dimensions.launchSpread, 22, dimensions.ballRadius, {
        restitution: dimensions.ballRestitution,
        friction: 0.001,
        frictionAir: dimensions.frictionAir,
        density: dimensions.ballDensity,
        label: `ball-${launch.id}`,
      });

      Body.setVelocity(body, { x: (Math.random() - 0.5) * dimensions.launchVelocity, y: 0 });
      Composite.add(engine.world, body);
      activeBodiesRef.current.set(launch.id, {
        launch,
        body,
        nextPathY: firstPegY,
        path: [],
        resolved: false,
      });
    });
  }, [launches, rows]);

  return <canvas className={styles.plinkoCanvas} ref={canvasRef} aria-label="Simulation physique du Plinko" />;
}

function getPegPositions(width: number, height: number, rows: PlinkoRows) {
  const { slotTop, spacing } = getPlinkoDimensions(width, height, rows);
  const top = 24;
  const verticalGap = (slotTop - 64) / Math.max(rows - 1, 1);

  return Array.from({ length: rows }).flatMap((_, row) => {
    const y = top + row * verticalGap + 42;
    return Array.from({ length: row + 1 }, (__, peg) => ({
      x: width / 2 + (peg - row / 2) * spacing,
      y,
    }));
  });
}

function getPlinkoDimensions(width: number, height: number, rows: PlinkoRows) {
  const horizontalPadding = width < 430 ? 44 : 48;
  const spacing = Math.min(84, Math.max(18, (width - horizontalPadding) / (rows + 1)));
  const compactBoard = width < 520;
  const pegRadius = compactBoard
    ? Math.max(2.8, Math.min(4.2, spacing * 0.13))
    : Math.max(3.6, Math.min(6, spacing * 0.18));
  const ballRadius = compactBoard
    ? Math.max(4.4, Math.min(6.2, spacing * 0.19))
    : Math.max(6.2, Math.min(11, spacing * 0.3));

  return {
    ballDensity: compactBoard ? 0.012 : 0.008,
    ballRestitution: compactBoard ? 0.32 : 0.48,
    ballRadius,
    compactBoard,
    dividerWidth: Math.max(2, Math.min(5, spacing * 0.12)),
    frictionAir: compactBoard ? 0.0035 : 0.004,
    gravity: compactBoard ? 2.25 : 1.65,
    launchSpread: Math.max(18, Math.min(42, spacing * 1.35)),
    launchVelocity: compactBoard ? Math.max(0.55, Math.min(1.1, spacing / 34)) : Math.max(0.7, Math.min(1.6, spacing / 36)),
    pegRestitution: compactBoard ? 0.46 : 0.58,
    pegRadius,
    slotTop: height - 68,
    slotWidth: width / (rows + 1),
    spacing,
  };
}

function drawCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawSkinnedBall(context: CanvasRenderingContext2D, x: number, y: number, radius: number, skin: ShopItem) {
  const ballImage = getLoadedPlinkoBallImage(skin.id);

  if (ballImage) {
    context.save();
    context.shadowColor = ballGlow(skin.id);
    context.shadowBlur = radius * 1.8;
    context.beginPath();
    context.arc(x, y, radius * 1.08, 0, Math.PI * 2);
    context.clip();
    context.drawImage(ballImage, x - radius * 1.18, y - radius * 1.18, radius * 2.36, radius * 2.36);
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255, 255, 255, 0.3)";
    context.lineWidth = Math.max(1, radius * 0.08);
    context.beginPath();
    context.arc(x, y, radius * 0.92, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    return;
  }

  context.save();
  context.shadowColor = ballGlow(skin.id);
  context.shadowBlur = radius * 1.8;
  const gradient = context.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.1, x, y, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, skin.preview);
  gradient.addColorStop(1, skin.preview);
  context.fillStyle = gradient;
  drawCircle(context, x, y, radius);
  context.shadowBlur = 0;

  context.save();
  context.beginPath();
  context.arc(x, y, radius * 0.92, 0, Math.PI * 2);
  context.clip();
  context.strokeStyle = "rgba(16, 18, 24, 0.28)";
  context.lineWidth = Math.max(1.2, radius * 0.16);

  if (skin.id.includes("neon")) {
    for (let offset = -radius * 2; offset <= radius * 2; offset += radius * 0.55) {
      context.beginPath();
      context.moveTo(x - radius + offset, y + radius);
      context.lineTo(x + radius + offset, y - radius);
      context.stroke();
    }
  } else if (skin.id.includes("ruby") || skin.id.includes("rose")) {
    context.beginPath();
    context.arc(x + radius * 0.28, y + radius * 0.28, radius * 0.52, 0, Math.PI * 2);
    context.stroke();
  } else if (skin.id.includes("ocean") || skin.id.includes("sapphire")) {
    context.beginPath();
    context.moveTo(x - radius, y + radius * 0.15);
    context.quadraticCurveTo(x, y - radius * 0.45, x + radius, y + radius * 0.12);
    context.stroke();
  } else if (skin.id.includes("lilac") || skin.id.includes("violet")) {
    context.beginPath();
    context.moveTo(x, y - radius);
    context.lineTo(x + radius * 0.65, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius * 0.65, y);
    context.closePath();
    context.stroke();
  } else if (skin.id.includes("mint") || skin.id.includes("jade") || skin.id.includes("emerald")) {
    for (let dot = 0; dot < 6; dot += 1) {
      const angle = (Math.PI * 2 * dot) / 6;
      context.beginPath();
      context.arc(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45, radius * 0.12, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, 0.36)";
      context.fill();
    }
  } else if (skin.id.includes("pearl") || skin.id.includes("cloud") || skin.id.includes("crystal") || skin.id.includes("opal")) {
    context.strokeStyle = "rgba(255, 255, 255, 0.5)";
    for (let line = -1; line <= 1; line += 1) {
      context.beginPath();
      context.arc(x + line * radius * 0.18, y, radius * (0.44 + line * 0.08), Math.PI * 0.18, Math.PI * 1.3);
      context.stroke();
    }
  } else if (skin.id.includes("copper") || skin.id.includes("amber")) {
    context.strokeStyle = "rgba(90, 42, 18, 0.35)";
    for (let offset = -radius * 2; offset <= radius * 2; offset += radius * 0.48) {
      context.beginPath();
      context.moveTo(x - radius + offset, y - radius);
      context.lineTo(x + radius + offset, y + radius);
      context.stroke();
    }
  } else if (skin.id.includes("prism") || skin.id.includes("azure") || skin.id.includes("laser") || skin.id.includes("comet")) {
    const colors = ["#8fd3ff", "#c58cff", "#ffd166", "#79e29f"];
    for (let index = 0; index < colors.length; index += 1) {
      context.beginPath();
      context.moveTo(x, y);
      context.arc(x, y, radius, (Math.PI * 2 * index) / colors.length, (Math.PI * 2 * (index + 1)) / colors.length);
      context.closePath();
      context.fillStyle = colors[index];
      context.globalAlpha = 0.48;
      context.fill();
    }
    context.globalAlpha = 1;
  } else if (skin.id.includes("eclipse") || skin.id.includes("storm")) {
    context.beginPath();
    context.arc(x + radius * 0.32, y + radius * 0.22, radius * 0.46, 0, Math.PI * 2);
    context.fillStyle = "rgba(181, 140, 255, 0.5)";
    context.fill();
  } else if (skin.id.includes("galaxy") || skin.id.includes("starfall") || skin.id.includes("aurora") || skin.id.includes("supernova") || skin.id.includes("cosmic")) {
    const colors = ["rgba(143, 211, 255, 0.64)", "rgba(197, 140, 255, 0.58)", "rgba(255, 209, 102, 0.48)"];
    colors.forEach((color, index) => {
      context.beginPath();
      context.arc(x + Math.cos(index * 2.1) * radius * 0.34, y + Math.sin(index * 2.1) * radius * 0.34, radius * 0.22, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    });
  } else if (skin.id.includes("sun")) {
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 8;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      context.stroke();
    }
  }

  context.restore();
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  drawCircle(context, x - radius * 0.32, y - radius * 0.34, radius * 0.16);
  context.restore();
}

function drawSlotDividers(context: CanvasRenderingContext2D, width: number, height: number, rows: PlinkoRows) {
  const { dividerWidth, slotTop, slotWidth } = getPlinkoDimensions(width, height, rows);
  context.fillStyle = "rgba(255, 255, 255, 0.14)";
  for (let index = 1; index <= rows; index += 1) {
    context.fillRect(index * slotWidth - dividerWidth / 2, slotTop, dividerWidth, 54);
  }
}

function normalizePath(path: PlinkoStep[], rows: PlinkoRows, slot: number): PlinkoStep[] {
  const rightCount = path.filter((step) => step === "R").length;
  const adjusted = [...path];

  while (adjusted.length < rows) {
    adjusted.push(adjusted.filter((step) => step === "R").length < slot ? "R" : "L");
  }

  if (rightCount !== slot) {
    return Array.from({ length: rows }, (_, index) => (index < slot ? "R" : "L"));
  }

  return adjusted.slice(0, rows);
}

function RouletteGame({
  bet,
  betKind,
  canSpin,
  chosenNumber,
  history,
  message,
  paused,
  pendingResult,
  result,
  runId,
  ballSkin,
  spinning,
  onBetChange,
  onBetKindChange,
  onNumberChange,
  onSpin,
}: {
  bet: Bet;
  betKind: RouletteBetKind;
  canSpin: boolean;
  chosenNumber: number;
  history: RouletteHistoryItem[];
  message: string;
  paused: boolean;
  pendingResult: number | null;
  result: number | null;
  runId: number;
  ballSkin: ShopItem;
  spinning: boolean;
  onBetChange: (bet: Bet) => void;
  onBetKindChange: (kind: RouletteBetKind) => void;
  onNumberChange: (number: number) => void;
  onSpin: () => void;
}) {
  const wheelRotation = useRouletteWheelRotation(spinning, runId);

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.rouletteLayout}>
          <div
            className={styles.rouletteWheel}
            style={{ "--wheel-rotation": `${wheelRotation}deg` } as CSSProperties}
          >
            <RouletteWheelSegments />
            <RouletteBall ballSkin={ballSkin} result={pendingResult ?? result} runId={runId} spinning={spinning} />
            <div className={styles.rouletteCenter}>{result ?? "?"}</div>
          </div>
          <div className={styles.rouletteGrid} aria-label="Table de roulette">
            {ROULETTE_NUMBERS.map((number) => (
              <div
                className={`${styles.rouletteCell} ${styles[getRouletteColor(number)]} ${
                  result === number ? styles.activeRouletteCell : ""
                }`}
                key={number}
              >
                {number}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.controls}>
          <label htmlFor="rouletteBet">Mise virtuelle</label>
          <BetAmountInput id="rouletteBet" value={bet} onChange={onBetChange} />

          <label htmlFor="rouletteKind">Pari</label>
          <select
            id="rouletteKind"
            value={betKind}
            onChange={(event) => onBetKindChange(event.target.value as RouletteBetKind)}
            disabled={spinning}
          >
            {rouletteBetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {betKind === "straight" && (
            <>
              <label htmlFor="rouletteNumber">Numero</label>
              <select
                id="rouletteNumber"
                value={chosenNumber}
                onChange={(event) => onNumberChange(Number(event.target.value))}
                disabled={spinning}
              >
                {ROULETTE_NUMBERS.map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            </>
          )}

          <button className={styles.primaryButton} type="button" onClick={onSpin} disabled={paused || !canSpin || spinning}>
            Lancer
          </button>
        </div>

        {paused && (
          <div className={styles.pausePanel} role="status">
            Pause active. La roulette est une simulation sans argent reel.
          </div>
        )}
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Regles roulette</h2>
          <p>
            Roulette europeenne fictive avec un seul zero. Les credits sont virtuels, gratuits et
            sans valeur reelle.
          </p>
          <div className={styles.rulesTable}>
            {rouletteRules.map((rule) => (
              <div className={styles.ruleRow} key={rule.label}>
                <span>{rule.label}</span>
                <strong>{rule.reward}</strong>
                <small>{rule.probability}</small>
              </div>
            ))}
          </div>
        </article>

        <HistoryPanel title="10 derniers tours" empty="Aucun tour pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>
                {item.number} {formatRouletteColor(item.color)} | {item.label}
              </span>
              <small>
                mise {item.bet} | {item.net >= 0 ? "+" : ""}
                {item.net} | solde {item.balanceAfter}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function RouletteWheelSegments() {
  const outerRadius = 48;
  const innerRadius = 20;
  const center = 50;
  const segmentAngle = 360 / ROULETTE_WHEEL_ORDER.length;

  return (
    <svg className={styles.rouletteSvg} viewBox="0 0 100 100" aria-hidden="true">
      {ROULETTE_WHEEL_ORDER.map((number, index) => {
        const start = -90 + index * segmentAngle;
        const end = start + segmentAngle;
        const color = getRouletteColor(number);
        const fill = color === "green" ? "#2ea05f" : color === "red" ? "#cf3d3d" : "#181b22";

        return (
          <path
            d={describeArcSegment(center, center, innerRadius, outerRadius, start, end)}
            fill={fill}
            key={number}
            stroke="rgba(215, 194, 138, 0.38)"
            strokeWidth="0.25"
          />
        );
      })}
    </svg>
  );
}

function useRouletteWheelRotation(spinning: boolean, runId: number): number {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (!spinning) {
      return;
    }

    let frame = 0;
    const start = performance.now();
    const initialRotation = rotationRef.current;
    const totalRotation = 980;

    const animate = (time: number) => {
      const progress = Math.min((time - start) / ROULETTE_SPIN_DURATION_MS, 1);
      const eased = easeOutQuart(progress);
      const nextRotation = initialRotation + totalRotation * eased;

      rotationRef.current = nextRotation;
      setRotation(nextRotation);

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, [runId, spinning]);

  return rotation;
}

function RouletteBall({
  ballSkin,
  result,
  runId,
  spinning,
}: {
  ballSkin: ShopItem;
  result: number | null;
  runId: number;
  spinning: boolean;
}) {
  const [style, setStyle] = useState({ "--ball-x": "50%", "--ball-y": "8%" } as CSSProperties);
  const ballImage = getRouletteBallImageSource(ballSkin.id);

  useEffect(() => {
    if (!spinning) {
      return;
    }

    let frame = 0;
    const start = performance.now();
    const startAngle = -Math.PI / 2 + Math.random() * Math.PI * 0.4;
    const targetAngle = result === null ? startAngle + Math.PI * 7 : getRouletteAngle(result);
    const extraTurns = Math.PI * 2 * (5 + Math.floor(Math.random() * 2));

    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / ROULETTE_SPIN_DURATION_MS, 1);
      const travel = easeOutQuart(progress);
      const settle = smoothstep(Math.max(0, (progress - 0.62) / 0.38));
      const chatter = Math.sin(progress * Math.PI * 28) * (1 - settle) * 0.035;
      const radius = 46 - settle * 21 + Math.abs(Math.sin(progress * Math.PI * 16)) * (1 - settle) * 2.2;
      const angle = startAngle + extraTurns * travel + (targetAngle - startAngle) * settle + chatter;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;

      setStyle({ "--ball-x": `${x}%`, "--ball-y": `${y}%` } as CSSProperties);

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, [result, runId, spinning]);

  return (
    <div
      className={`${styles.rouletteBall} ${ballSkinClass(ballSkin.id)}`}
      style={
        {
          ...style,
          ...(ballImage ? { background: `center / contain no-repeat url(${ballImage})` } : {}),
          "--roulette-ball-color": ballSkin.preview,
          "--roulette-ball-glow": ballGlow(ballSkin.id),
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}

function getRouletteAngle(number: number): number {
  const index = ROULETTE_WHEEL_ORDER.indexOf(number as (typeof ROULETTE_WHEEL_ORDER)[number]);
  return -Math.PI / 2 + ((index + 0.5) / ROULETTE_WHEEL_ORDER.length) * Math.PI * 2;
}

function describeArcSegment(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function easeOutQuart(progress: number): number {
  return 1 - (1 - progress) ** 4;
}

function smoothstep(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function CaseOpeningGame({
  balance,
  priceOverrides,
  history,
  lastDrop,
  message,
  modalPhase,
  modalTitle,
  modalVisible,
  opening,
  ownedSkinIds,
  paused,
  reelItems,
  selectedCase,
  specialInventory,
  onCloseModal,
  onMergeFragments,
  onOpen,
  onOpenSpecialChest,
  onSelectCase,
}: {
  balance: number;
  priceOverrides: AdminPriceOverrides;
  history: CaseHistoryItem[];
  lastDrop: CaseHistoryItem | null;
  message: string;
  modalPhase: "box" | "reel";
  modalTitle: string;
  modalVisible: boolean;
  opening: boolean;
  ownedSkinIds: string[];
  paused: boolean;
  reelItems: ShopItem[];
  selectedCase: SkinCategory;
  specialInventory: SpecialInventory;
  onCloseModal: () => void;
  onMergeFragments: (chestId: SpecialChestId) => void;
  onOpen: () => void;
  onOpenSpecialChest: (chestId: SpecialChestId) => void;
  onSelectCase: (category: SkinCategory) => void;
}) {
  const selectedDefinition = getCaseDefinition(selectedCase);
  const selectedCaseCost = priceOverrides.cases[selectedCase] ?? selectedDefinition.cost;
  const selectedItems = sortSkinsByRarity(SHOP_ITEMS.filter((item) => item.category === selectedCase && item.source !== "special"));
  const canOpen = balance >= selectedCaseCost && !opening && !paused;

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Cases Opening</h2>
            <p>{message}</p>
          </div>
          <strong>{balance.toLocaleString("fr-FR")} credits disponibles</strong>
        </div>

        <div className={styles.caseLayout}>
          <div className={styles.caseList} aria-label="Choix de la caisse">
            {CASES.map((caseDefinition: CaseDefinition) => {
              const active = selectedCase === caseDefinition.id;
              const ownedCount = SHOP_ITEMS.filter(
                (item) => item.category === caseDefinition.id && ownedSkinIds.includes(item.id),
              ).length;
              const totalCount = SHOP_ITEMS.filter((item) => item.category === caseDefinition.id && item.source !== "special").length;

              return (
                <button
                  className={`${styles.caseCard} ${caseThemeClass(caseDefinition.id)} ${active ? styles.caseCardActive : ""}`}
                  type="button"
                  key={caseDefinition.id}
                  onClick={() => onSelectCase(caseDefinition.id)}
                  disabled={opening}
                >
                  <CaseThemePreview category={caseDefinition.id} />
                  <span>{caseDefinition.title}</span>
                  <small>{caseDefinition.subtitle}</small>
                  <strong>{priceOverrides.cases[caseDefinition.id] ?? caseDefinition.cost} credits</strong>
                  <em>{ownedCount}/{totalCount} modeles</em>
                </button>
              );
            })}
          </div>

          <div className={`${styles.caseOpeningPanel} ${caseThemeClass(selectedCase)}`}>
            <div className={`${opening ? `${styles.caseBox} ${styles.caseBoxOpening}` : styles.caseBox} ${caseThemeClass(selectedCase)}`}>
              <span className={styles.caseMark} />
              <span className={styles.caseLid} />
              <span className={styles.caseGlow} />
              <span className={styles.caseBody} />
            </div>

            {lastDrop ? (
              <article className={`${styles.caseDrop} ${styles[`rarity-${lastDrop.item.rarity}`]}`}>
                <SkinPreview item={lastDrop.item} large />
                <div>
                  <small>{rarityLabel(lastDrop.item.rarity)}</small>
                  <h3>{lastDrop.item.name}</h3>
          <p>{lastDrop.duplicate ? "Doublon ajoute a l'inventaire" : "Nouveau skin debloque"}</p>
                </div>
              </article>
            ) : (
              <div className={styles.caseEmptyDrop}>
                <strong>{selectedDefinition.title}</strong>
                <span>Ouvre une caisse pour reveler un skin.</span>
              </div>
            )}

            <button className={styles.primaryButton} type="button" onClick={onOpen} disabled={!canOpen}>
              {opening ? "Ouverture..." : `Ouvrir pour ${selectedCaseCost} credits`}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Coffres speciaux</h2>
            <p>Fusionne 9 fragments pour creer une cle, puis ouvre le coffre correspondant.</p>
          </div>
        </div>
        <div className={styles.shopGrid}>
          {SPECIAL_CHESTS.map((chest) => {
            const ownedChests = specialInventory.chests[chest.id];
            const ownedKeys = specialInventory.keys[chest.id];
            const ownedFragments = specialInventory.fragments[chest.id];
            const canMerge = ownedFragments >= KEY_FRAGMENTS_REQUIRED;
            const canOpenSpecial = ownedChests > 0 && ownedKeys > 0 && !opening;

            return (
              <article className={styles.shopItem} key={chest.id}>
                <SpecialChestPreview chest={chest} />
                <SpecialChestRewards chest={chest} />
                <div>
                  <h3>{chest.title}</h3>
                  <p>{chest.subtitle}</p>
                  <small>
                    Coffres : {ownedChests} | Cles : {ownedKeys} | Fragments : {ownedFragments}/
                    {KEY_FRAGMENTS_REQUIRED}
                  </small>
                </div>
                <div className={styles.shopActions}>
                  <button className={styles.secondaryButton} type="button" onClick={() => onMergeFragments(chest.id)} disabled={!canMerge}>
                    Fusionner
                  </button>
                  <button className={styles.primaryButton} type="button" onClick={() => onOpenSpecialChest(chest.id)} disabled={!canOpenSpecial}>
                    Ouvrir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Contenu de la caisse</h2>
          <div className={styles.caseItemGrid}>
            {selectedItems.map((item) => {
              const owned = ownedSkinIds.includes(item.id);

              return (
                <article className={`${styles.caseItem} ${styles[`rarity-${item.rarity}`]}`} key={item.id}>
                  <SkinPreview item={item} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{rarityLabel(item.rarity)}</small>
                  </div>
                  <em>{owned ? "Possede" : "A debloquer"}</em>
                </article>
              );
            })}
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Raretes</h2>
          <div className={styles.rulesTable}>
            {(["common", "rare", "epic", "legendary"] as SkinRarity[]).map((rarity) => (
              <div className={styles.ruleRow} key={rarity}>
                <span>{rarityLabel(rarity)}</span>
                <strong>{RARITY_WEIGHTS[rarity]} parts</strong>
                <small>Doublon : garde dans l'inventaire</small>
              </div>
            ))}
          </div>
          <p>Les skins restent cosmetiques. Ils ne modifient pas les chances de jeu.</p>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>10 dernieres ouvertures</h2>
        <ul className={styles.history}>
          {history.map((item) => (
            <li key={item.id}>
              <span>
                {item.caseTitle} | {item.item.name}
              </span>
              <small>
                {rarityLabel(item.item.rarity)} | {item.duplicate ? "doublon garde" : "nouveau"} | solde{" "}
                {item.balanceAfter}
              </small>
            </li>
          ))}
        </ul>
        {history.length === 0 && <p className={styles.empty}>Aucune caisse ouverte pour le moment.</p>}
      </section>

      {modalVisible && (
        <CaseOpeningModal
          category={selectedCase}
          drop={lastDrop}
          phase={modalPhase}
          opening={opening}
          reelItems={reelItems}
          title={modalTitle}
          onClose={onCloseModal}
        />
      )}
    </>
  );
}

function CaseOpeningModal({
  category,
  drop,
  phase,
  opening,
  reelItems,
  title,
  onClose,
}: {
  category: SkinCategory;
  drop: CaseHistoryItem | null;
  phase: "box" | "reel";
  opening: boolean;
  reelItems: ShopItem[];
  title: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.caseModalBackdrop} role="dialog" aria-modal="true" aria-label="Ouverture de caisse">
      <div className={styles.caseModal}>
        <header className={styles.caseModalHeader}>
          <div>
            <span>{title}</span>
            <h2>{phase === "box" ? "La caisse s'ouvre" : opening ? "Les skins defilent" : "Skin gagne"}</h2>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={opening}>
            Fermer
          </button>
        </header>

        {phase === "box" ? (
          <div className={styles.caseModalBoxStage}>
            <div className={`${styles.caseBox} ${styles.caseBoxOpening} ${caseThemeClass(category)}`}>
              <span className={styles.caseMark} />
              <span className={styles.caseLid} />
              <span className={styles.caseGlow} />
              <span className={styles.caseBody} />
            </div>
            <p>La caisse s'ouvre avant le tirage des skins.</p>
          </div>
        ) : (
          <div className={styles.caseReelWindow}>
            <div className={styles.caseReelMarker} />
            <div
              className={opening ? `${styles.caseReelTrack} ${styles.caseReelTrackRolling}` : styles.caseReelTrack}
              style={{ "--case-reel-end": `${-CASE_REEL_WINNER_INDEX * 124}px` } as CSSProperties}
            >
              {reelItems.map((item, index) => (
                <article
                  className={`${styles.caseReelItem} ${styles[`rarity-${item.rarity}`]} ${
                    !opening && index === CASE_REEL_WINNER_INDEX ? styles.caseReelWinner : ""
                  }`}
                  key={`${item.id}-${index}`}
                >
                  <SkinPreview item={item} />
                  <strong>{item.name}</strong>
                  <small>{rarityLabel(item.rarity)}</small>
                </article>
              ))}
            </div>
          </div>
        )}

        {drop ? (
          <article className={`${styles.caseRewardPanel} ${styles[`rarity-${drop.item.rarity}`]}`}>
            <SkinPreview item={drop.item} large />
            <div>
              <small>{rarityLabel(drop.item.rarity)}</small>
              <h3>{drop.item.name}</h3>
              <p>
                {drop.duplicate
                  ? "Tu avais deja ce skin : il est ajoute en double dans ton inventaire."
                  : `Nouveau skin debloque et equipe depuis ${drop.caseTitle}.`}
              </p>
            </div>
          </article>
        ) : (
          <p className={styles.caseModalHint}>
            {phase === "box" ? "Preparation du tirage..." : "La bande defile et s'arrete sur le skin gagne."}
          </p>
        )}
      </div>
    </div>
  );
}

function CaseThemePreview({ category }: { category: SkinCategory }) {
  return (
    <span className={`${styles.caseMiniPreview} ${caseThemeClass(category)}`} aria-hidden="true">
      <span className={styles.caseMiniLid} />
      <span className={styles.caseMiniBody} />
      <span className={styles.caseMiniMark} />
    </span>
  );
}

function SpecialChestPreview({ chest }: { chest: SpecialChestDefinition }) {
  return (
    <div className={styles.specialChestPreview} style={{ "--special-chest-color": chest.theme } as CSSProperties}>
      <SpecialChestArtwork chestId={chest.id} />
      <strong>{chest.title}</strong>
    </div>
  );
}

function SpecialChestRewards({ chest }: { chest: SpecialChestDefinition }) {
  const rewardItems = chest.itemIds.map((itemId) => getShopItem(itemId));

  return (
    <div className={styles.specialChestRewards} aria-label={`Recompenses ${chest.title}`}>
      {rewardItems.map((item) => (
        <span className={styles.specialChestReward} key={item.id} title={item.name}>
          <SkinPreview item={item} showCardFace={item.category === "cardBack"} />
          <small>{item.name}</small>
        </span>
      ))}
    </div>
  );
}

function HomeDashboard({
  activityCount,
  balance,
  currentUserId,
  leaderboard,
  leaderboardMessage,
  remainingAds,
  onGoTo,
  onOpenProfile,
  onSelectGame,
  onSelectOnlineGame,
}: {
  activityCount: number;
  balance: number;
  currentUserId: string | null;
  leaderboard: LeaderboardEntry[];
  leaderboardMessage: string;
  remainingAds: number;
  onGoTo: (section: MainSection) => void;
  onOpenProfile: (player: LeaderboardEntry) => void;
  onSelectGame: (game: CasinoGame) => void;
  onSelectOnlineGame: (game: OnlineRoomType) => void;
}) {
  const topPlayers = leaderboard.slice(0, 5);

  return (
    <section className={styles.lobby} aria-label="Lobby casino fictif">
      <div className={styles.lobbyTop}>
        <LobbyHero onPlay={() => onSelectGame("slots")} onTournaments={() => onGoTo("missions")} />

        <aside className={styles.lobbySideColumn} aria-label="Classement et activite">
          <LobbyLeaderboard currentUserId={currentUserId} entries={topPlayers} message={leaderboardMessage} onOpenProfile={onOpenProfile} />
          <LobbySocialFeed activityCount={activityCount} entries={topPlayers} onGoTo={onGoTo} />
        </aside>
      </div>

      <PopularGames onSelectGame={onSelectGame} onSelectOnlineGame={onSelectOnlineGame} onGoTo={onGoTo} />
      <LobbyTournaments onGoTo={onGoTo} onSelectOnlineGame={onSelectOnlineGame} />
      <RewardStrip remainingAds={remainingAds} onGoTo={onGoTo} />
      <LobbyPromoGrid onGoTo={onGoTo} onSelectOnlineGame={onSelectOnlineGame} />
      <LobbyStats activityCount={activityCount} balance={balance} leaderboardCount={leaderboard.length} remainingAds={remainingAds} />
    </section>
  );
}

function AnimatedMedia({
  assetId,
  children,
  className = "",
  label,
  style,
}: {
  assetId: AnimationAssetId;
  children?: ReactNode;
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  const asset = getAnimationAsset(assetId);

  if (!asset) {
    return null;
  }

  return (
    <div
      className={`${styles.animatedMedia} ${className}`}
      data-animatable-id={asset.id}
      data-aspect={asset.aspect}
      data-animation-trigger={asset.trigger}
      data-animation-prompt={asset.prompt}
      role="img"
      aria-label={label ?? asset.title}
      style={style}
    >
      <img
        alt=""
        aria-hidden="true"
        className={styles.animatedMediaImage}
        loading={asset.id === "hero-duel-16x9" ? "eager" : "lazy"}
        src={asset.image}
      />
      {children}
    </div>
  );
}

function LobbyHero({ onPlay, onTournaments }: { onPlay: () => void; onTournaments: () => void }) {
  return (
    <section className={styles.lobbyHero}>
      <AnimatedMedia assetId="hero-duel-16x9" className={styles.heroBackdrop} label="Duel casino premium" />
      <div className={styles.heroContent}>
        <p className={styles.heroSafety}>Sans argent réel</p>
        <h2>
          Joue. Defie.
          <span>Deviens une legende.</span>
        </h2>
        <p>Affronte tes amis, grimpe au classement et debloque des skins sans argent reel.</p>
        <div className={styles.heroActions}>
          <button className={styles.primaryButton} type="button" onClick={onPlay}>
            Jouer
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onTournaments}>
            Voir les tournois
          </button>
        </div>
      </div>
    </section>
  );
}

function PopularGames({
  onGoTo,
  onSelectGame,
  onSelectOnlineGame,
}: {
  onGoTo: (section: MainSection) => void;
  onSelectGame: (game: CasinoGame) => void;
  onSelectOnlineGame: (game: OnlineRoomType) => void;
}) {
  const gameCards: Array<{
    title: string;
    subtitle: string;
    assetId?: AnimationAssetId;
    tone: string;
    onClick: () => void;
  }> = [
    {
      title: "Dragon Spin",
      subtitle: "Slots",
      assetId: "dragon-spin-card-9x16",
      tone: "#ffb629",
      onClick: () => onSelectGame("slots"),
    },
    {
      title: "Blackjack",
      subtitle: "Live",
      assetId: "blackjack-card-9x16",
      tone: "#33df8d",
      onClick: () => onSelectGame("blackjack"),
    },
    {
      title: "Roulette",
      subtitle: "European",
      assetId: "roulette-card-9x16",
      tone: "#ff4f4f",
      onClick: () => onSelectGame("roulette"),
    },
    {
      title: "Battle Poker",
      subtitle: "VS",
      assetId: "battle-poker-card-9x16",
      tone: "#9a4cff",
      onClick: () => onSelectOnlineGame("poker"),
    },
    {
      title: "Gems Quest",
      subtitle: "Cases",
      assetId: "gems-quest-card-9x16",
      tone: "#36b7ff",
      onClick: () => onGoTo("cases"),
    },
  ];

  return (
    <section className={styles.lobbySection} aria-labelledby="popular-games-title">
      <div className={styles.lobbySectionHeader}>
        <h2 id="popular-games-title">Jeux populaires</h2>
        <button type="button" onClick={() => onGoTo("games")}>
          Voir tous les jeux
        </button>
      </div>
      <div className={styles.popularGames}>
        {gameCards.map((card) => (
          <button className={styles.lobbyGameCard} key={card.title} type="button" onClick={card.onClick} style={{ "--game-card-tone": card.tone } as CSSProperties}>
            {card.assetId ? (
              <AnimatedMedia assetId={card.assetId} className={styles.lobbyGameArt} />
            ) : (
              <span className={`${styles.lobbyGameArt} ${styles.lobbyGameArtStatic}`} aria-hidden="true">
              </span>
            )}
            <strong>{card.title}</strong>
            <span>{card.subtitle}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LobbyLeaderboard({
  currentUserId,
  entries,
  message,
  onOpenProfile,
}: {
  currentUserId: string | null;
  entries: LeaderboardEntry[];
  message: string;
  onOpenProfile: (entry: LeaderboardEntry) => void;
}) {
  return (
    <section className={styles.lobbyLeaderboard} aria-label="Classement global">
      <div className={styles.lobbyPanelHeader}>
        <h2>Classement</h2>
        <span>Semaine</span>
      </div>
      <ol>
        {entries.map((entry, index) => (
          <li className={entry.uid === currentUserId ? styles.lobbyCurrentPlayer : ""} key={entry.uid}>
            <button type="button" onClick={() => onOpenProfile(entry)}>
              <span className={styles.lobbyRank}>{index + 1}</span>
              <ProfileAvatar avatarSeed={entry.uid} className={styles.lobbyRankAvatar} displayName={entry.displayName} photoURL={entry.photoURL} />
              <strong>{entry.displayName}</strong>
              <em>{entry.balance.toLocaleString("fr-FR")}</em>
            </button>
          </li>
        ))}
      </ol>
      {entries.length === 0 ? <p className={styles.empty}>{message}</p> : null}
    </section>
  );
}

function LobbySocialFeed({
  activityCount,
  entries,
  onGoTo,
}: {
  activityCount: number;
  entries: LeaderboardEntry[];
  onGoTo: (section: MainSection) => void;
}) {
  const visibleEntries = entries.slice(0, 4);

  return (
    <section className={styles.lobbySocialFeed} aria-label="Chat du salon">
      <div className={styles.lobbyPanelHeader}>
        <h2>Chat du salon</h2>
        <span>{Math.max(12, entries.length * 17 + activityCount)} en ligne</span>
      </div>
      <div className={styles.lobbyChatList}>
        {visibleEntries.length === 0 ? (
          <p className={styles.empty}>Connecte-toi pour voir les joueurs actifs.</p>
        ) : (
          visibleEntries.map((entry, index) => (
            <article key={entry.uid}>
              <ProfileAvatar avatarSeed={entry.uid} className={styles.lobbyRankAvatar} displayName={entry.displayName} photoURL={entry.photoURL} />
              <p>
                <strong>{entry.displayName}</strong>
                {index === 0 ? " GG pour le top classement !" : index === 1 ? " Pret pour le prochain duel ?" : " Cette salle est active."}
              </p>
            </article>
          ))
        )}
      </div>
      <button className={styles.lobbyGhostButton} type="button" onClick={() => onGoTo("messages")}>
        Ouvrir les messages
      </button>
    </section>
  );
}

function LobbyTournaments({ onGoTo, onSelectOnlineGame }: { onGoTo: (section: MainSection) => void; onSelectOnlineGame: (game: OnlineRoomType) => void }) {
  const tournaments = [
    { title: "Coupe des legendes", detail: "Duels en 3 manches", prize: "50,000", assetId: "tournament-cup-16x9" as const, action: () => onSelectOnlineGame("duel") },
    { title: "Bataille royale", detail: "Table poker", prize: "25,000", assetId: "battle-poker-card-9x16" as const, action: () => onSelectOnlineGame("poker") },
    { title: "Mission master", detail: "Objectifs horaires", prize: "10,000", assetId: "gems-quest-card-9x16" as const, action: () => onGoTo("missions") },
  ];

  return (
    <section className={styles.lobbySection} aria-labelledby="lobby-tournaments-title">
      <div className={styles.lobbySectionHeader}>
        <h2 id="lobby-tournaments-title">Tournois</h2>
        <button type="button" onClick={() => onGoTo("online")}>
          Voir tous
        </button>
      </div>
      <div className={styles.lobbyTournaments}>
        {tournaments.map((tournament) => (
          <button key={tournament.title} type="button" onClick={tournament.action}>
            <AnimatedMedia assetId={tournament.assetId} className={styles.tournamentArt} />
            <span>
              <strong>{tournament.title}</strong>
              <small>{tournament.detail}</small>
            </span>
            <em>{tournament.prize}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function RewardStrip({ remainingAds, onGoTo }: { remainingAds: number; onGoTo: (section: MainSection) => void }) {
  return (
    <section className={styles.rewardStrip}>
      <AnimatedMedia assetId="reward-chest-16x9" className={styles.rewardArt} />
      <div>
        <h2>Recompense du jour</h2>
        <p>{remainingAds > 0 ? `${remainingAds} bonus virtuel${remainingAds > 1 ? "s" : ""} encore disponible${remainingAds > 1 ? "s" : ""}.` : "Reviens demain pour de nouveaux bonus virtuels."}</p>
      </div>
      <button className={styles.primaryButton} type="button" onClick={() => onGoTo("bonus")}>
        Recuperer
      </button>
    </section>
  );
}

function LobbyPromoGrid({ onGoTo, onSelectOnlineGame }: { onGoTo: (section: MainSection) => void; onSelectOnlineGame: (game: OnlineRoomType) => void }) {
  const promos = [
    { title: "Defie tes amis", detail: "Cree une table privee et lance un duel.", assetId: "promo-friends-16x9" as const, action: () => onSelectOnlineGame("duel") },
    { title: "Personnalise ton profil", detail: "Equipe tes skins et marque ton style.", assetId: "promo-profile-16x9" as const, action: () => onGoTo("inventory") },
    { title: "Gagne des recompenses", detail: "Bonus, coffres et fragments virtuels.", assetId: "promo-rewards-16x9" as const, action: () => onGoTo("shop") },
  ];

  return (
    <section className={styles.lobbyPromoGrid} aria-label="Actions rapides">
      {promos.map((promo) => (
        <button key={promo.title} type="button" onClick={promo.action}>
          <AnimatedMedia assetId={promo.assetId} className={styles.promoArt} />
          <span>
            <strong>{promo.title}</strong>
            <small>{promo.detail}</small>
          </span>
        </button>
      ))}
    </section>
  );
}

function LobbyStats({
  activityCount,
  balance,
  leaderboardCount,
  remainingAds,
}: {
  activityCount: number;
  balance: number;
  leaderboardCount: number;
  remainingAds: number;
}) {
  const stats = [
    { label: "Credits virtuels", value: balance.toLocaleString("fr-FR") },
    { label: "Joueurs classes", value: Math.max(leaderboardCount, 0).toLocaleString("fr-FR") },
    { label: "Alertes sociales", value: activityCount.toLocaleString("fr-FR") },
    { label: "Bonus restants", value: remainingAds.toLocaleString("fr-FR") },
  ];

  return (
    <section className={styles.lobbyStats} aria-label="Statistiques du lobby">
      {stats.map((stat) => (
        <div key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </section>
  );
}

function MissionsPanel({
  balance,
  missionState,
  missions,
  resetCountdown,
  stats,
  onClaim,
}: {
  balance: number;
  missionState: HourlyMissionState;
  missions: MissionDefinition[];
  resetCountdown: string;
  stats: MissionStats;
  onClaim: (mission: MissionDefinition) => void;
}) {
  const claimedSet = new Set(missionState.claimedMissionIds);
  const completedCount = missions.filter((mission) => claimedSet.has(mission.id)).length;

  return (
    <section className={styles.machine}>
      <div className={styles.shopHeader}>
        <div>
          <h2>Missions</h2>
          <p>5 missions renouvelees chaque heure : 2 faciles, 2 moyennes et 1 difficile.</p>
        </div>
        <div className={styles.missionHeaderStats}>
          <strong>{balance.toLocaleString("fr-FR")} credits</strong>
          <span>Reset dans {resetCountdown}</span>
        </div>
      </div>

      <div className={styles.missionSummary}>
        <span>
          <strong>{completedCount}</strong>
          missions terminees
        </span>
        <span>
          <strong>{missions.length - completedCount}</strong>
          missions restantes
        </span>
      </div>

      <div className={styles.missionGrid}>
        {missions.map((mission) => {
          const rawProgress = Math.max(0, stats[mission.metric] - (missionState.baselines[mission.metric] ?? 0));
          const progress = Math.min(mission.goal, rawProgress);
          const percent = Math.round((progress / mission.goal) * 100);
          const claimed = claimedSet.has(mission.id);
          const complete = progress >= mission.goal;
          const difficultyLabel = mission.difficulty === "easy" ? "Facile" : mission.difficulty === "medium" ? "Moyen" : "Difficile";

          return (
            <article className={`${styles.missionCard} ${styles[`mission-${mission.difficulty}`]}`} key={mission.id}>
              <div>
                <small>
                  {difficultyLabel} | +{mission.reward.toLocaleString("fr-FR")} credits
                </small>
                <h3>{mission.title}</h3>
                <p>{mission.detail}</p>
              </div>

              <div className={styles.missionProgress} aria-label={`${progress} sur ${mission.goal}`}>
                <span style={{ width: `${percent}%` }} />
              </div>

              <div className={styles.missionFooter}>
                <strong>
                  {progress}/{mission.goal}
                </strong>
                <button className={complete && !claimed ? styles.primaryButton : styles.secondaryButton} type="button" onClick={() => onClaim(mission)} disabled={!complete || claimed}>
                  {claimed ? "Reclamee" : complete ? "Reclamer" : "En cours"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RewardedAdsPanel({
  balance,
  message,
  rewardedAds,
  watching,
  onWatch,
}: {
  balance: number;
  message: string;
  rewardedAds: RewardedAdState;
  watching: boolean;
  onWatch: () => void;
}) {
  const remaining = Math.max(0, DAILY_REWARDED_AD_LIMIT - rewardedAds.watched);
  const canWatch = remaining > 0 && !watching;

  return (
    <section className={styles.machine}>
      <div className={styles.shopHeader}>
        <div>
          <h2>Bonus credits</h2>
          <p>{message}</p>
        </div>
        <strong>{balance.toLocaleString("fr-FR")} credits</strong>
      </div>

      <div className={styles.rewardedAdPanel}>
        <div>
          <span>Pub recompensee</span>
          <h3>+{REWARDED_AD_CREDITS.toLocaleString("fr-FR")} credits virtuels</h3>
          <p>Les credits sont gratuits, fictifs et sans valeur reelle.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={onWatch} disabled={!canWatch}>
          {watching ? "Pub en cours..." : remaining > 0 ? "Regarder une pub" : "Limite atteinte"}
        </button>
      </div>

      <div className={styles.rulesTable}>
        <div className={styles.ruleRow}>
          <span>Bonus du jour</span>
          <strong>
            {rewardedAds.watched}/{DAILY_REWARDED_AD_LIMIT}
          </strong>
          <small>{remaining} restant{remaining > 1 ? "s" : ""}</small>
        </div>
        <div className={styles.ruleRow}>
          <span>Recompense</span>
          <strong>+{REWARDED_AD_CREDITS}</strong>
          <small>credits virtuels</small>
        </div>
        <div className={styles.ruleRow}>
          <span>Valeur reelle</span>
          <strong>0</strong>
          <small>Aucun retrait possible</small>
        </div>
      </div>
    </section>
  );
}

function SpecialResourcePreview({ icon, theme }: { icon: string; theme: string }) {
  return (
    <div className={styles.specialResourcePreview} style={{ "--special-chest-color": theme } as CSSProperties}>
      <span>{icon}</span>
    </div>
  );
}

function InventoryGame({
  equippedSkins,
  ownedSkinIds,
  specialInventory,
  onEquip,
}: {
  equippedSkins: EquippedSkins;
  ownedSkinIds: string[];
  specialInventory: SpecialInventory;
  onEquip: (item: ShopItem) => void;
}) {
  const ownedCounts = countOwnedSkins(ownedSkinIds);
  const ownedItems = sortSkinsByRarity(SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0));
  const totalCopies = ownedSkinIds.length;
  const specialItems = SPECIAL_CHESTS.flatMap((chest) => [
    {
      id: specialTradeItemId("chest", chest.id),
      title: chest.title,
      detail: "Coffre special",
      count: specialInventory.chests[chest.id],
      theme: chest.theme,
      icon: "▣",
    },
    {
      id: specialTradeItemId("key", chest.id),
      title: chest.keyName,
      detail: "Cle de coffre",
      count: specialInventory.keys[chest.id],
      theme: chest.theme,
      icon: "◇",
    },
    {
      id: specialTradeItemId("fragment", chest.id),
      title: chest.fragmentName,
      detail: "Fragment de cle",
      count: specialInventory.fragments[chest.id],
      theme: chest.theme,
      icon: "◆",
    },
  ]).filter((item) => item.count > 0);
  const inventorySections: Array<{ title: string; category: SkinCategory }> = [
    { title: "Plinko", category: "plinkoBall" },
    { title: "Blackjack", category: "cardBack" },
    { title: "Roulette", category: "rouletteBall" },
    { title: "Rocket Games", category: "rocketShip" },
  ];

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Inventaire</h2>
            <p>Tous tes skins obtenus, avec les doublons accumules par les ouvertures de caisses.</p>
          </div>
          <strong>
            {totalCopies.toLocaleString("fr-FR")} skin{totalCopies > 1 ? "s" : ""} au total
          </strong>
        </div>

        <div className={styles.inventoryStats}>
          <span>
            <strong>{ownedItems.length}</strong>
            modeles differents
          </span>
          <span>
            <strong>{Math.max(0, totalCopies - ownedItems.length)}</strong>
            doublons gardes
          </span>
          <span>
            <strong>{SHOP_ITEMS.length}</strong>
            skins disponibles
          </span>
        </div>
      </section>

      <div className={styles.inventorySections}>
        {inventorySections.map((section) => {
          const sectionItems = sortSkinsByRarity(SHOP_ITEMS.filter((item) => item.category === section.category && ownedCounts[item.id] > 0));
          const sectionCopies = sectionItems.reduce((sum, item) => sum + ownedCounts[item.id], 0);

          return (
            <section className={styles.panel} key={section.category}>
              <div className={styles.inventorySectionHeader}>
                <div>
                  <h2>{section.title}</h2>
                  <p>{sectionCopies} exemplaire{sectionCopies > 1 ? "s" : ""}</p>
                </div>
                <small>{skinCategoryLabel(section.category)}</small>
              </div>

              <div className={styles.inventoryGrid}>
                {sectionItems.map((item) => {
                  const equipped = equippedSkins[item.category] === item.id;
                  const count = ownedCounts[item.id];

                  return (
                    <article className={`${styles.inventoryItem} ${styles[`rarity-${item.rarity}`]}`} key={item.id}>
                      <div className={styles.inventoryPreview}>
                        <SkinPreview item={item} large />
                        <span className={styles.inventoryCount}>x{count}</span>
                      </div>
                      <div>
                        <small>{rarityLabel(item.rarity)}</small>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                      </div>
                      <button className={equipped ? styles.secondaryButton : styles.primaryButton} type="button" onClick={() => onEquip(item)} disabled={equipped}>
                        {equipped ? "Equipe" : "Equiper"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        <section className={styles.panel}>
          <div className={styles.inventorySectionHeader}>
            <div>
              <h2>Ressources speciales</h2>
              <p>{specialItems.reduce((sum, item) => sum + item.count, 0)} objet{specialItems.length > 1 ? "s" : ""}</p>
            </div>
            <small>Coffres, cles, fragments</small>
          </div>

          <div className={styles.inventoryGrid}>
            {specialItems.length === 0 ? (
              <p className={styles.empty}>Aucune ressource speciale pour le moment.</p>
            ) : (
              specialItems.map((item) => (
                <article className={`${styles.inventoryItem} ${styles["rarity-rare"]}`} key={item.id}>
                  <div className={styles.inventoryPreview}>
                    <SpecialResourcePreview icon={item.icon} theme={item.theme} />
                    <span className={styles.inventoryCount}>x{item.count}</span>
                  </div>
                  <div>
                    <small>{item.detail}</small>
                    <h3>{item.title}</h3>
                    <p>Utilisable dans les coffres speciaux et les echanges.</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ShopGame({
  balance,
  equippedSkins,
  message,
  ownedSkinIds,
  priceOverrides,
  specialInventory,
  onAction,
  onBuySpecialChest,
}: {
  balance: number;
  equippedSkins: EquippedSkins;
  message: string;
  ownedSkinIds: string[];
  priceOverrides: AdminPriceOverrides;
  specialInventory: SpecialInventory;
  onAction: (item: ShopItem) => void;
  onBuySpecialChest: (chestId: SpecialChestId) => void;
}) {
  const shopSections: Array<{ title: string; subtitle: string; category: ShopItem["category"] }> = [
    {
      title: "Plinko",
      subtitle: "Billes visibles pendant la descente physique.",
      category: "plinkoBall",
    },
    {
      title: "Blackjack",
      subtitle: "Dos de cartes purement cosmetiques.",
      category: "cardBack",
    },
    {
      title: "Roulette",
      subtitle: "Billes de roulette plus faciles a suivre.",
      category: "rouletteBall",
    },
    {
      title: "Rocket Games",
      subtitle: "Fusions visuelles pour la fusee en plein vol.",
      category: "rocketShip",
    },
  ];

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Boutique cosmetique</h2>
            <p>{message}</p>
          </div>
          <strong>{balance.toLocaleString("fr-FR")} credits disponibles</strong>
        </div>
        <div className={styles.shopSections}>
          {shopSections.map((section) => (
            <section className={styles.shopSection} key={section.category}>
              <header className={styles.shopSectionHeader}>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.subtitle}</p>
                </div>
                <small>{skinCategoryLabel(section.category)}</small>
              </header>
              <div className={styles.shopGrid}>
                {sortSkinsByRarity(SHOP_ITEMS.filter((item) => item.category === section.category && item.source !== "special")).map((item) => {
                  const ownedCount = ownedSkinIds.filter((skinId) => skinId === item.id).length;
                  const itemPrice = priceOverrides.skins[item.id] ?? item.price;

                  return (
                    <article className={styles.shopItem} key={item.id}>
                      <div className={styles.shopPreview}>
                        <SkinPreview item={item} showCardFace />
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <small>{rarityLabel(item.rarity)}</small>
                      </div>
                      <footer className={styles.shopFooter}>
                        <strong>{itemPrice === 0 ? "Inclus" : `${itemPrice} credits`}</strong>
                        {ownedCount > 0 ? <small>{ownedCount} possede{ownedCount > 1 ? "s" : ""}</small> : null}
                        <button className={styles.primaryButton} type="button" onClick={() => onAction(item)} disabled={balance < itemPrice}>
                          Acheter
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Coffres speciaux</h2>
            <p>Achete les coffres ici. Les cles se gagnent dans la machine a pince.</p>
          </div>
        </div>
        <div className={styles.shopGrid}>
          {SPECIAL_CHESTS.map((chest) => (
            <article className={styles.shopItem} key={chest.id}>
              <SpecialChestPreview chest={chest} />
              <SpecialChestRewards chest={chest} />
              <div>
                <h3>{chest.title}</h3>
                <p>{chest.subtitle}</p>
                <small>
                  Possedes : {specialInventory.chests[chest.id]} | Cle : {specialInventory.keys[chest.id]} | Fragments :{" "}
                  {specialInventory.fragments[chest.id]}
                </small>
              </div>
              <footer className={styles.shopFooter}>
                <strong>{priceOverrides.chests[chest.id] ?? chest.price} credits</strong>
                <button className={styles.primaryButton} type="button" onClick={() => onBuySpecialChest(chest.id)} disabled={balance < (priceOverrides.chests[chest.id] ?? chest.price)}>
                  Acheter coffre
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.panel}>
        <h2>Transparence</h2>
        <p>
          Les skins modifient seulement l'apparence. Ils n'augmentent ni les gains, ni les probabilites,
          ni les multiplicateurs.
        </p>
      </section>
    </>
  );
}

function ClawGame({
  balance,
  history,
  message,
  paused,
  specialInventory,
  onPlay,
}: {
  balance: number;
  history: ClawOutcome[];
  message: string;
  paused: boolean;
  specialInventory: SpecialInventory;
  onPlay: (chestId?: SpecialChestId) => ClawOutcome | null;
}) {
  const [clawPosition, setClawPosition] = useState(50);
  const [dropping, setDropping] = useState(false);
  const [grabbedBall, setGrabbedBall] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ outcome: ClawOutcome; x: number; theme: string } | null>(null);
  const clawBalls = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const chest = SPECIAL_CHESTS[index % SPECIAL_CHESTS.length];
        const row = Math.floor(index / 11);
        const column = index % 11;
        const rowOffset = row % 2 === 0 ? 0 : 4;

        return {
          chest,
          left: 8 + column * 8.5 + rowOffset,
          size: 34 + ((index + row) % 3) * 4,
          bottom: 18 + row * 30 + (column % 2) * 4,
        };
      }),
    [],
  );

  function moveClaw(direction: -1 | 1) {
    if (dropping) {
      return;
    }

    setClawPosition((current) => Math.min(90, Math.max(10, current + direction * 8)));
  }

  function dropClaw() {
    if (dropping || paused || balance < CLAW_COST) {
      return;
    }

    const candidateBalls = clawBalls
      .map((ball, index) => ({ ball, index, distance: Math.abs(ball.left - clawPosition) }))
      .filter((candidate) => candidate.distance <= 13)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 8);
    const pool = candidateBalls.length > 0 ? candidateBalls : clawBalls.map((ball, index) => ({ ball, index, distance: 99 }));
    const weightedPool = pool.flatMap((candidate) => {
      const distanceWeight = Math.max(1, 7 - Math.round(candidate.distance));
      const layerWeight = Math.max(1, Math.round(candidate.ball.bottom / 22));

      return Array.from({ length: distanceWeight + layerWeight }, () => candidate);
    });
    const selectedCandidate = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    const closestBallIndex = selectedCandidate.index;

    setDropping(true);
    setReveal(null);
    window.setTimeout(() => setGrabbedBall(closestBallIndex), 520);
    window.setTimeout(() => {
      const ball = clawBalls[closestBallIndex];
      const outcome = onPlay(ball.chest.id);

      if (outcome) {
        setReveal({ outcome, x: ball.left, theme: ball.chest.theme });
      }
    }, 880);
    window.setTimeout(() => {
      setDropping(false);
      setGrabbedBall(null);
    }, 1450);
    window.setTimeout(() => setReveal(null), 2850);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveClaw(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveClaw(1);
      }

      if (event.key === "ArrowDown" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        dropClaw();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.shopHeader}>
          <div>
            <h2>Machine a pince</h2>
            <p>{message}</p>
          </div>
          <strong>{CLAW_COST} credits / tentative</strong>
        </div>
        <div className={styles.clawStage}>
          <div className={styles.clawMachine} tabIndex={0} aria-label="Machine a pince">
            <div
              className={`${styles.clawCarriage} ${dropping ? styles.clawCarriageDropping : ""}`}
              style={{ "--claw-x": `${clawPosition}%` } as CSSProperties}
            >
              <span className={styles.clawRail} />
              <span className={styles.clawCable} />
              <span className={styles.clawBody} />
              <span className={styles.clawGripLeft} />
              <span className={styles.clawGripRight} />
            </div>
            {clawBalls.map((ball, index) => (
              <span
                className={`${styles.clawPrize} ${grabbedBall === index ? styles.clawPrizeGrabbed : ""}`}
                key={`${ball.chest.id}-${index}`}
                style={
                  {
                    "--special-chest-color": ball.chest.theme,
                    "--ball-left": `${ball.left}%`,
                    "--ball-size": `${ball.size}px`,
                    "--ball-bottom": `${ball.bottom}px`,
                    "--claw-x": `${clawPosition}%`,
                  } as CSSProperties
                }
              />
            ))}
            {reveal && (
              <div
                className={styles.clawReveal}
                style={{ "--reveal-x": `${reveal.x}%`, "--special-chest-color": reveal.theme } as CSSProperties}
              >
                <span className={styles.clawRevealBall} />
                <span className={styles.clawRevealHalfLeft} />
                <span className={styles.clawRevealHalfRight} />
                <strong>
                  {reveal.outcome.rewardType === "credits" && `+${reveal.outcome.amount}`}
                  {reveal.outcome.rewardType === "fragments" && (
                    <>
                      {Array.from({ length: reveal.outcome.amount }, (_, index) => (
                        <i className={styles.clawFragmentIcon} key={index} />
                      ))}
                    </>
                  )}
                  {reveal.outcome.rewardType === "key" && <i className={styles.clawKeyIcon} />}
                </strong>
                <small>{reveal.outcome.label}</small>
              </div>
            )}
          </div>
          <div className={styles.clawControls}>
            <button className={styles.secondaryButton} type="button" onClick={() => moveClaw(-1)} disabled={dropping} aria-label="Deplacer la pince vers la gauche">
              <span aria-hidden="true">←</span>
            </button>
            <button className={styles.primaryButton} type="button" onClick={dropClaw} disabled={dropping || paused || balance < CLAW_COST}>
              {dropping ? "La pince descend..." : "Descendre la pince"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => moveClaw(1)} disabled={dropping} aria-label="Deplacer la pince vers la droite">
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Ressources speciales</h2>
          <div className={styles.rulesTable}>
            {SPECIAL_CHESTS.map((chest) => (
              <div className={styles.ruleRow} key={chest.id}>
                <span>{chest.title}</span>
                <strong>{specialInventory.keys[chest.id]} cle(s)</strong>
                <small>
                  {specialInventory.fragments[chest.id]}/{KEY_FRAGMENTS_REQUIRED} fragments | {specialInventory.chests[chest.id]} coffre(s)
                </small>
              </div>
            ))}
          </div>
        </article>
        <HistoryPanel title="10 dernieres pinces" empty="Aucune tentative pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <small>
                {item.rewardType === "credits" ? "Credits" : getSpecialChestDefinition(item.chestId).title} | solde {item.balanceAfter}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function RocketGame({
  animating,
  bet,
  canLaunch,
  flight,
  history,
  message,
  paused,
  shipSkin,
  target,
  onBetChange,
  onLaunch,
  onTargetChange,
}: {
  animating: boolean;
  bet: Bet;
  canLaunch: boolean;
  flight: RocketOutcome | null;
  history: RocketHistoryItem[];
  message: string;
  paused: boolean;
  shipSkin: ShopItem;
  target: RocketTarget;
  onBetChange: (bet: Bet) => void;
  onLaunch: () => void;
  onTargetChange: (target: RocketTarget) => void;
}) {
  const targetProbability = getRocketSuccessProbability(target);
  const displayedMultiplier = flight?.crashMultiplier ?? target;
  const normalizedFlightHeight = Math.max(0, Math.min(1, (displayedMultiplier - 0.5) / (ROCKET_MAX_TARGET - 0.5)));
  const rocketStartLeft = 18;
  const rocketStartBottom = 42;
  const rocketEndLeft = 28 + normalizedFlightHeight * 56;
  const rocketEndBottom = 52 + normalizedFlightHeight * 360;
  const rocketTrailEndBottom = Math.max(32, rocketEndBottom - 60);
  const rocketPoint = (start: number, end: number, progress: number) => start + (end - start) * progress;
  const rocketTicks = Array.from({ length: 10 }, (_, index) => 0.5 + index * 0.5);
  const rocketSceneStyle = {
    "--rocket-mid-left-1": `${rocketPoint(rocketStartLeft, rocketEndLeft, 0.25)}%`,
    "--rocket-mid-left-2": `${rocketPoint(rocketStartLeft, rocketEndLeft, 0.55)}%`,
    "--rocket-mid-left-3": `${rocketPoint(rocketStartLeft, rocketEndLeft, 0.82)}%`,
    "--rocket-end-left": `${rocketEndLeft}%`,
    "--rocket-mid-bottom-1": `${rocketPoint(rocketStartBottom, rocketEndBottom, 0.25)}px`,
    "--rocket-mid-bottom-2": `${rocketPoint(rocketStartBottom, rocketEndBottom, 0.55)}px`,
    "--rocket-mid-bottom-3": `${rocketPoint(rocketStartBottom, rocketEndBottom, 0.82)}px`,
    "--rocket-end-bottom": `${rocketEndBottom}px`,
    "--rocket-trail-mid-bottom-1": `${rocketPoint(28, rocketTrailEndBottom, 0.25)}px`,
    "--rocket-trail-mid-bottom-2": `${rocketPoint(28, rocketTrailEndBottom, 0.55)}px`,
    "--rocket-trail-mid-bottom-3": `${rocketPoint(28, rocketTrailEndBottom, 0.82)}px`,
    "--rocket-trail-end-bottom": `${rocketTrailEndBottom}px`,
    "--rocket-trail-height": `${Math.max(48, rocketEndBottom - 24)}px`,
    "--rocket-path-length": `${170 + normalizedFlightHeight * 260}px`,
    "--rocket-path-angle": `${-18 - normalizedFlightHeight * 24}deg`,
  } as CSSProperties;

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.rocketStage}>
          <div className={styles.rocketAltitudeTrack} style={rocketSceneStyle}>
            <div className={styles.rocketScale} aria-hidden="true">
              {rocketTicks.map((tick) => (
                <span key={tick} style={{ bottom: `${((tick - 0.5) / 4.5) * 100}%` }}>
                  {formatMultiplier(tick)}
                </span>
              ))}
            </div>
            <div className={animating ? `${styles.rocketPathLine} ${styles.rocketPathLineFlying}` : styles.rocketPathLine} />
            <div className={animating ? `${styles.rocketTrail} ${styles.rocketTrailFlying}` : styles.rocketTrail} />
            <RocketShipArtwork
              id={shipSkin.id}
              className={animating ? `${styles.rocketCraft} ${styles.rocketCraftFlying}` : styles.rocketCraft}
              style={{ "--rocket-accent": shipSkin.preview } as CSSProperties}
            />
          </div>
          <div className={styles.rocketMetrics}>
            <span>Cible</span>
            <strong>{formatMultiplier(target)}</strong>
            <span>Retombee simulée</span>
            <strong>{formatMultiplier(displayedMultiplier)}</strong>
          </div>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.controls}>
          <label htmlFor="rocketBet">Mise virtuelle</label>
          <BetAmountInput id="rocketBet" value={bet} onChange={onBetChange} />
          <label htmlFor="rocketTarget">Cible</label>
          <input
            id="rocketTarget"
            type="number"
            value={target}
            min={ROCKET_MIN_TARGET}
            max={ROCKET_MAX_TARGET}
            step="0.1"
            onChange={(event) =>
              onTargetChange((event.target.value === "" ? ROCKET_MIN_TARGET : Number(event.target.value)) as RocketTarget)
            }
            onBlur={() => onTargetChange(normalizeRocketTarget(target))}
            disabled={animating}
          />
          <button className={styles.primaryButton} type="button" onClick={onLaunch} disabled={paused || !canLaunch || animating}>
            Lancer
          </button>
        </div>

        {paused && (
          <div className={styles.pausePanel} role="status">
            Pause active. Rocket Games reste une simulation gratuite en credits virtuels.
          </div>
        )}
      </section>

      <section className={styles.columns}>
        <article className={styles.panel}>
          <h2>Regles Rocket Games</h2>
          <p>
            Tu choisis une cible entre x2.0 et x5.0. La fusee recoit une retombee theorique entre x1.0 et x5.0.
            Si elle atteint la cible, le paiement vaut mise × cible.
          </p>
          <p>
            Pour la cible active {formatMultiplier(target)}, la probabilite theorique de succes est de
            {" "}{(targetProbability * 100).toFixed(0)} %. Aucun gain reel n'est possible.
          </p>
        </article>

        <HistoryPanel title="10 derniers vols" empty="Aucun lancement pour le moment.">
          {history.map((item) => (
            <li key={item.id}>
              <span>
                cible {formatMultiplier(item.target)} | retombee {formatMultiplier(item.crashMultiplier)}
              </span>
              <small>
                mise {item.bet} | {item.net >= 0 ? "+" : ""}
                {formatCredits(item.net)} | solde {formatCredits(item.balanceAfter)}
              </small>
            </li>
          ))}
        </HistoryPanel>
      </section>
    </>
  );
}

function HistoryPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <article className={styles.panel}>
      <h2>{title}</h2>
      {children.length === 0 ? <p className={styles.empty}>{empty}</p> : <ol className={styles.history}>{children}</ol>}
    </article>
  );
}

function formatHand(hand: readonly Card[]): string {
  return hand.map((card) => `${card.rank}${card.suit}`).join(" ");
}

function formatRouletteColor(color: RouletteOutcome["color"]): string {
  if (color === "red") {
    return "rouge";
  }

  if (color === "black") {
    return "noir";
  }

  return "vert";
}

type BlackjackSkinImages = {
  back: string;
  art: string;
};

const ROCKET_SHIP_ATLAS_IMAGE = new URL("./assets/rocket/rocket-ships-atlas.png", import.meta.url).href;
const SPECIAL_CHEST_ATLAS_IMAGE = new URL("./assets/chests/special-chests-atlas.png", import.meta.url).href;

const BLACKJACK_SKIN_IMAGES: Record<string, BlackjackSkinImages> = {
  "cards-aqua": {
    back: new URL("./assets/blackjack/cards-aqua-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-aqua-art.png", import.meta.url).href,
  },
  "cards-club": {
    back: new URL("./assets/blackjack/cards-club-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-club-art.png", import.meta.url).href,
  },
  "cards-emerald": {
    back: new URL("./assets/blackjack/cards-emerald-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-emerald-art.png", import.meta.url).href,
  },
  "cards-linen": {
    back: new URL("./assets/blackjack/cards-linen-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-linen-art.png", import.meta.url).href,
  },
  "cards-midnight": {
    back: new URL("./assets/blackjack/cards-midnight-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-midnight-art.png", import.meta.url).href,
  },
  "cards-obsidian": {
    back: new URL("./assets/blackjack/cards-obsidian-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-obsidian-art.png", import.meta.url).href,
  },
  "cards-royal": {
    back: new URL("./assets/blackjack/cards-royal-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-royal-art.png", import.meta.url).href,
  },
  "cards-ruby": {
    back: new URL("./assets/blackjack/cards-ruby-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-ruby-art.png", import.meta.url).href,
  },
  "cards-silver": {
    back: new URL("./assets/blackjack/cards-silver-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-silver-art.png", import.meta.url).href,
  },
  "cards-sunset": {
    back: new URL("./assets/blackjack/cards-sunset-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-sunset-art.png", import.meta.url).href,
  },
  "cards-joker-neon": {
    back: new URL("./assets/blackjack/cards-joker-neon-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-joker-neon-art.png", import.meta.url).href,
  },
  "cards-crown-night": {
    back: new URL("./assets/blackjack/cards-crown-night-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-crown-night-art.png", import.meta.url).href,
  },
  "cards-gilded-mask": {
    back: new URL("./assets/blackjack/cards-gilded-mask-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-gilded-mask-art.png", import.meta.url).href,
  },
  "cards-ace-vault": {
    back: new URL("./assets/blackjack/cards-ace-vault-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-ace-vault-art.png", import.meta.url).href,
  },
  "cards-joker-gold": {
    back: new URL("./assets/blackjack/cards-joker-gold-back.png", import.meta.url).href,
    art: new URL("./assets/blackjack/art/cards-joker-gold-art.png", import.meta.url).href,
  },
};

function blackjackSkinImages(id: string): BlackjackSkinImages | undefined {
  return BLACKJACK_SKIN_IMAGES[id];
}

function ShopAtlasSprite({
  image,
  cell,
  columns,
  rows,
  className = "",
  style,
}: {
  image: string;
  cell: AtlasCell;
  columns: number;
  rows: number;
  className?: string;
  style?: CSSProperties;
}) {
  const spriteStyle = {
    ...style,
    "--shop-atlas-image-width": `${columns * 100}%`,
    "--shop-atlas-image-height": `${rows * 100}%`,
    "--shop-atlas-translate-x": cell.translateX,
    "--shop-atlas-translate-y": cell.translateY,
  } as CSSProperties;

  return (
    <span className={`${styles.shopAtlasSprite} ${className}`} style={spriteStyle} aria-hidden="true">
      <img className={styles.shopAtlasSpriteImage} src={image} alt="" draggable={false} />
    </span>
  );
}

function RocketShipArtwork({
  id,
  className = "",
  large = false,
  style,
}: {
  id: string;
  className?: string;
  large?: boolean;
  style?: CSSProperties;
}) {
  const cell = getRocketShipArtCell(id);

  if (!cell) {
    return null;
  }

  return (
    <ShopAtlasSprite
      image={ROCKET_SHIP_ATLAS_IMAGE}
      cell={cell}
      columns={ROCKET_SHIP_ATLAS_COLUMNS}
      rows={ROCKET_SHIP_ATLAS_ROWS}
      className={`${styles.rocketShipSprite} ${large ? styles.rocketShipSpriteLarge : ""} ${className}`}
      style={{ ...style, "--rocket-glow": rocketGlow(id) } as CSSProperties}
    />
  );
}

function SpecialChestArtwork({ chestId }: { chestId: SpecialChestId }) {
  return (
    <ShopAtlasSprite
      image={SPECIAL_CHEST_ATLAS_IMAGE}
      cell={getSpecialChestArtCell(chestId)}
      columns={SPECIAL_CHEST_ATLAS_COLUMNS}
      rows={SPECIAL_CHEST_ATLAS_ROWS}
      className={styles.specialChestImage}
    />
  );
}

function blackjackSkinImageStyle(id: string): CSSProperties {
  const image = blackjackSkinImages(id)?.back;

  return image ? ({ "--blackjack-skin-image": `url(${image})` } as CSSProperties) : {};
}

function cardBackClass(id: string): string {
  if (id === "cards-linen") {
    return styles.cardBackLinen;
  }

  if (id === "cards-club") {
    return styles.cardBackClub;
  }

  if (id === "cards-ruby") {
    return styles.cardBackRuby;
  }

  if (id === "cards-silver") {
    return styles.cardBackSilver;
  }

  if (id.includes("joker")) {
    return styles.cardBackJoker;
  }

  if (id.includes("crown")) {
    return styles.cardBackCrown;
  }

  if (id.includes("mask")) {
    return styles.cardBackMask;
  }

  if (id.includes("ace")) {
    return styles.cardBackAce;
  }

  if (id === "cards-midnight") {
    return styles.cardBackMidnight;
  }

  if (id === "cards-royal") {
    return styles.cardBackRoyal;
  }

  if (id === "cards-sunset") {
    return styles.cardBackSunset;
  }

  if (id === "cards-obsidian") {
    return styles.cardBackObsidian;
  }

  if (id === "cards-aqua") {
    return styles.cardBackAqua;
  }

  return styles.cardBackEmerald;
}

function cardFaceClass(id: string): string {
  if (id === "cards-linen") {
    return styles.cardFaceLinen;
  }

  if (id === "cards-club") {
    return styles.cardFaceClub;
  }

  if (id === "cards-ruby") {
    return styles.cardFaceRuby;
  }

  if (id === "cards-silver") {
    return styles.cardFaceSilver;
  }

  if (id === "cards-midnight") {
    return styles.cardFaceMidnight;
  }

  if (id === "cards-royal") {
    return styles.cardFaceRoyal;
  }

  if (id === "cards-sunset") {
    return styles.cardFaceSunset;
  }

  if (id === "cards-obsidian") {
    return styles.cardFaceObsidian;
  }

  if (id === "cards-aqua") {
    return styles.cardFaceAqua;
  }

  return styles.cardFaceEmerald;
}

function cardSkinSuit(id: string): string {
  if (id === "cards-linen" || id === "cards-ruby" || id === "cards-silver" || id === "cards-aqua") {
    return "♦";
  }

  if (id === "cards-club") {
    return "♣";
  }

  if (id === "cards-midnight") {
    return "☾";
  }

  if (id === "cards-royal") {
    return "♥";
  }

  if (id === "cards-sunset") {
    return "☀";
  }

  return "♠";
}

function ballGlow(id: string): string {
  if (id.includes("neon")) {
    return "rgba(121, 226, 159, 0.9)";
  }

  if (id.includes("ruby")) {
    return "rgba(255, 107, 107, 0.9)";
  }

  if (id.includes("sapphire")) {
    return "rgba(124, 199, 255, 0.9)";
  }

  if (id.includes("sun")) {
    return "rgba(255, 209, 102, 0.92)";
  }

  if (id.includes("ocean")) {
    return "rgba(94, 184, 241, 0.92)";
  }

  if (id.includes("lilac") || id.includes("violet")) {
    return "rgba(181, 140, 255, 0.92)";
  }

  if (id.includes("mint") || id.includes("jade") || id.includes("emerald")) {
    return "rgba(156, 243, 211, 0.92)";
  }

  if (id.includes("rose")) {
    return "rgba(255, 143, 177, 0.92)";
  }

  return "rgba(249, 247, 239, 0.75)";
}

function rocketGlow(id: string): string {
  if (id === "rocket-comet" || id === "rocket-ion-wing" || id === "rocket-blackbird") {
    return "rgba(124, 199, 255, 0.88)";
  }

  if (id === "rocket-solar" || id === "rocket-starlancer") {
    return "rgba(255, 209, 102, 0.88)";
  }

  if (id === "rocket-nebula" || id === "rocket-eclipse") {
    return "rgba(249, 247, 239, 0.92)";
  }

  if (id === "rocket-capsule-v" || id === "rocket-orbital-x") {
    return "rgba(121, 226, 159, 0.9)";
  }

  if (id === "rocket-redcap") {
    return "rgba(255, 107, 107, 0.86)";
  }

  if (id === "rocket-cargo") {
    return "rgba(255, 209, 102, 0.82)";
  }

  return "rgba(249, 247, 239, 0.72)";
}

function formatMultiplier(value: number): string {
  return `x${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function formatCredits(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function SkinPreview({ item, large = false, showCardFace = false }: { item: ShopItem; large?: boolean; showCardFace?: boolean }) {
  if (item.category === "cardBack") {
    const images = blackjackSkinImages(item.id);

    if (images) {
      return (
        <span
          className={showCardFace ? styles.blackjackSkinPairPreview : large ? styles.blackjackSkinBackPreviewLarge : styles.blackjackSkinBackPreview}
          aria-hidden="true"
        >
          {showCardFace ? (
            <>
              <ThemedBlackjackCard card={{ rank: "K", suit: "♠" }} skinId={item.id} preview />
              <img src={images.back} alt="" />
            </>
          ) : (
            <img src={images.back} alt="" />
          )}
        </span>
      );
    }

    if (!showCardFace) {
      return (
        <span
          className={`${large ? styles.caseCardBackPreview : styles.shopCardPreview} ${cardBackClass(item.id)}`}
          aria-hidden="true"
        />
      );
    }

    return (
      <span
        className={large ? styles.caseCardPreviewPair : styles.shopCardPreviewPair}
        aria-hidden="true"
      >
        <span className={`${styles.shopCardMiniFace} ${cardFaceClass(item.id)}`}>
          <strong>A</strong>
          <em>{cardSkinSuit(item.id)}</em>
        </span>
        <span className={`${styles.shopCardMiniBack} ${cardBackClass(item.id)}`} />
      </span>
    );
  }

  if (item.category === "rocketShip") {
    return <RocketShipArtwork id={item.id} large={large} />;
  }

  if (item.category === "plinkoBall" || item.category === "rouletteBall") {
    const imageSource =
      item.category === "plinkoBall" ? getPlinkoBallImageSource(item.id) : getRouletteBallImageSource(item.id);

    if (imageSource) {
      return (
        <img
          className={large ? styles.caseImagePreview : styles.plinkoImagePreview}
          src={imageSource}
          style={{ "--shop-preview-glow": ballGlow(item.id) } as CSSProperties}
          alt=""
          aria-hidden="true"
        />
      );
    }
  }

  return (
    <span
      className={`${large ? styles.caseOrbPreview : styles.shopOrbPreview} ${ballSkinClass(item.id)}`}
      style={{ "--shop-preview-color": item.preview, "--shop-preview-glow": ballGlow(item.id) } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function ballSkinClass(id: string): string {
  if (id.includes("galaxy") || id.includes("starfall") || id.includes("aurora") || id.includes("supernova") || id.includes("cosmic")) {
    return styles.ballCosmic;
  }

  if (id.includes("pearl") || id.includes("cloud") || id.includes("crystal") || id.includes("opal")) {
    return styles.ballPearl;
  }

  if (id.includes("copper") || id.includes("amber")) {
    return styles.ballCopper;
  }

  if (id.includes("azure") || id.includes("comet") || id.includes("laser") || id.includes("prism")) {
    return styles.ballPrism;
  }

  if (id.includes("eclipse") || id.includes("storm")) {
    return styles.ballEclipse;
  }

  if (id.includes("neon")) {
    return styles.ballNeon;
  }

  if (id.includes("ruby")) {
    return styles.ballRuby;
  }

  if (id.includes("ocean") || id.includes("sapphire")) {
    return styles.ballOcean;
  }

  if (id.includes("lilac") || id.includes("violet")) {
    return styles.ballLilac;
  }

  if (id.includes("mint") || id.includes("jade") || id.includes("emerald")) {
    return styles.ballMint;
  }

  if (id.includes("rose")) {
    return styles.ballRose;
  }

  if (id.includes("sun")) {
    return styles.ballSun;
  }

  return styles.ballGold;
}

function rarityLabel(rarity: SkinRarity): string {
  if (rarity === "legendary") {
    return "Legendaire";
  }

  if (rarity === "epic") {
    return "Epique";
  }

  if (rarity === "rare") {
    return "Rare";
  }

  return "Commun";
}

function sortSkinsByRarity(items: readonly ShopItem[]): ShopItem[] {
  return [...items].sort((left, right) => {
    const rarityDiff = RARITY_SORT_ORDER[left.rarity] - RARITY_SORT_ORDER[right.rarity];

    if (rarityDiff !== 0) {
      return rarityDiff;
    }

    return left.name.localeCompare(right.name, "fr");
  });
}

function buildCaseReel(category: SkinCategory, winningItem: ShopItem, itemIds?: readonly string[]): ShopItem[] {
  const items = itemIds
    ? sortSkinsByRarity(itemIds.map((itemId) => SHOP_ITEMS.find((item) => item.id === itemId)).filter((item): item is ShopItem => Boolean(item)))
    : sortSkinsByRarity(SHOP_ITEMS.filter((item) => item.category === category && item.source !== "special"));

  return Array.from({ length: 44 }, (_, index) => {
    if (index === CASE_REEL_WINNER_INDEX) {
      return winningItem;
    }

    return items[index % items.length];
  });
}

function skinCategoryLabel(category: ShopItem["category"]): string {
  if (category === "plinkoBall") {
    return "Bille Plinko";
  }

  if (category === "rouletteBall") {
    return "Bille roulette";
  }

  if (category === "rocketShip") {
    return "Vehicule Rocket";
  }

  return "Dos blackjack";
}

function caseThemeClass(category: SkinCategory): string {
  if (category === "cardBack") {
    return styles.caseThemeBlackjack;
  }

  if (category === "rouletteBall") {
    return styles.caseThemeRoulette;
  }

  if (category === "rocketShip") {
    return styles.caseThemeRocket;
  }

  return styles.caseThemePlinko;
}

export default App;
