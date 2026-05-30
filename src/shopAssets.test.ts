import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SPECIAL_CHESTS } from "./caseLogic.ts";
import { SHOP_ITEMS } from "./shopLogic.ts";
import { getRocketShipArtCell, getSpecialChestArtCell } from "./shopVisualAssets.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("shop asset coverage", () => {
  it("has png previews for every public ball and blackjack card skin", () => {
    const publicItems = SHOP_ITEMS.filter((item) => item.source !== "special");

    for (const item of publicItems.filter((item) => item.category === "plinkoBall")) {
      assert.equal(existsSync(`${root}/src/assets/plinko/${item.id}.png`), true, item.id);
    }

    for (const item of publicItems.filter((item) => item.category === "rouletteBall")) {
      assert.equal(existsSync(`${root}/src/assets/roulette/${item.id}.png`), true, item.id);
    }

    for (const item of publicItems.filter((item) => item.category === "cardBack")) {
      assert.equal(existsSync(`${root}/src/assets/blackjack/${item.id}-back.png`), true, `${item.id} back`);
      assert.equal(existsSync(`${root}/src/assets/blackjack/art/${item.id}-art.png`), true, `${item.id} art atlas`);
    }
  });

  it("has atlas art for every rocket ship and special chest", () => {
    assert.equal(existsSync(`${root}/src/assets/rocket/rocket-ships-atlas.png`), true, "rocket ship atlas");
    assert.equal(existsSync(`${root}/src/assets/chests/special-chests-atlas.png`), true, "special chest atlas");

    for (const item of SHOP_ITEMS.filter((item) => item.category === "rocketShip")) {
      assert.ok(getRocketShipArtCell(item.id), `${item.id} atlas cell`);
    }

    for (const chest of SPECIAL_CHESTS) {
      assert.ok(getSpecialChestArtCell(chest.id), `${chest.id} atlas cell`);
    }
  });
});
