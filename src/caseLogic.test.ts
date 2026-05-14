import assert from "node:assert/strict";
import test from "node:test";
import { openCase, pickCaseItem } from "./caseLogic.ts";
import { SHOP_ITEMS } from "./shopLogic.ts";

test("ouvre une caisse et ajoute un nouveau skin", () => {
  const outcome = openCase(500, ["plinko-gold"], SHOP_ITEMS, "plinkoBall", () => 0.99);

  assert.ok(outcome);
  assert.equal(outcome.item.id, "plinko-mint");
  assert.equal(outcome.duplicate, false);
  assert.equal(outcome.balance, 410);
  assert.ok(outcome.ownedSkinIds.includes("plinko-mint"));
});

test("garde un doublon dans l'inventaire sans remboursement", () => {
  const owned = ["plinko-gold", "plinko-neon"];
  const outcome = openCase(500, owned, SHOP_ITEMS, "plinkoBall", () => 0);

  assert.ok(outcome);
  assert.equal(outcome.item.id, "plinko-gold");
  assert.equal(outcome.duplicate, true);
  assert.equal(outcome.refund, 0);
  assert.equal(outcome.balance, 410);
  assert.deepEqual(outcome.ownedSkinIds, [...owned, "plinko-gold"]);
});

test("refuse une ouverture sans solde suffisant", () => {
  const outcome = openCase(20, [], SHOP_ITEMS, "rocketShip", () => 0);

  assert.equal(outcome, null);
});

test("choisit toujours un item valide", () => {
  const rouletteItems = SHOP_ITEMS.filter((item) => item.category === "rouletteBall");
  const outcome = pickCaseItem(rouletteItems, () => 0.5);

  assert.equal(outcome.category, "rouletteBall");
});
