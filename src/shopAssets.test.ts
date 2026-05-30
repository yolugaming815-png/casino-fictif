import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SHOP_ITEMS } from "./shopLogic.ts";

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
      assert.equal(existsSync(`${root}/src/assets/blackjack/${item.id}-face.png`), true, `${item.id} face`);
    }
  });
});
