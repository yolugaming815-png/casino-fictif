import assert from "node:assert/strict";
import test from "node:test";
import {
  activityEventToFeedItem,
  buildBankruptEvent,
  buildBigWinEvent,
  buildChampionEvent,
  buildEventId,
  buildJackpotEvent,
  buildLegendaryDropEvent,
  buildLevelUpEvent,
  buildSoupEvent,
  shouldEmitBigWin,
} from "./activityEvents.ts";

const actor = { uid: "uid-1", displayName: "Daniel", photoURL: "https://example.com/avatar.png" };

function credits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

test("buildEventId : format stable et idempotent", () => {
  assert.equal(buildEventId("big-win", "uid-1", 42), "big-win_uid-1_42");
  assert.equal(buildEventId("level-up", "uid-1", 7), "level-up_uid-1_7");
  assert.equal(buildEventId("season-champion", "uid-1", "2026-05"), "season-champion_uid-1_2026-05");
  assert.equal(buildEventId("big-win", "uid-1", 42), buildEventId("big-win", "uid-1", 42));
});

test("shouldEmitBigWin : net >= bet*10 ET net >= 500", () => {
  assert.equal(shouldEmitBigWin(500, 50), true);
  assert.equal(shouldEmitBigWin(499, 10), false);
  assert.equal(shouldEmitBigWin(500, 51), false);
  assert.equal(shouldEmitBigWin(1000, 100), true);
  assert.equal(shouldEmitBigWin(999, 100), false);
  assert.equal(shouldEmitBigWin(5000, 25), true);
  assert.equal(shouldEmitBigWin(450, 10), false);
  assert.equal(shouldEmitBigWin(-100, 10), false);
});

test("buildBigWinEvent : id idempotent, montant arrondi, jeu et nom dans le message", () => {
  const event = buildBigWinEvent(actor, "Machine a sous", 1234.4, 99);

  assert.equal(event.id, "big-win_uid-1_99");
  assert.equal(event.kind, "big-win");
  assert.equal(event.uid, "uid-1");
  assert.equal(event.displayName, "Daniel");
  assert.equal(event.photoURL, "https://example.com/avatar.png");
  assert.equal(event.amount, 1234);
  assert.equal(event.game, "Machine a sous");
  assert.ok(event.message.includes("Daniel"));
  assert.ok(event.message.includes("Machine a sous"));
  assert.ok(event.message.includes(credits(1234)));
  assert.ok(event.message.length <= 200);
});

test("buildJackpotEvent / buildLegendaryDropEvent / buildBankruptEvent / buildSoupEvent", () => {
  const jackpot = buildJackpotEvent(actor, "Roulette", 8000, "j-1");
  assert.equal(jackpot.id, "jackpot_uid-1_j-1");
  assert.equal(jackpot.kind, "jackpot");
  assert.equal(jackpot.amount, 8000);
  assert.equal(jackpot.game, "Roulette");
  assert.ok(jackpot.message.includes(credits(8000)));

  const drop = buildLegendaryDropEvent(actor, "Couronne doree", "case-7");
  assert.equal(drop.id, "legendary-drop_uid-1_case-7");
  assert.equal(drop.kind, "legendary-drop");
  assert.ok(drop.message.includes("Couronne doree"));

  const bankrupt = buildBankruptEvent(actor, 1717171717);
  assert.equal(bankrupt.id, "bankrupt_uid-1_1717171717");
  assert.equal(bankrupt.kind, "bankrupt");
  assert.ok(bankrupt.message.includes("Daniel"));

  const soup = buildSoupEvent(actor, 200, 1717171718);
  assert.equal(soup.id, "soup_uid-1_1717171718");
  assert.equal(soup.kind, "soup");
  assert.equal(soup.amount, 200);
  assert.ok(soup.message.includes(credits(200)));
});

test("buildLevelUpEvent : discriminant = niveau (idempotent par niveau)", () => {
  const event = buildLevelUpEvent(actor, 7);

  assert.equal(event.id, "level-up_uid-1_7");
  assert.equal(event.kind, "level-up");
  assert.equal(event.level, 7);
  assert.ok(event.message.includes("7"));
  assert.equal(buildLevelUpEvent(actor, 7).id, event.id);
  assert.notEqual(buildLevelUpEvent(actor, 8).id, event.id);
});

test("buildChampionEvent : saison et semaine, discriminant = cle de periode", () => {
  const season = buildChampionEvent(actor, "season-champion", "2026-05", 12500);
  assert.equal(season.id, "season-champion_uid-1_2026-05");
  assert.equal(season.kind, "season-champion");
  assert.equal(season.amount, 12500);
  assert.ok(season.message.includes("saison"));
  assert.ok(season.message.includes(credits(12500)));

  const week = buildChampionEvent(actor, "weekly-champion", "2026-W23", 980);
  assert.equal(week.id, "weekly-champion_uid-1_2026-W23");
  assert.equal(week.kind, "weekly-champion");
  assert.ok(week.message.includes("semaine"));
});

test("message <= 200 caracteres et nom anonyme/photo vide normalises", () => {
  const longActor = { uid: "uid-long", displayName: "X".repeat(500) };
  const event = buildBigWinEvent(longActor, "Mines", 999999, 1);

  assert.ok(event.message.length <= 200);
  assert.equal(event.photoURL, undefined);

  const anonymous = buildBankruptEvent({ uid: "uid-2", displayName: "   ", photoURL: "  " }, 1);
  assert.equal(anonymous.displayName, "Joueur anonyme");
  assert.equal(anonymous.photoURL, undefined);
  assert.ok(anonymous.message.includes("Joueur anonyme"));
});

test("activityEventToFeedItem : adaptateur vers LobbyActivityFeedItem", () => {
  const win = activityEventToFeedItem(buildBigWinEvent(actor, "Plinko", 600, 3));
  assert.deepEqual(win, {
    id: "big-win_uid-1_3",
    displayName: "Daniel",
    message: win.message,
    tone: "gain",
    uid: "uid-1",
    photoURL: "https://example.com/avatar.png",
  });

  assert.equal(activityEventToFeedItem(buildJackpotEvent(actor, "Roulette", 8000, 1)).tone, "gain");
  assert.equal(activityEventToFeedItem(buildLegendaryDropEvent(actor, "Item", 1)).tone, "gain");
  assert.equal(activityEventToFeedItem(buildChampionEvent(actor, "weekly-champion", "2026-W23", 10)).tone, "gain");
  assert.equal(activityEventToFeedItem(buildBankruptEvent(actor, 1)).tone, "loss");
  assert.equal(activityEventToFeedItem(buildSoupEvent(actor, 200, 1)).tone, "neutral");
  assert.equal(activityEventToFeedItem(buildLevelUpEvent(actor, 2)).tone, "neutral");

  const noPhoto = activityEventToFeedItem(buildLevelUpEvent({ uid: "uid-3", displayName: "Zoe" }, 5));
  assert.equal(noPhoto.photoURL, undefined);
  assert.ok(!("photoURL" in noPhoto));
});
