import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SYMBOLS } from "./gameLogic.ts";
import { SLOT_RESULT_ASSETS, SLOT_SYMBOL_ASSETS } from "./slotAssets.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("slot asset coverage", () => {
  it("has one premium png for every reel symbol", () => {
    for (const symbol of SYMBOLS) {
      const asset = SLOT_SYMBOL_ASSETS[symbol];

      assert.ok(asset.label.length > 0, symbol);
      assert.match(asset.image, /\.png$/);
      assert.equal(existsSync(`${root}/src/assets/slots/${asset.image.split("/").at(-1)}`), true, symbol);
    }
  });

  it("has premium pngs for every payout result category", () => {
    assert.deepEqual(Object.keys(SLOT_RESULT_ASSETS), ["jackpotSeven", "tripleStar", "threeMatch", "pair", "noPair"]);

    for (const [id, asset] of Object.entries(SLOT_RESULT_ASSETS)) {
      assert.ok(asset.label.length > 0, id);
      assert.match(asset.image, /\.png$/);
      assert.equal(existsSync(`${root}/src/assets/slots/${asset.image.split("/").at(-1)}`), true, id);
    }
  });
});
