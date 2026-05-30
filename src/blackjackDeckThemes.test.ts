import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARD_SUITS, type Card } from "./blackjackLogic.ts";
import { getBlackjackCardFaceModel, getBlackjackDeckTheme } from "./blackjackDeckThemes.ts";
import { SHOP_ITEMS } from "./shopLogic.ts";

const faceRanks = ["A", "J", "Q", "K"] as const;

describe("blackjack deck themes", () => {
  it("covers every public blackjack skin with illustrated suits and face cards", () => {
    const cardSkinIds = SHOP_ITEMS.filter((item) => item.category === "cardBack" && item.source !== "special").map((item) => item.id);

    for (const skinId of cardSkinIds) {
      const theme = getBlackjackDeckTheme(skinId);

      assert.equal(theme.id, skinId);
      assert.equal(theme.artAtlasFilename, `${skinId}-art.png`, `${skinId} atlas filename`);
      assert.ok(theme.figureStyle.title.length > 0, `${skinId} figure style title`);
      assert.ok(theme.figureStyle.ornament.length > 0, `${skinId} figure style ornament`);
      assert.match(theme.figureStyle.animationPrompt, /first and last frame strictly identical/i, `${skinId} animation prompt`);

      for (const suit of CARD_SUITS) {
        assert.equal(theme.suits[suit].baseSuit, suit);
        assert.ok(theme.suits[suit].symbol.length > 0, `${skinId} ${suit} symbol`);
        assert.ok(theme.suits[suit].illustration.title.length > 0, `${skinId} ${suit} illustration title`);
        assert.ok(theme.suits[suit].illustration.crest.length > 0, `${skinId} ${suit} illustration crest`);
        assert.ok(theme.suits[suit].illustration.flourish.length > 0, `${skinId} ${suit} illustration flourish`);
        assert.ok(theme.suits[suit].illustration.assetCell.position.includes("%"), `${skinId} ${suit} atlas position`);
      }

      for (const rank of faceRanks) {
        assert.ok(theme.figures[rank].portrait.length > 0, `${skinId} ${rank} portrait`);
        assert.ok(theme.figures[rank].headwear.length > 0, `${skinId} ${rank} headwear`);
        assert.ok(theme.figures[rank].prop.length > 0, `${skinId} ${rank} prop`);
        assert.ok(theme.figures[rank].robe.length > 0, `${skinId} ${rank} robe`);
        assert.ok(theme.figures[rank].frame.length > 0, `${skinId} ${rank} frame`);
        assert.ok(theme.figures[rank].assetCell.position.includes("%"), `${skinId} ${rank} atlas position`);
      }
    }
  });

  it("builds numeric cards from common ranks and themed suit pips", () => {
    const card: Card = { rank: "10", suit: "♣" };
    const model = getBlackjackCardFaceModel(card, "cards-club");

    assert.equal(model.kind, "pip");
    assert.equal(model.rank, "10");
    assert.equal(model.suit.baseSuit, "♣");
    assert.equal(model.pips.length, 10);
    assert.ok(model.pips.every((pip) => pip.assetCell.id === "club"));
  });

  it("builds aces and figures with themed artwork", () => {
    const card: Card = { rank: "K", suit: "♠" };
    const model = getBlackjackCardFaceModel(card, "cards-midnight");

    assert.equal(model.kind, "figure");
    assert.equal(model.rank, "K");
    assert.equal(model.figure.role, "king");
    assert.equal(model.figure.portrait, "sovereign");
    assert.equal(model.figure.headwear, "crown");
    assert.equal(model.figure.prop, "orb");
    assert.equal(model.figure.assetCell.id, "king");
    assert.equal(model.suit.baseSuit, "♠");
    assert.equal(model.suit.illustration.motif, "spade");
    assert.equal(model.suit.illustration.assetCell.id, "spade");
    assert.ok(model.theme.figureStyle.ornament.length > 0);
  });
});
