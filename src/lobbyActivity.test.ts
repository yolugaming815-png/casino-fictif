import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLobbyActivityFeed, countKnownLobbyPlayers } from "./lobbyActivity.ts";

describe("lobby activity feed", () => {
  it("counts real known players from leaderboard and online rooms without duplicates", () => {
    const count = countKnownLobbyPlayers(
      [
        { uid: "u1", displayName: "Daniel" },
        { uid: "u2", displayName: "Yoann" },
      ],
      [
        {
          hostUid: "u1",
          players: [
            { uid: "u1", displayName: "Daniel" },
            { uid: "u3", displayName: "Lucas" },
          ],
          playerIds: ["u1", "u3", "u4"],
        },
      ],
    );

    assert.equal(count, 4);
  });

  it("builds a feed from active rooms and recent wins or losses", () => {
    const items = buildLobbyActivityFeed({
      currentPlayerUid: "u1",
      currentPlayerName: "Daniel",
      currentPlayerPhotoURL: "casino-avatar:daniel",
      leaderboard: [
        { uid: "u1", displayName: "Daniel", balance: 1200, photoURL: "casino-avatar:daniel" },
        { uid: "u2", displayName: "Yoann", balance: 900, photoURL: "casino-avatar:yoann" },
      ],
      rooms: [
        {
          id: "room-1",
          type: "duel",
          game: "Duel Plinko",
          status: "playing",
          hostUid: "u2",
          hostName: "Yoann",
          players: [
            { uid: "u2", displayName: "Yoann" },
            { uid: "u1", displayName: "Daniel" },
          ],
          maxPlayers: 2,
          updatedAt: 2000,
        },
      ],
      histories: [
        { id: 8, game: "Plinko", net: 175, bet: 25 },
        { id: 9, game: "Rocket", net: -50, bet: 50 },
      ],
    });

    assert.deepEqual(
      items.slice(0, 3).map((item) => item.message),
      [
        "Yoann lance Duel Plinko avec 2/2 joueurs.",
        "Daniel perd 50 credits sur Rocket.",
        "Daniel gagne 175 credits sur Plinko.",
      ],
    );
    assert.equal(items[0].photoURL, "casino-avatar:yoann");
    assert.equal(items[1].photoURL, "casino-avatar:daniel");
  });

  it("does not fabricate decorative leaderboard activity", () => {
    const items = buildLobbyActivityFeed({
      currentPlayerName: "Daniel",
      leaderboard: [{ uid: "u1", displayName: "Daniel", balance: 1200, photoURL: "casino-avatar:daniel" }],
      rooms: [],
      histories: [],
    });

    assert.deepEqual(items, []);
  });

  it("uses the winner identity and avatar for finished rooms", () => {
    const items = buildLobbyActivityFeed({
      currentPlayerName: "Daniel",
      leaderboard: [
        { uid: "host", displayName: "Host", photoURL: "casino-avatar:host" },
        { uid: "winner", displayName: "Gagnant", photoURL: "casino-avatar:winner" },
      ],
      rooms: [
        {
          id: "roulette-room",
          type: "russian-roulette",
          game: "Roulette russe",
          status: "finished",
          hostUid: "host",
          hostName: "Host",
          winnerUid: "winner",
          winnerName: "Gagnant",
          players: [
            { uid: "host", displayName: "Host" },
            { uid: "winner", displayName: "Gagnant" },
          ],
          playerIds: ["host", "winner"],
          maxPlayers: 6,
          russianPot: 120,
          updatedAt: 3000,
        },
      ],
      histories: [],
    });

    assert.equal(items[0]?.message, "Gagnant gagne 120 credits sur Roulette russe.");
    assert.equal(items[0]?.uid, "winner");
    assert.equal(items[0]?.photoURL, "casino-avatar:winner");
  });
});
