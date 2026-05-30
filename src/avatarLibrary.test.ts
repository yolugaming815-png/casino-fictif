import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASINO_AVATAR_PRESETS,
  casinoAvatarToken,
  casinoAvatarUrl,
  deterministicCasinoAvatar,
  publicCasinoAvatarUrl,
} from "./avatarLibrary.ts";

describe("casino avatar library", () => {
  it("offers a rich picker collection with generated png assets", () => {
    assert.ok(CASINO_AVATAR_PRESETS.length >= 20);

    const ids = new Set(CASINO_AVATAR_PRESETS.map((preset) => preset.id));
    assert.equal(ids.size, CASINO_AVATAR_PRESETS.length);

    for (const preset of CASINO_AVATAR_PRESETS) {
      assert.ok(preset.label.length >= 4);
      assert.match(casinoAvatarUrl(preset.id), /\.png$/);
      assert.match(casinoAvatarToken(preset.id), /^casino-avatar:/);
      assert.doesNotMatch(casinoAvatarUrl(preset.id), /googleusercontent/i);
      assert.doesNotMatch(casinoAvatarUrl(preset.id), /dicebear/i);
    }
  });

  it("assigns deterministic fallback avatars to existing players", () => {
    const first = deterministicCasinoAvatar("player-123");
    const second = deterministicCasinoAvatar("player-123");
    const other = deterministicCasinoAvatar("player-456");

    assert.equal(first.id, second.id);
    assert.equal(first.url, second.url);
    assert.notEqual(first.id, other.id);
  });

  it("keeps custom non-google photos but replaces google and old preset photos", () => {
    const custom = "data:image/png;base64,abc123";
    const pickedAvatar = publicCasinoAvatarUrl(casinoAvatarToken("dragon-chip"), "seed");

    assert.equal(publicCasinoAvatarUrl(custom, "seed").url, custom);
    assert.equal(pickedAvatar.id, "dragon-chip");
    assert.match(pickedAvatar.url, /dragon-chip\.png$/);
    assert.notEqual(publicCasinoAvatarUrl("https://lh3.googleusercontent.com/a/photo", "seed").url, "");
    assert.equal(publicCasinoAvatarUrl("https://lh3.googleusercontent.com/a/photo", "seed").source, "generated");
    assert.equal(publicCasinoAvatarUrl("https://api.dicebear.com/9.x/identicon/svg?seed=spade", "seed").source, "generated");
  });
});
