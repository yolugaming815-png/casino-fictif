import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_EQUIPPED_SKINS, SKIN_PRICES_BY_RARITY, buySkin, equipSkin, getShopItem } from "./shopLogic.ts";

test("achete un skin avec des credits virtuels", () => {
  const skin = getShopItem("plinko-neon");
  const result = buySkin(500, ["plinko-gold"], skin);

  assert.equal(result.purchased, true);
  assert.equal(result.balance, 500 - SKIN_PRICES_BY_RARITY.common);
  assert.deepEqual(result.ownedSkinIds, ["plinko-gold", "plinko-neon"]);
});

test("peut acheter plusieurs copies du meme skin", () => {
  const skin = getShopItem("plinko-neon");
  const result = buySkin(500, ["plinko-neon"], skin);

  assert.equal(result.purchased, true);
  assert.equal(result.balance, 500 - SKIN_PRICES_BY_RARITY.common);
  assert.deepEqual(result.ownedSkinIds, ["plinko-neon", "plinko-neon"]);
});

test("valorise les skins selon leur rarete", () => {
  assert.equal(getShopItem("plinko-neon").price, 200);
  assert.equal(getShopItem("plinko-ruby").price, 400);
  assert.equal(getShopItem("plinko-lilac").price, 700);
  assert.equal(getShopItem("plinko-mint").price, 1000);
});

test("refuse un achat sans solde suffisant", () => {
  const skin = getShopItem("cards-royal");
  const result = buySkin(100, ["cards-emerald"], skin);

  assert.equal(result.purchased, false);
  assert.equal(result.reason, "balance");
  assert.equal(result.balance, 100);
});

test("equipe un skin dans sa categorie seulement", () => {
  const skin = getShopItem("roulette-sapphire");
  const equipped = equipSkin(DEFAULT_EQUIPPED_SKINS, skin);

  assert.equal(equipped.rouletteBall, "roulette-sapphire");
  assert.equal(equipped.plinkoBall, DEFAULT_EQUIPPED_SKINS.plinkoBall);
});

test("equipe une fusee dans sa categorie seulement", () => {
  const skin = getShopItem("rocket-comet");
  const equipped = equipSkin(DEFAULT_EQUIPPED_SKINS, skin);

  assert.equal(equipped.rocketShip, "rocket-comet");
  assert.equal(equipped.cardBack, DEFAULT_EQUIPPED_SKINS.cardBack);
});
