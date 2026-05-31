import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";
import { SPECIAL_CHESTS } from "./caseLogic.ts";
import { SHOP_ITEMS } from "./shopLogic.ts";
import { getRocketShipArtCell, getSpecialChestArtCell } from "./shopVisualAssets.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("shop asset coverage", () => {
  it("has png previews for every ball and blackjack card skin", () => {
    for (const item of SHOP_ITEMS.filter((item) => item.category === "plinkoBall")) {
      assert.equal(existsSync(`${root}/src/assets/plinko/${item.id}.png`), true, item.id);
    }

    for (const item of SHOP_ITEMS.filter((item) => item.category === "rouletteBall")) {
      assert.equal(existsSync(`${root}/src/assets/roulette/${item.id}.png`), true, item.id);
    }

    for (const item of SHOP_ITEMS.filter((item) => item.category === "cardBack")) {
      assert.equal(existsSync(`${root}/src/assets/blackjack/${item.id}-back.png`), true, `${item.id} back`);
      assert.equal(existsSync(`${root}/src/assets/blackjack/art/${item.id}-art.png`), true, `${item.id} art atlas`);
    }
  });

  it("keeps Plinko ball png previews visibly filled", () => {
    for (const item of SHOP_ITEMS.filter((item) => item.category === "plinkoBall")) {
      const visibleRatio = getPngAlphaCoverage(`${root}/src/assets/plinko/${item.id}.png`);

      assert.ok(visibleRatio > 0.5, `${item.id} visible alpha ratio ${visibleRatio.toFixed(3)}`);
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

function getPngAlphaCoverage(path: string): number {
  const png = readFileSync(path);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} png signature`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      const interlace = data.readUInt8(12);

      assert.equal(bitDepth, 8, `${path} bit depth`);
      assert.equal(colorType, 6, `${path} color type`);
      assert.equal(interlace, 0, `${path} interlace`);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  assert.equal(colorType, 6, `${path} must be RGBA`);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  let sourceOffset = 0;
  let visiblePixels = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated.readUInt8(sourceOffset);
    sourceOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated.readUInt8(sourceOffset + x);
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;

      current[x] =
        (raw +
          (filter === 1
            ? left
            : filter === 2
              ? up
              : filter === 3
                ? Math.floor((left + up) / 2)
                : filter === 4
                  ? paeth(left, up, upLeft)
                  : 0)) &
        255;
    }

    for (let x = 3; x < stride; x += bytesPerPixel) {
      if (current[x] > 10) {
        visiblePixels += 1;
      }
    }

    current.copy(previous);
    sourceOffset += stride;
  }

  return visiblePixels / (width * height);
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}
