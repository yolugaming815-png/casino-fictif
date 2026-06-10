import assert from "node:assert/strict";
import test from "node:test";
import {
  GIFT_DAILY_CAP,
  GIFT_MESSAGE_MAX_LENGTH,
  RAIN_ACTIVE_WINDOW_MS,
  RAIN_MAX_RECIPIENTS,
  giftDayKey,
  parseGift,
  pickRainRecipients,
  sanitizeGiftMessage,
  splitRainAmount,
} from "./gifts.ts";
import type { LeaderboardEntry } from "./firebaseClient.ts";

function makePlayer(uid: string, overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    uid,
    displayName: `Joueur ${uid}`,
    balance: 1000,
    inventory: [],
    equippedSkins: {},
    ...overrides,
  };
}

test("constantes gifts conformes au design", () => {
  assert.equal(GIFT_DAILY_CAP, 10000);
  assert.equal(GIFT_MESSAGE_MAX_LENGTH, 140);
  assert.equal(RAIN_ACTIVE_WINDOW_MS, 10 * 60 * 1000);
  assert.equal(RAIN_MAX_RECIPIENTS, 10);
});

test("giftDayKey formate la date locale en YYYY-MM-DD", () => {
  assert.equal(giftDayKey(new Date(2026, 5, 10, 13, 37)), "2026-06-10");
  assert.equal(giftDayKey(new Date(2026, 0, 3)), "2026-01-03");
  assert.match(giftDayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test("sanitizeGiftMessage nettoie les espaces et coupe a 140", () => {
  assert.equal(sanitizeGiftMessage(undefined), "");
  assert.equal(sanitizeGiftMessage("   "), "");
  assert.equal(sanitizeGiftMessage("  bravo   pour\nle  jackpot  "), "bravo pour le jackpot");
  assert.equal(sanitizeGiftMessage("x".repeat(200)).length, GIFT_MESSAGE_MAX_LENGTH);
});

test("pickRainRecipients filtre moi, bannis et inactifs", () => {
  const now = Date.now();
  const players = [
    makePlayer("me", { updatedAt: now }),
    makePlayer("actif", { updatedAt: now - 60 * 1000 }),
    makePlayer("banni", { updatedAt: now, banned: true }),
    makePlayer("inactif", { updatedAt: now - 11 * 60 * 1000 }),
    makePlayer("sans-date"),
    makePlayer("seconds", { updatedAt: { seconds: Math.floor((now - 30 * 1000) / 1000) } }),
  ];

  const recipients = pickRainRecipients("me", players, now);
  assert.deepEqual(
    recipients.map((player) => player.uid),
    ["actif", "seconds"],
  );
});

test("pickRainRecipients limite a 10 destinataires", () => {
  const now = Date.now();
  const players = Array.from({ length: 15 }, (_, index) => makePlayer(`joueur-${index}`, { updatedAt: now - index * 1000 }));

  const recipients = pickRainRecipients("me", players, now);
  assert.equal(recipients.length, RAIN_MAX_RECIPIENTS);
  assert.equal(recipients[0]?.uid, "joueur-0");
  assert.equal(recipients[9]?.uid, "joueur-9");
});

test("splitRainAmount repartit au floor", () => {
  assert.equal(splitRainAmount(1000, 10), 100);
  assert.equal(splitRainAmount(1000, 3), 333);
  assert.equal(splitRainAmount(5, 10), 0);
  assert.equal(splitRainAmount(1000, 0), 0);
  assert.equal(splitRainAmount(-50, 3), 0);
});

test("parseGift normalise un document complet", () => {
  const gift = parseGift("gift-1", {
    fromUid: "a",
    fromDisplayName: "Alice",
    toUid: "b",
    toDisplayName: "Bob",
    amount: 250,
    kind: "rain",
    message: "tiens",
    status: "claimed",
    dayKey: "2026-06-10",
  });

  assert.equal(gift.id, "gift-1");
  assert.equal(gift.fromUid, "a");
  assert.equal(gift.toUid, "b");
  assert.equal(gift.amount, 250);
  assert.equal(gift.kind, "rain");
  assert.equal(gift.message, "tiens");
  assert.equal(gift.status, "claimed");
  assert.equal(gift.dayKey, "2026-06-10");
});

test("parseGift applique des valeurs par defaut sures", () => {
  const gift = parseGift("gift-2", { amount: Number.NaN, kind: "autre", status: "autre" });

  assert.equal(gift.fromUid, "");
  assert.equal(gift.fromDisplayName, "Joueur anonyme");
  assert.equal(gift.amount, 0);
  assert.equal(gift.kind, "gift");
  assert.equal(gift.status, "pending");
  assert.equal(gift.dayKey, "");
});
