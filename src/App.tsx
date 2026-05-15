import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Bodies, Body, Composite, Engine, Runner } from "matter-js";
import styles from "./App.module.css";
import {
  BET_OPTIONS,
  INITIAL_BALANCE,
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
import {
  PLINKO_ROWS,
  calculatePlinkoPayout,
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
  answerFriendRequest,
  answerSkinTrade,
  callPokerPlayer,
  checkPokerPlayer,
  createOnlineRoom,
  createSkinTrade,
  foldPokerPlayer,
  isFirebaseConfigured,
  joinOnlineRoom,
  leaveOnlineRoom,
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
  raisePokerPlayer,
  sendFriendRequest,
  sendPrivateMessage,
  saveCloudSave,
  saveLeaderboardEntry,
  signInWithGoogle,
  signOutGoogle,
  startDuelRoom,
  startPokerRoom,
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
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  kind: "friend" | "trade" | "message" | "duel" | "poker";
  timestamp?: unknown;
};

const CASE_REEL_WINNER_INDEX = 34;
const CASE_BOX_OPEN_DURATION_MS = 1200;
const CASE_REEL_DURATION_MS = 3600;
const SAVE_KEY = "casino-fictif-save-v1";
const WAITING_ROOM_TTL_MS = 30 * 60 * 1000;
const MESSAGE_SEND_COOLDOWN_MS = 2500;
const CLAW_COST = 75;
const KEY_FRAGMENTS_REQUIRED = 9;

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

  return SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0).map((item) => ({
    id: item.id,
    count: ownedCounts[item.id],
  }));
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
  const [activeSection, setActiveSection] = useState<"games" | "online" | "cases" | "shop" | "inventory" | "friends" | "trades" | "messages" | "activity">("games");
  const [activeGame, setActiveGame] = useState<"slots" | "blackjack" | "plinko" | "roulette" | "rocket" | "claw">("slots");
  const [activeOnlineGame, setActiveOnlineGame] = useState<"duel" | "poker">("duel");
  const [paused, setPaused] = useState(false);

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
  const [rocketBet, setRocketBet] = useState<Bet>(25);
  const [rocketTarget, setRocketTarget] = useState<RocketTarget>(2);
  const [rocketMessage, setRocketMessage] = useState("Choisis une cible et lance la fusee.");
  const [rocketHistory, setRocketHistory] = useState<RocketHistoryItem[]>(savedGame?.rocketHistory ?? []);
  const [rocketAnimating, setRocketAnimating] = useState(false);
  const [rocketFlight, setRocketFlight] = useState<RocketOutcome | null>(null);
  const [accountUser, setAccountUser] = useState<CasinoUser | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState(
    isFirebaseConfigured()
      ? "Connecte-toi avec Google pour sauvegarder en ligne."
      : "Ajoute les cles Firebase pour activer les comptes Google.",
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState("Connecte-toi pour apparaitre dans le classement.");
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardEntry | null>(null);
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

  function rememberAppliedTrade(tradeApplyKey: string) {
    if (appliedTradeKeysRef.current.has(tradeApplyKey)) {
      return;
    }

    appliedTradeKeysRef.current.add(tradeApplyKey);
    const recentKeys = [...appliedTradeKeysRef.current].slice(-300);
    appliedTradeKeysRef.current = new Set(recentKeys);
    localStorage.setItem(APPLIED_TRADE_KEYS_STORAGE_KEY, JSON.stringify(recentKeys));
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
  const plinkoBetAvailable = canPlaceBet(balance, plinkoBet);
  const plinkoAnimating = activePlinkoLaunches.length > 0;
  const rouletteBetAvailable = canPlaceBet(balance, rouletteBet);
  const rocketBetAvailable = canPlaceBet(balance, rocketBet);
  const canDouble = blackjackPhase === "player" && !hasPlayerAction && balance >= activeBlackjackBet * 2;
  const activityItems = useMemo(
    () => buildActivityItems(accountUser?.uid ?? "", friendRequests, skinTrades, privateMessages, duelHistory, onlineRooms),
    [accountUser, friendRequests, skinTrades, privateMessages, duelHistory, onlineRooms],
  );
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
          await saveLeaderboardEntry(user, cloudSave.balance, buildPublicInventory(cloudSave.ownedSkinIds), cloudSave.equippedSkins);
          setAccountMessage("Sauvegarde Google chargee.");
        } else {
          const currentSave = getCurrentSaveState();
          await saveCloudSave(user.uid, currentSave);
          await saveLeaderboardEntry(user, currentSave.balance, buildPublicInventory(currentSave.ownedSkinIds), currentSave.equippedSkins);
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
        saveLeaderboardEntry(accountUser, currentSave.balance, buildPublicInventory(currentSave.ownedSkinIds), currentSave.equippedSkins),
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
  ]);

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (accountUser) {
      refreshFriendRequests(accountUser.uid);
      refreshSkinTrades(accountUser.uid);
      refreshOnlineRooms();
      refreshDuelHistory(accountUser.uid);
    }
  }, [accountUser]);

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
            setOwnedSkinIds((current) => [...current, trade.requestedItemId]);
          }
          if (trade.requestedCredits > 0) {
            setBalance((current) => current + trade.requestedCredits);
          }
          markSkinTradeApplied(trade.id, "from").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
        }

        if (isReceiver) {
          if (trade.requestedItemId && !hasSkinCopy(ownedSkinIds, trade.requestedItemId)) {
            setTradesMessage("Un echange accepte n'a pas pu etre applique : skin manquant.");
            return;
          }

          rememberAppliedTrade(tradeApplyKey);
          setOwnedSkinIds((current) => {
            const withoutRequested = trade.requestedItemId ? removeOneSkinCopy(current, trade.requestedItemId) : current;
            return trade.offeredItemId ? [...withoutRequested, trade.offeredItemId] : withoutRequested;
          });
          setBalance((current) => Math.max(0, current - trade.requestedCredits) + trade.offeredCredits);
          markSkinTradeApplied(trade.id, "to").then(() => refreshSkinTrades(accountUser.uid)).catch(() => undefined);
        }
      }

      if ((trade.status === "rejected" || trade.status === "canceled") && isSender) {
        rememberAppliedTrade(tradeApplyKey);
        if (trade.offeredItemId) {
          setOwnedSkinIds((current) => [...current, trade.offeredItemId]);
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
  }, [accountUser, ownedSkinIds, skinTrades]);

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
      setOnlineRooms(rooms);
      setOnlineMessage(rooms.length ? "Salons en ligne disponibles." : "Aucun salon ouvert pour le moment.");
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

  async function handleOpenPlayerProfile(entry: LeaderboardEntry) {
    setFriendRequestMessage("");
    setSelectedProfile(entry);
    setSelectedProfileStats(null);

    try {
      const stats = await loadDuelStats(entry.uid);
      setSelectedProfileStats(stats);
    } catch {
      setSelectedProfileStats(null);
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

  async function handleCreateOnlineRoom(type: OnlineRoomType, game: string, invitedPlayer?: OnlineRoomPlayer) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour creer un salon.");
      return;
    }

    try {
      await createOnlineRoom(accountUser, type, game, invitedPlayer);
      setOnlineMessage(invitedPlayer ? `Invitation envoyee a ${invitedPlayer.displayName}.` : type === "poker" ? "Table de poker creee." : "Salon de duel cree.");
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

  async function handlePlayDuelRound(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour jouer une manche.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await playDuelRound(room, accountUser);
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

  async function handleRaisePoker(room: OnlineRoomEntry) {
    if (!accountUser) {
      setOnlineMessage("Connecte-toi pour relancer.");
      return;
    }

    const newBet = room.pokerCurrentBet + 25;
    const amountToPay = Math.max(0, newBet - (room.pokerContributions[accountUser.uid] ?? 0));

    if (balance < amountToPay) {
      setOnlineMessage("Solde insuffisant pour relancer.");
      return;
    }

    try {
      setOnlineActionRoomId(room.id);
      await raisePokerPlayer(room, accountUser);
      setBalance((current) => current - amountToPay);
      setOnlineMessage("Relance de 25 credits enregistree.");
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
      setTradesMessage("Choisis au moins un skin ou des credits de chaque cote.");
      return false;
    }

    if (offeredItemId && !hasSkinCopy(ownedSkinIds, offeredItemId)) {
      setTradesMessage("Tu ne possedes plus ce skin.");
      return false;
    }

    if (offeredCredits > balance) {
      setTradesMessage("Tu n'as pas assez de credits pour envoyer cette offre.");
      return false;
    }

    const previousOwnedSkinIds = ownedSkinIds;
    const previousBalance = balance;
    if (offeredItemId) {
      setOwnedSkinIds((current) => removeOneSkinCopy(current, offeredItemId));
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

    if (status === "accepted" && trade.requestedItemId && !hasSkinCopy(ownedSkinIds, trade.requestedItemId)) {
      setTradesMessage("Tu n'as plus le skin demande pour accepter cet echange.");
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
  }

  function launchPlinko() {
    if (paused) {
      setPlinkoMessage("La pause responsable est active.");
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
      setRouletteSpinning(false);
    }, ROULETTE_SPIN_DURATION_MS);
  }

  function handleShopAction(item: ShopItem) {
    if (ownedSkinIds.includes(item.id)) {
      setEquippedSkins((current) => equipSkin(current, item));
      setShopMessage(`${item.name} equipe. Aucun impact sur les chances ou les gains.`);
      return;
    }

    const result = buySkin(balance, ownedSkinIds, item);

    if (!result.purchased) {
      setShopMessage("Solde virtuel insuffisant pour ce skin.");
      return;
    }

    setBalance(result.balance);
    setOwnedSkinIds(result.ownedSkinIds);
    setEquippedSkins((current) => equipSkin(current, item));
    setShopMessage(`${item.name} achete et equipe. Skin purement cosmetique.`);
  }

  function buySpecialChest(chestId: SpecialChestId) {
    const chest = getSpecialChestDefinition(chestId);

    if (balance < chest.price) {
      setShopMessage("Solde insuffisant pour acheter ce coffre special.");
      return;
    }

    setBalance((current) => current - chest.price);
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

    if (balance < definition.cost) {
      setCaseMessage(`Solde insuffisant pour ouvrir ${definition.title}.`);
      return;
    }

    const outcome = openCase(balance, ownedSkinIds, SHOP_ITEMS, selectedCase);

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
      if (!outcome.duplicate) {
        setEquippedSkins((current) => equipSkin(current, outcome.item));
      }
      setCaseMessage(outcome.duplicate ? `Doublon exclusif : ${outcome.item.name} ajoute.` : `${outcome.item.name} exclusif debloque et equipe.`);
      setCaseOpening(false);
    }, CASE_BOX_OPEN_DURATION_MS + CASE_REEL_DURATION_MS);
  }

  function playClawMachine() {
    if (paused) {
      setClawMessage("La pause responsable est active.");
      return null;
    }

    if (balance < CLAW_COST) {
      setClawMessage("Solde insuffisant pour tenter la machine a pince.");
      return null;
    }

    const chest = SPECIAL_CHESTS[Math.floor(Math.random() * SPECIAL_CHESTS.length)];
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
    setClawMessage(`${label} dans la boule.`);
    return outcome;
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
      setRocketAnimating(false);
    }, ROCKET_FLIGHT_DURATION_MS);
  }

  return (
    <main className={styles.app}>
      <section className={styles.shell} aria-label="Casino fictif">
        <header className={styles.header}>
          <div>
            <p className={styles.disclaimer}>Jeu fictif — crédits virtuels uniquement</p>
            <h1>Casino fictif</h1>
          </div>
          <div className={styles.ageBadge} aria-label="Reserve aux adultes">
            18+
          </div>
        </header>

        <section className={styles.statusBar} aria-label="Statut de la partie">
          <div>
            <span>Solde</span>
            <strong>{balance.toLocaleString("fr-FR")} credits</strong>
          </div>
          <div>
            <span>Bilan total</span>
            <strong className={totalNet >= 0 ? styles.positive : styles.negative}>
              {totalNet >= 0 ? "+" : ""}
              {totalNet.toLocaleString("fr-FR")}
            </strong>
          </div>
          <button
            className={styles.pauseButton}
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
          >
            {paused ? "Reprendre" : "Faire une pause"}
          </button>
          <div className={styles.accountTools}>
            <span>{accountUser ? accountUser.displayName || accountUser.email || "Compte Google" : accountMessage}</span>
            {accountUser ? (
              <button className={styles.secondaryButton} type="button" onClick={handleGoogleSignOut} disabled={accountLoading}>
                Se deconnecter
              </button>
            ) : (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={accountLoading || !isFirebaseConfigured()}
              >
                Connexion Google
              </button>
            )}
            {accountUser && <small>{accountMessage}</small>}
          </div>
        </section>

        <LeaderboardPanel
          currentUserId={accountUser?.uid ?? null}
          entries={leaderboard}
          message={leaderboardMessage}
          onOpenProfile={handleOpenPlayerProfile}
        />

        {selectedProfile && (
          <PlayerProfileModal
            currentUserId={accountUser?.uid ?? null}
            duelStats={selectedProfileStats}
            friendRequestMessage={friendRequestMessage}
            player={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onSendFriendRequest={() => handleSendFriendRequest(selectedProfile)}
          />
        )}

        <nav className={styles.modeTabs} aria-label="Section principale">
          <button
            className={activeSection === "games" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("games")}
          >
            Jeux
          </button>
          <button
            className={activeSection === "online" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("online")}
          >
            Jeux en ligne
          </button>
          <button
            className={activeSection === "cases" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("cases")}
          >
            Cases
          </button>
          <button
            className={activeSection === "shop" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("shop")}
          >
            Boutique
          </button>
          <button
            className={activeSection === "inventory" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("inventory")}
          >
            Inventaire
          </button>
          <button
            className={activeSection === "friends" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("friends")}
          >
            <span>Amis</span>
            {pendingFriendRequestsCount > 0 ? <span className={styles.tabBadge}>{pendingFriendRequestsCount}</span> : null}
          </button>
          <button
            className={activeSection === "trades" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("trades")}
          >
            <span>Echanges</span>
            {pendingTradeOffersCount > 0 ? <span className={styles.tabBadge}>{pendingTradeOffersCount}</span> : null}
          </button>
          <button
            className={activeSection === "messages" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("messages")}
          >
            <span>Messages</span>
            {unreadMessagesCount > 0 ? <span className={styles.tabBadge}>{unreadMessagesCount}</span> : null}
          </button>
          <button
            className={activeSection === "activity" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveSection("activity")}
          >
            <span>Activite</span>
            {activityBadgeCount > 0 ? <span className={styles.tabBadge}>{activityBadgeCount}</span> : null}
          </button>
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

        {activeSection === "games" && (
          <nav className={styles.gameTabs} aria-label="Choix du jeu">
          <button
            className={activeGame === "slots" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("slots")}
          >
            Machine a sous
          </button>
          <button
            className={activeGame === "blackjack" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("blackjack")}
          >
            Blackjack
          </button>
          <button
            className={activeGame === "plinko" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("plinko")}
          >
            Plinko
          </button>
          <button
            className={activeGame === "roulette" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("roulette")}
          >
            Roulette
          </button>
          <button
            className={activeGame === "rocket" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("rocket")}
          >
            Rocket Games
          </button>
          <button
            className={activeGame === "claw" ? styles.activeTab : ""}
            type="button"
            onClick={() => setActiveGame("claw")}
          >
            Machine a pince
          </button>
          </nav>
        )}

        {activeSection === "online" && (
          <nav className={styles.gameTabs} aria-label="Choix du jeu en ligne">
            <button
              className={activeOnlineGame === "duel" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveOnlineGame("duel")}
            >
              Duel
            </button>
            <button
              className={activeOnlineGame === "poker" ? styles.activeTab : ""}
              type="button"
              onClick={() => setActiveOnlineGame("poker")}
            >
              Partie en ligne
            </button>
          </nav>
        )}

        {activeSection === "online" ? (
          <OnlineGames
            currentUser={accountUser}
            duelHistory={duelHistory}
            friendRequests={friendRequests}
            leaderboard={leaderboard}
            message={onlineMessage}
            mode={activeOnlineGame}
            actionRoomId={onlineActionRoomId}
            now={now}
            rooms={onlineRooms}
            onCreateRoom={handleCreateOnlineRoom}
            onAdvancePoker={handleAdvancePokerPhase}
            onCallPoker={handleCallPoker}
            onCheckPoker={handleCheckPoker}
            onFoldPoker={handleFoldPoker}
            onJoinRoom={handleJoinOnlineRoom}
            onLeaveRoom={handleLeaveOnlineRoom}
            onOpenProfile={handleOpenPlayerProfile}
            onPlayDuelRound={handlePlayDuelRound}
            onRefreshRooms={refreshOnlineRooms}
            onRaisePoker={handleRaisePoker}
            onStartDuel={handleStartDuelRoom}
            onStartPoker={handleStartPokerRoom}
          />
        ) : activeSection === "cases" ? (
          <CaseOpeningGame
            balance={balance}
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
            specialInventory={specialInventory}
            onAction={handleShopAction}
            onBuySpecialChest={buySpecialChest}
          />
        ) : activeSection === "inventory" ? (
          <InventoryGame equippedSkins={equippedSkins} ownedSkinIds={ownedSkinIds} onEquip={handleShopAction} />
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
            onRowsChange={setPlinkoRows}
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
  return id ? SHOP_ITEMS.find((item) => item.id === id)?.name ?? id : "";
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
          <select
            id="slotBet"
            value={bet}
            onChange={(event) => onBetChange(Number(event.target.value) as Bet)}
          >
            {BET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} credits
              </option>
            ))}
          </select>
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
  const ownItems = SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0);
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
  const friendItems = friendInventory
    .map((entry) => SHOP_ITEMS.find((item) => item.id === entry.id))
    .filter((item): item is ShopItem => Boolean(item));
  const offeredCredits = normalizeTradeCredits(offeredCreditsText);
  const requestedCredits = normalizeTradeCredits(requestedCreditsText);

  function tradeItemName(id: string) {
    return id ? SHOP_ITEMS.find((item) => item.id === id)?.name ?? id : "Aucun skin";
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

    return (
      <div className={styles.tradeSkinPreview}>
        <span>{label}</span>
        <div className={styles.inventoryPreview}>{item ? <SkinPreview item={item} /> : <strong>?</strong>}</div>
        <strong>{item?.name ?? id}</strong>
        <small>{item?.rarity ?? "Skin"}</small>
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
    setOfferedItemId(trade.requestedItemId && hasSkinCopy(ownedSkinIds, trade.requestedItemId) ? trade.requestedItemId : "");
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
            <h2>Echanges de skins</h2>
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
              <option value="">Aucun skin</option>
              {ownItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} x{ownedCounts[item.id]}
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
              <option value="">Aucun skin</option>
              {friendItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
                    <small>Te propose un echange de skins.</small>
                  </div>
                  <div className={styles.tradeSummary}>
                    {trade.offeredItemId ? <TradeSkinPreview id={trade.offeredItemId} label="Tu recois" /> : null}
                    <TradeCreditsPreview credits={trade.offeredCredits} label="Tu recois" />
                    {trade.requestedItemId ? <TradeSkinPreview id={trade.requestedItemId} label="Tu donnes" /> : null}
                    <TradeCreditsPreview credits={trade.requestedCredits} label="Tu donnes" />
                  </div>
                  {trade.requestedItemId && !hasSkinCopy(ownedSkinIds, trade.requestedItemId) ? (
                    <small className={styles.tradeWarning}>Tu ne possedes plus le skin demande.</small>
                  ) : null}
                  {trade.requestedCredits > balance ? <small className={styles.tradeWarning}>Tu n'as pas assez de credits.</small> : null}
                </div>
                <div className={styles.socialActions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => onAnswer(trade, "accepted")}
                    disabled={(trade.requestedItemId ? !hasSkinCopy(ownedSkinIds, trade.requestedItemId) : false) || trade.requestedCredits > balance}
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
                    <small>Offre en attente. Ton skin est reserve.</small>
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
  currentUser,
  duelHistory,
  friendRequests,
  leaderboard,
  message,
  mode,
  now,
  rooms,
  onAdvancePoker,
  onCallPoker,
  onCheckPoker,
  onCreateRoom,
  onFoldPoker,
  onJoinRoom,
  onLeaveRoom,
  onOpenProfile,
  onPlayDuelRound,
  onRefreshRooms,
  onRaisePoker,
  onStartDuel,
  onStartPoker,
}: {
  actionRoomId: string | null;
  currentUser: CasinoUser | null;
  duelHistory: OnlineRoomEntry[];
  friendRequests: FriendRequestEntry[];
  leaderboard: LeaderboardEntry[];
  message: string;
  mode: "duel" | "poker";
  now: number;
  rooms: OnlineRoomEntry[];
  onAdvancePoker: (room: OnlineRoomEntry) => void;
  onCallPoker: (room: OnlineRoomEntry) => void;
  onCheckPoker: (room: OnlineRoomEntry) => void;
  onCreateRoom: (type: OnlineRoomType, game: string, invitedPlayer?: OnlineRoomPlayer) => void;
  onFoldPoker: (room: OnlineRoomEntry) => void;
  onJoinRoom: (room: OnlineRoomEntry) => void;
  onLeaveRoom: (room: OnlineRoomEntry) => void;
  onOpenProfile: (entry: LeaderboardEntry) => void;
  onPlayDuelRound: (room: OnlineRoomEntry) => void;
  onRefreshRooms: () => void;
  onRaisePoker: (room: OnlineRoomEntry) => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
  onStartPoker: (room: OnlineRoomEntry) => void;
}) {
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
  const visibleFriends = friends.slice(0, 4);
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
                <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("duel", `Duel ${gameName}`)} disabled={friends.length === 0}>
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
                    <button className={styles.primaryButton} type="button" onClick={() => onCreateRoom("duel", `Duel avec ${friend.displayName}`, friend)}>
                      Inviter
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <OnlineRoomsPanel
          currentUserId={currentUser.uid}
          message={message}
          rooms={visibleRooms}
          onJoinRoom={onJoinRoom}
          onLeaveRoom={onLeaveRoom}
        onPlayDuelRound={onPlayDuelRound}
        onRefreshRooms={onRefreshRooms}
        onStartDuel={onStartDuel}
        onAdvancePoker={onAdvancePoker}
        onCallPoker={onCallPoker}
        onCheckPoker={onCheckPoker}
        onFoldPoker={onFoldPoker}
        onRaisePoker={onRaisePoker}
        onStartPoker={onStartPoker}
        actionRoomId={actionRoomId}
        now={now}
      />
        <DuelHistoryPanel currentUserId={currentUser.uid} history={duelHistory} />
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
            {Array.from({ length: Math.max(0, 5 - visibleFriends.length) }).map((_, index) => (
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
        currentUserId={currentUser.uid}
        message={message}
        rooms={visibleRooms}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        onPlayDuelRound={onPlayDuelRound}
        onRefreshRooms={onRefreshRooms}
        onStartDuel={onStartDuel}
        onAdvancePoker={onAdvancePoker}
        onCallPoker={onCallPoker}
        onCheckPoker={onCheckPoker}
        onFoldPoker={onFoldPoker}
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
  currentUserId,
  message,
  now,
  rooms,
  onAdvancePoker,
  onCallPoker,
  onCheckPoker,
  onFoldPoker,
  onJoinRoom,
  onLeaveRoom,
  onPlayDuelRound,
  onRaisePoker,
  onRefreshRooms,
  onStartDuel,
  onStartPoker,
}: {
  actionRoomId: string | null;
  currentUserId: string;
  message: string;
  now: number;
  rooms: OnlineRoomEntry[];
  onAdvancePoker: (room: OnlineRoomEntry) => void;
  onCallPoker: (room: OnlineRoomEntry) => void;
  onCheckPoker: (room: OnlineRoomEntry) => void;
  onFoldPoker: (room: OnlineRoomEntry) => void;
  onJoinRoom: (room: OnlineRoomEntry) => void;
  onLeaveRoom: (room: OnlineRoomEntry) => void;
  onPlayDuelRound: (room: OnlineRoomEntry) => void;
  onRaisePoker: (room: OnlineRoomEntry) => void;
  onRefreshRooms: () => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
  onStartPoker: (room: OnlineRoomEntry) => void;
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
                  <span>{room.type === "poker" ? "Table poker" : "Duel"}</span>
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
                    room={room}
                    onAdvance={onAdvancePoker}
                    onCall={onCallPoker}
                    onCheck={onCheckPoker}
                    onFold={onFoldPoker}
                    onRaise={onRaisePoker}
                    onStart={onStartPoker}
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
  onPlayRound: (room: OnlineRoomEntry) => void;
  onStartDuel: (room: OnlineRoomEntry) => void;
}) {
  const currentPlayerScore = room.duelScores[currentUserId] ?? { rounds: [], total: 0 };
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
          <button className={styles.primaryButton} type="button" onClick={() => onStartDuel(room)} disabled={busy || !canStart}>
            Lancer le duel
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => onPlayRound(room)} disabled={busy || !canPlay}>
            Jouer une manche
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
  room,
  onAdvance,
  onCall,
  onCheck,
  onFold,
  onRaise,
  onStart,
}: {
  busy: boolean;
  currentUserId: string;
  room: OnlineRoomEntry;
  onAdvance: (room: OnlineRoomEntry) => void;
  onCall: (room: OnlineRoomEntry) => void;
  onCheck: (room: OnlineRoomEntry) => void;
  onFold: (room: OnlineRoomEntry) => void;
  onRaise: (room: OnlineRoomEntry) => void;
  onStart: (room: OnlineRoomEntry) => void;
}) {
  const currentHand = room.pokerHands[currentUserId] ?? [];
  const isHost = room.hostUid === currentUserId;
  const inRoom = room.players.some((player) => player.uid === currentUserId);
  const folded = room.foldedPlayerIds.includes(currentUserId);
  const canStart = (room.status === "waiting" || room.status === "finished") && isHost && room.players.length >= 2;
  const activePlayers = room.players.filter((player) => !room.foldedPlayerIds.includes(player.uid));
  const phaseDone =
    room.status === "playing" &&
    activePlayers.every((player) => {
      const action = room.pokerActions[player.uid];
      return (action === "checked" || action === "called" || action === "raised" || action === "folded") && (room.pokerContributions[player.uid] ?? 0) >= room.pokerCurrentBet;
    });
  const isTurn = room.pokerTurnUid === currentUserId;
  const currentContribution = room.pokerContributions[currentUserId] ?? 0;
  const amountToCall = Math.max(0, room.pokerCurrentBet - currentContribution);
  const canAdvance = room.status === "playing" && isHost && phaseDone;
  const canCheck = room.status === "playing" && inRoom && !folded && isTurn && amountToCall === 0;
  const canCall = room.status === "playing" && inRoom && !folded && isTurn && amountToCall > 0;
  const canFold = room.status === "playing" && inRoom && !folded && isTurn;
  const canRaise = room.status === "playing" && inRoom && !folded && isTurn;
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
        <button className={styles.primaryButton} type="button" onClick={() => onRaise(room)} disabled={busy || !canRaise}>
          Relancer +25
        </button>
        <button className={styles.secondaryButton} type="button" onClick={() => onFold(room)} disabled={busy || !canFold}>
          Se coucher
        </button>
        <button className={styles.primaryButton} type="button" onClick={() => onAdvance(room)} disabled={busy || !canAdvance}>
          Suivant
        </button>
      </div>
    </div>
  );
}

function PlayerProfileModal({
  currentUserId,
  duelStats,
  friendRequestMessage,
  player,
  onClose,
  onSendFriendRequest,
}: {
  currentUserId: string | null;
  duelStats: DuelStats | null;
  friendRequestMessage: string;
  player: LeaderboardEntry;
  onClose: () => void;
  onSendFriendRequest: () => void;
}) {
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
  const isCurrentUser = player.uid === currentUserId;

  return (
    <div className={styles.profileModalBackdrop} role="dialog" aria-modal="true" aria-label={`Profil de ${player.displayName}`}>
      <section className={styles.profileModal}>
        <header className={styles.profileModalHeader}>
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
          <button className={styles.primaryButton} type="button" onClick={onSendFriendRequest} disabled={!currentUserId || isCurrentUser}>
            {isCurrentUser ? "Ton profil" : "Demander en ami"}
          </button>
          <small>{friendRequestMessage || (currentUserId ? "Clique pour envoyer une demande d'ami." : "Connecte-toi pour envoyer une demande.")}</small>
        </div>

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
          {inventory.length === 0 ? (
            <p className={styles.empty}>Aucun inventaire public pour le moment.</p>
          ) : (
            groupedInventory.map((group) =>
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
            )
          )}
        </div>
      </section>
    </div>
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
          <select
            id="blackjackBet"
            value={bet}
            onChange={(event) => onBetChange(Number(event.target.value) as Bet)}
            disabled={phase === "player"}
          >
            {BET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} credits
              </option>
            ))}
          </select>

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
          <div className={`${styles.cardBack} ${styles.cardPlaceholder} ${cardBackClass(cardBackSkin.id)}`}>?</div>
        ) : (
          cards.map((card, index) =>
            hiddenSecondCard && index === 1 ? (
              <div
                className={`${styles.cardBack} ${styles.cardAnimated} ${styles.cardHidden} ${cardBackClass(cardBackSkin.id)}`}
                style={{ "--card-index": index } as CSSProperties}
                key="hidden"
              >
                ?
              </div>
            ) : (
              <div
                className={`${styles.card} ${styles.cardAnimated} ${cardFaceClass(cardBackSkin.id)}`}
                style={{ "--card-index": index } as CSSProperties}
                key={`${card.rank}-${card.suit}-${index}`}
              >
                <strong>{card.rank}</strong>
                <i className={styles.cardOrnament} aria-hidden="true" />
                <b className={styles.cardMedallion} aria-hidden="true" />
                <span>{card.suit}</span>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
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
  onRowsChange,
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
  onRowsChange: (rows: PlinkoRows) => void;
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
          <select id="plinkoBet" value={bet} onChange={(event) => onBetChange(Number(event.target.value) as Bet)}>
            {BET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} credits
              </option>
            ))}
          </select>
          <label htmlFor="plinkoRows">Rangees</label>
          <select
            id="plinkoRows"
            value={rows}
            onChange={(event) => onRowsChange(Number(event.target.value) as PlinkoRows)}
            disabled={animating}
          >
            {PLINKO_ROWS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={onLaunch}
            disabled={paused || !canLaunch}
          >
            Lancer une bille
          </button>
        </div>

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
  } else if (skin.id.includes("mint") || skin.id.includes("jade")) {
    for (let dot = 0; dot < 6; dot += 1) {
      const angle = (Math.PI * 2 * dot) / 6;
      context.beginPath();
      context.arc(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45, radius * 0.12, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, 0.36)";
      context.fill();
    }
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
          <select id="rouletteBet" value={bet} onChange={(event) => onBetChange(Number(event.target.value) as Bet)}>
            {BET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} credits
              </option>
            ))}
          </select>

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
  const selectedItems = SHOP_ITEMS.filter((item) => item.category === selectedCase && item.source !== "special");
  const canOpen = balance >= selectedDefinition.cost && !opening && !paused;

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
                  <strong>{caseDefinition.cost} credits</strong>
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
              {opening ? "Ouverture..." : `Ouvrir pour ${selectedDefinition.cost} credits`}
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
  const category = SHOP_ITEMS.find((item) => item.id === chest.itemIds[0])?.category ?? "plinkoBall";

  return (
    <div className={styles.specialChestPreview} style={{ "--special-chest-color": chest.theme } as CSSProperties}>
      <CaseThemePreview category={category} />
      <strong>{chest.title}</strong>
    </div>
  );
}

function InventoryGame({
  equippedSkins,
  ownedSkinIds,
  onEquip,
}: {
  equippedSkins: EquippedSkins;
  ownedSkinIds: string[];
  onEquip: (item: ShopItem) => void;
}) {
  const ownedCounts = countOwnedSkins(ownedSkinIds);
  const ownedItems = SHOP_ITEMS.filter((item) => ownedCounts[item.id] > 0);
  const totalCopies = ownedSkinIds.length;
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
          const sectionItems = SHOP_ITEMS.filter((item) => item.category === section.category && ownedCounts[item.id] > 0);
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
      </div>
    </>
  );
}

function ShopGame({
  balance,
  equippedSkins,
  message,
  ownedSkinIds,
  specialInventory,
  onAction,
  onBuySpecialChest,
}: {
  balance: number;
  equippedSkins: EquippedSkins;
  message: string;
  ownedSkinIds: string[];
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
                {SHOP_ITEMS.filter((item) => item.category === section.category && item.source !== "special").map((item) => {
                  const owned = ownedSkinIds.includes(item.id);
                  const equipped = equippedSkins[item.category] === item.id;

                  return (
                    <article className={styles.shopItem} key={item.id}>
                      <div className={styles.shopPreview}>
                        <SkinPreview item={item} />
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <small>{rarityLabel(item.rarity)}</small>
                      </div>
                      <footer className={styles.shopFooter}>
                        <strong>{item.price === 0 ? "Inclus" : `${item.price} credits`}</strong>
                        <button className={equipped ? styles.secondaryButton : styles.primaryButton} type="button" onClick={() => onAction(item)} disabled={equipped}>
                          {equipped ? "Equipe" : owned ? "Equiper" : "Acheter"}
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
              <div>
                <h3>{chest.title}</h3>
                <p>{chest.subtitle}</p>
                <small>
                  Possedes : {specialInventory.chests[chest.id]} | Cle : {specialInventory.keys[chest.id]} | Fragments :{" "}
                  {specialInventory.fragments[chest.id]}
                </small>
              </div>
              <footer className={styles.shopFooter}>
                <strong>{chest.price} credits</strong>
                <button className={styles.primaryButton} type="button" onClick={() => onBuySpecialChest(chest.id)} disabled={balance < chest.price}>
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
  onPlay: () => ClawOutcome | null;
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
      const outcome = onPlay();
      const ball = clawBalls[closestBallIndex];

      if (outcome) {
        setReveal({ outcome, x: ball.left, theme: getSpecialChestDefinition(outcome.chestId).theme });
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
            <button className={styles.secondaryButton} type="button" onClick={() => moveClaw(-1)} disabled={dropping}>
              Gauche
            </button>
            <button className={styles.primaryButton} type="button" onClick={dropClaw} disabled={dropping || paused || balance < CLAW_COST}>
              {dropping ? "La pince descend..." : "Descendre la pince"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => moveClaw(1)} disabled={dropping}>
              Droite
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
  const normalizedFlightHeight = Math.max(0, Math.min(1, (displayedMultiplier - 1) / 2));
  const rocketSceneStyle = {
    "--rocket-end-left": `${62 + normalizedFlightHeight * 24}%`,
    "--rocket-end-bottom": `${210 + normalizedFlightHeight * 160}px`,
    "--rocket-trail-end-bottom": `${160 + normalizedFlightHeight * 140}px`,
  } as CSSProperties;

  return (
    <>
      <section className={styles.machine}>
        <div className={styles.rocketStage}>
          <div className={styles.rocketAltitudeTrack} style={rocketSceneStyle}>
          <div className={animating ? `${styles.rocketTrail} ${styles.rocketTrailFlying}` : styles.rocketTrail} />
            <svg
              className={`${animating ? `${styles.rocketCraft} ${styles.rocketCraftFlying}` : styles.rocketCraft} ${rocketShipClass(shipSkin.id)}`}
              viewBox="0 0 120 86"
              style={
                {
                  "--rocket-accent": shipSkin.preview,
                  "--rocket-glow": rocketGlow(shipSkin.id),
                } as CSSProperties
              }
            >
              {vehiclePreviewSvg(shipSkin.id)}
            </svg>
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
          <select id="rocketBet" value={bet} onChange={(event) => onBetChange(Number(event.target.value) as Bet)}>
            {BET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} credits
              </option>
            ))}
          </select>
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

function cardBackClass(id: string): string {
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

  if (id.includes("mint") || id.includes("jade")) {
    return "rgba(156, 243, 211, 0.92)";
  }

  if (id.includes("rose")) {
    return "rgba(255, 143, 177, 0.92)";
  }

  return "rgba(249, 247, 239, 0.75)";
}

function rocketShipClass(id: string): string {
  if (id === "rocket-comet") {
    return styles.rocketComet;
  }

  if (id === "rocket-solar") {
    return styles.rocketSolar;
  }

  if (id === "rocket-nebula") {
    return styles.rocketNebula;
  }

  return styles.rocketClassic;
}

function rocketGlow(id: string): string {
  if (id === "rocket-comet") {
    return "rgba(124, 199, 255, 0.88)";
  }

  if (id === "rocket-solar") {
    return "rgba(174, 230, 255, 0.86)";
  }

  if (id === "rocket-nebula") {
    return "rgba(249, 247, 239, 0.92)";
  }

  return "rgba(249, 247, 239, 0.72)";
}

function formatMultiplier(value: number): string {
  return `x${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function formatCredits(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function SkinPreview({ item, large = false }: { item: ShopItem; large?: boolean }) {
  if (item.category === "cardBack") {
    return (
      <span
        className={`${large ? styles.caseCardBackPreview : styles.shopCardPreview} ${cardBackClass(item.id)}`}
        aria-hidden="true"
      />
    );
  }

  if (item.category === "rocketShip") {
    return (
      <svg
        className={large ? styles.vehicleSvgLarge : styles.vehicleSvgSmall}
        viewBox="0 0 120 86"
        style={{ "--rocket-glow": rocketGlow(item.id) } as CSSProperties}
        aria-hidden="true"
      >
        {vehiclePreviewSvg(item.id)}
      </svg>
    );
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

  if (id.includes("mint") || id.includes("jade")) {
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

function vehiclePreviewSvg(id: string): ReactNode {
  if (id === "rocket-comet") {
    return (
      <g>
        <ellipse cx="60" cy="52" rx="40" ry="15" fill="#2f8bd0" />
        <ellipse cx="60" cy="48" rx="30" ry="11" fill="#76c8f6" />
        <path d="M24 52 C36 38 84 38 96 52 C82 64 38 64 24 52Z" fill="#1f6da9" />
        <ellipse cx="61" cy="31" rx="17" ry="13" fill="#bcecff" />
        <ellipse cx="61" cy="29" rx="11" ry="8" fill="#e5fbff" opacity="0.75" />
        <path d="M25 56 L10 66 L36 65Z" fill="#70d6ff" opacity="0.6" />
        <path d="M95 56 L110 66 L84 65Z" fill="#70d6ff" opacity="0.6" />
      </g>
    );
  }

  if (id === "rocket-solar") {
    return (
      <g>
        <path d="M60 7 L75 58 L64 80 H56 L45 58Z" fill="#dfe6ec" />
        <path d="M60 7 L64 80 H56Z" fill="#8b98a6" opacity="0.55" />
        <path d="M46 44 L10 66 L50 65Z" fill="#586574" />
        <path d="M74 44 L110 66 L70 65Z" fill="#586574" />
        <path d="M51 61 L32 79 L54 75Z" fill="#3f4a56" />
        <path d="M69 61 L88 79 L66 75Z" fill="#3f4a56" />
        <rect x="52" y="30" width="16" height="12" rx="6" fill="#101218" />
        <path d="M55 78 L60 86 L65 78Z" fill="#ffd166" />
      </g>
    );
  }

  if (id === "rocket-nebula") {
    return (
      <g>
        <path d="M60 5 C76 20 76 58 67 76 H53 C44 58 44 20 60 5Z" fill="#f7fbff" />
        <path d="M53 16 H58 V74 H53Z" fill="#101218" />
        <path d="M62 16 H67 V74 H62Z" fill="#101218" />
        <circle cx="60" cy="34" r="9" fill="#101218" />
        <circle cx="60" cy="34" r="5" fill="#d8f5ff" />
        <path d="M53 68 L35 82 L52 79Z" fill="#101218" />
        <path d="M67 68 L85 82 L68 79Z" fill="#101218" />
        <path d="M54 78 L60 86 L66 78Z" fill="#ffd166" />
      </g>
    );
  }

  return (
    <g>
      <path d="M60 7 C76 25 77 54 66 72 H54 C43 54 44 25 60 7Z" fill="#fff4df" />
      <path d="M60 7 C66 20 67 55 62 72 H54 C43 54 44 25 60 7Z" fill="#e8edf0" opacity="0.75" />
      <path d="M51 56 L24 76 L51 74Z" fill="#e84745" />
      <path d="M69 56 L96 76 L69 74Z" fill="#e84745" />
      <circle cx="60" cy="34" r="9" fill="#aee6ff" />
      <circle cx="57" cy="31" r="3" fill="#ffffff" opacity="0.8" />
      <path d="M53 72 L60 86 L67 72Z" fill="#ff9b42" />
      <path d="M48 19 L60 7 L72 19Z" fill="#ffd166" />
    </g>
  );
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

function buildCaseReel(category: SkinCategory, winningItem: ShopItem, itemIds?: readonly string[]): ShopItem[] {
  const items = itemIds
    ? itemIds.map((itemId) => SHOP_ITEMS.find((item) => item.id === itemId)).filter((item): item is ShopItem => Boolean(item))
    : SHOP_ITEMS.filter((item) => item.category === category && item.source !== "special");

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
