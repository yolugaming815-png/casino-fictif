import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunkFeedEventIds, encodeFeedEventId, hasReacted, parseFeedReactionDoc } from "./feedReactions.ts";

describe("feed reactions", () => {
  it("encodes event ids into safe firestore document ids", () => {
    assert.equal(encodeFeedEventId("room-abc123-winner-u1"), "room-abc123-winner-u1");
    assert.equal(encodeFeedEventId("room/abc#1:shot u2"), "room_abc_1_shot_u2");
    assert.equal(encodeFeedEventId("history-Roulette russe-42"), "history-Roulette_russe-42");
  });

  it("caps encoded ids at 180 characters", () => {
    const longId = "x".repeat(400);

    assert.equal(encodeFeedEventId(longId).length, 180);
  });

  it("keeps encoding deterministic for identical events", () => {
    const eventId = "room-r1-shot-u9-3";

    assert.equal(encodeFeedEventId(eventId), encodeFeedEventId(eventId));
  });

  it("chunks event ids by 10 for firestore in queries", () => {
    const ids = Array.from({ length: 23 }, (_, index) => `event-${index}`);
    const chunks = chunkFeedEventIds(ids);

    assert.equal(chunks.length, 3);
    assert.deepEqual(
      chunks.map((chunk) => chunk.length),
      [10, 10, 3],
    );
    assert.deepEqual(chunks.flat(), ids);
  });

  it("drops empty and duplicate ids before chunking", () => {
    assert.deepEqual(chunkFeedEventIds(["a", "", "b", "a"]), [["a", "b"]]);
    assert.deepEqual(chunkFeedEventIds([]), []);
  });

  it("parses reaction docs and ignores malformed values", () => {
    const state = parseFeedReactionDoc({
      eventId: "room-r1",
      reactions: { clap: ["u1", 42, ""], fire: "broken" },
    });

    assert.deepEqual(state, { clap: ["u1"], laugh: [], fire: [] });
  });

  it("detects whether a player already reacted", () => {
    const state = parseFeedReactionDoc({ reactions: { laugh: ["u1", "u2"] } });

    assert.equal(hasReacted(state, "laugh", "u2"), true);
    assert.equal(hasReacted(state, "fire", "u2"), false);
    assert.equal(hasReacted(undefined, "laugh", "u2"), false);
    assert.equal(hasReacted(state, "laugh", undefined), false);
  });
});
