import type { LobbyActivityFeedItem } from "./lobbyActivity";

export type ActivityEventKind =
  | "big-win"
  | "jackpot"
  | "legendary-drop"
  | "bankrupt"
  | "soup"
  | "level-up"
  | "season-champion"
  | "weekly-champion";

export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  uid: string;
  displayName: string;
  photoURL?: string;
  message: string;
  amount?: number;
  game?: string;
  level?: number;
  createdAt?: unknown;
};

export type ActivityEventActor = {
  uid: string;
  displayName: string;
  photoURL?: string;
};

export const ACTIVITY_EVENT_KINDS: ActivityEventKind[] = [
  "big-win",
  "jackpot",
  "legendary-drop",
  "bankrupt",
  "soup",
  "level-up",
  "season-champion",
  "weekly-champion",
];

const MAX_MESSAGE_LENGTH = 200;
const BIG_WIN_MULTIPLIER = 10;
const BIG_WIN_MIN_NET = 500;

const FEED_TONE_BY_KIND: Record<ActivityEventKind, LobbyActivityFeedItem["tone"]> = {
  "big-win": "gain",
  jackpot: "gain",
  "legendary-drop": "gain",
  bankrupt: "loss",
  soup: "neutral",
  "level-up": "neutral",
  "season-champion": "gain",
  "weekly-champion": "gain",
};

function formatCredits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

function clampMessage(message: string) {
  // Pas de normalisation des espaces : toLocaleString("fr-FR") emploie des espaces insecables comme separateurs de milliers.
  const compact = message.trim();
  return compact.length <= MAX_MESSAGE_LENGTH ? compact : `${compact.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
}

function resolveDisplayName(actor: ActivityEventActor) {
  return actor.displayName.trim() || "Joueur anonyme";
}

export function buildEventId(kind: ActivityEventKind, uid: string, discriminant: string | number): string {
  return `${kind}_${uid}_${discriminant}`;
}

export function shouldEmitBigWin(net: number, bet: number): boolean {
  return net >= bet * BIG_WIN_MULTIPLIER && net >= BIG_WIN_MIN_NET;
}

function buildBaseEvent(
  kind: ActivityEventKind,
  actor: ActivityEventActor,
  discriminant: string | number,
  message: string,
): ActivityEvent {
  const photoURL = actor.photoURL?.trim();

  return {
    id: buildEventId(kind, actor.uid, discriminant),
    kind,
    uid: actor.uid,
    displayName: resolveDisplayName(actor),
    ...(photoURL ? { photoURL } : {}),
    message: clampMessage(message),
  };
}

export function buildBigWinEvent(
  actor: ActivityEventActor,
  game: string,
  net: number,
  discriminant: string | number,
): ActivityEvent {
  return {
    ...buildBaseEvent("big-win", actor, discriminant, `${resolveDisplayName(actor)} decroche ${formatCredits(net)} credits sur ${game} !`),
    amount: Math.round(net),
    game,
  };
}

export function buildJackpotEvent(
  actor: ActivityEventActor,
  game: string,
  amount: number,
  discriminant: string | number,
): ActivityEvent {
  return {
    ...buildBaseEvent("jackpot", actor, discriminant, `${resolveDisplayName(actor)} explose le jackpot : +${formatCredits(amount)} credits sur ${game} !`),
    amount: Math.round(amount),
    game,
  };
}

export function buildLegendaryDropEvent(
  actor: ActivityEventActor,
  itemLabel: string,
  discriminant: string | number,
): ActivityEvent {
  return buildBaseEvent("legendary-drop", actor, discriminant, `${resolveDisplayName(actor)} deballe un objet legendaire : ${itemLabel} !`);
}

export function buildBankruptEvent(actor: ActivityEventActor, discriminant: string | number): ActivityEvent {
  return buildBaseEvent("bankrupt", actor, discriminant, `${resolveDisplayName(actor)} est ruine(e)... La soupe populaire l'attend.`);
}

export function buildSoupEvent(actor: ActivityEventActor, amount: number, discriminant: string | number): ActivityEvent {
  return {
    ...buildBaseEvent("soup", actor, discriminant, `${resolveDisplayName(actor)} mange a la soupe populaire (+${formatCredits(amount)} credits).`),
    amount: Math.round(amount),
  };
}

export function buildLevelUpEvent(actor: ActivityEventActor, level: number): ActivityEvent {
  return {
    ...buildBaseEvent("level-up", actor, level, `${resolveDisplayName(actor)} atteint le niveau ${level} !`),
    level,
  };
}

export function buildChampionEvent(
  actor: ActivityEventActor,
  kind: "season-champion" | "weekly-champion",
  periodKey: string,
  net: number,
): ActivityEvent {
  const periodLabel = kind === "season-champion" ? `la saison ${periodKey}` : `la semaine ${periodKey}`;

  return {
    ...buildBaseEvent(kind, actor, periodKey, `${resolveDisplayName(actor)} remporte ${periodLabel} avec ${formatCredits(net)} credits de gains !`),
    amount: Math.round(net),
  };
}

export function activityEventToFeedItem(event: ActivityEvent): LobbyActivityFeedItem {
  return {
    id: event.id,
    displayName: event.displayName,
    message: clampMessage(event.message),
    tone: FEED_TONE_BY_KIND[event.kind] ?? "neutral",
    ...(event.uid ? { uid: event.uid } : {}),
    ...(event.photoURL ? { photoURL: event.photoURL } : {}),
  };
}
