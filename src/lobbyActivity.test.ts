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
      currentPlayerName: "Daniel",
      leaderboard: [{ uid: "u1", displayName: "Daniel", balance: 1200 }],
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
  });
});
