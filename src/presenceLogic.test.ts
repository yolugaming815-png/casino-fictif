import assert from "node:assert/strict";
import test from "node:test";
import { ONLINE_WINDOW_MS, isRecentlyActive, listOnlineFriends } from "./presenceLogic.ts";

const NOW = 1_750_000_000_000;

test("isRecentlyActive accepte les formats number, Date, toMillis et seconds", () => {
  assert.equal(isRecentlyActive(NOW - 60_000, NOW), true);
  assert.equal(isRecentlyActive(new Date(NOW - 60_000), NOW), true);
  assert.equal(isRecentlyActive({ toMillis: () => NOW - 60_000 }, NOW), true);
  assert.equal(isRecentlyActive({ seconds: (NOW - 60_000) / 1000 }, NOW), true);
});

test("isRecentlyActive respecte la fenetre de 5 minutes", () => {
  assert.equal(ONLINE_WINDOW_MS, 300_000);
  assert.equal(isRecentlyActive(NOW - ONLINE_WINDOW_MS, NOW), true);
  assert.equal(isRecentlyActive(NOW - ONLINE_WINDOW_MS - 1, NOW), false);
  assert.equal(isRecentlyActive(NOW, NOW), true);
});

test("isRecentlyActive accepte une fenetre personnalisee", () => {
  assert.equal(isRecentlyActive(NOW - 10_000, NOW, 5_000), false);
  assert.equal(isRecentlyActive(NOW - 4_000, NOW, 5_000), true);
});

test("isRecentlyActive rejette les valeurs absentes ou invalides", () => {
  assert.equal(isRecentlyActive(undefined, NOW), false);
  assert.equal(isRecentlyActive(null, NOW), false);
  assert.equal(isRecentlyActive("hier", NOW), false);
  assert.equal(isRecentlyActive(0, NOW), false);
  assert.equal(isRecentlyActive(Number.NaN, NOW), false);
  assert.equal(isRecentlyActive({}, NOW), false);
});

test("isRecentlyActive rejette les timestamps trop loin dans le futur", () => {
  assert.equal(isRecentlyActive(NOW + ONLINE_WINDOW_MS + 1, NOW), false);
  assert.equal(isRecentlyActive(NOW + 60_000, NOW), true);
});

test("listOnlineFriends filtre amis et activite recente", () => {
  const leaderboard = [
    { uid: "ami-actif", updatedAt: NOW - 30_000 },
    { uid: "ami-inactif", updatedAt: NOW - ONLINE_WINDOW_MS - 60_000 },
    { uid: "inconnu-actif", updatedAt: NOW - 10_000 },
    { uid: "ami-sans-date" },
    { uid: "", updatedAt: NOW },
  ];

  const online = listOnlineFriends(leaderboard, ["ami-actif", "ami-inactif", "ami-sans-date", ""], NOW);
  assert.deepEqual(
    online.map((entry) => entry.uid),
    ["ami-actif"],
  );
});

test("listOnlineFriends accepte un Set et preserve les champs additionnels", () => {
  const leaderboard = [
    { uid: "amie", displayName: "Amie", updatedAt: new Date(NOW - 1_000) },
    { uid: "autre", displayName: "Autre", updatedAt: new Date(NOW - 1_000) },
  ];

  const online = listOnlineFriends(leaderboard, new Set(["amie"]), NOW);
  assert.equal(online.length, 1);
  assert.equal(online[0].displayName, "Amie");
});

test("listOnlineFriends renvoie une liste vide sans amis", () => {
  assert.deepEqual(listOnlineFriends([{ uid: "a", updatedAt: NOW }], [], NOW), []);
});
