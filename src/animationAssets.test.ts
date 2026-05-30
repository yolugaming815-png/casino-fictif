import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATION_ASSETS, getAnimationAsset } from "./animationAssets.ts";

describe("animation asset registry", () => {
  it("exposes stable 16:9 and 9:16 assets for the lobby", () => {
    const ids = ANIMATION_ASSETS.map((asset) => asset.id);

    assert.deepEqual(ids, [
      "hero-duel-16x9",
      "dragon-spin-card-9x16",
      "blackjack-card-9x16",
      "roulette-card-9x16",
      "battle-poker-card-9x16",
      "gems-quest-card-9x16",
      "reward-chest-16x9",
      "promo-friends-16x9",
      "promo-profile-16x9",
      "promo-rewards-16x9",
      "tournament-cup-16x9",
    ]);
    assert.equal(getAnimationAsset("hero-duel-16x9")?.aspect, "16:9");
    assert.equal(getAnimationAsset("dragon-spin-card-9x16")?.aspect, "9:16");
  });

  it("keeps prompts loop-ready without mentioning duration limits", () => {
    for (const asset of ANIMATION_ASSETS) {
      assert.match(asset.prompt, /first and last frame strictly identical/i);
      assert.doesNotMatch(asset.prompt, /10 seconds|ten seconds|duration|max/i);
      assert.ok(asset.placement.length > 0);
      assert.ok(asset.title.length > 0);
      assert.match(asset.image, /\.png$/);
      assert.ok(asset.trigger === "hover" || asset.trigger === "slow-loop");
    }
  });
});
