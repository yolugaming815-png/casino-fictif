export type LobbyPlayerSummary = {
  uid: string;
  displayName: string;
  photoURL?: string;
  balance?: number;
  updatedAt?: unknown;
};

export type LobbyRoomSummary = {
  id?: string;
  type?: string;
  game: string;
  status: "waiting" | "playing" | "finished";
  hostUid?: string;
  hostName: string;
  players?: Array<{ uid: string; displayName: string }>;
  playerIds?: string[];
  maxPlayers: number;
  winnerName?: string;
  pokerWinnerName?: string;
  pokerWinnerNames?: string[];
  pokerPot?: number;
  russianPot?: number;
  updatedAt?: unknown;
  createdAt?: unknown;
};

export type LobbyHistorySummary = {
  id: number;
  game: string;
  net: number;
  bet?: number;
};

export type LobbyActivityFeedItem = {
  id: string;
  displayName: string;
  message: string;
  tone: "gain" | "loss" | "neutral" | "room";
  uid?: string;
  photoURL?: string;
};

export function countKnownLobbyPlayers(leaderboard: LobbyPlayerSummary[], rooms: LobbyRoomSummary[]) {
  const playerIds = new Set<string>();

  leaderboard.forEach((entry) => {
    if (entry.uid) {
      playerIds.add(entry.uid);
    }
  });

  rooms.forEach((room) => {
    if (room.hostUid) {
      playerIds.add(room.hostUid);
    }

    room.playerIds?.forEach((uid) => {
      if (uid) {
        playerIds.add(uid);
      }
    });

    room.players?.forEach((player) => {
      if (player.uid) {
        playerIds.add(player.uid);
      }
    });
  });

  return playerIds.size;
}

export function buildLobbyActivityFeed({
  currentPlayerName,
  leaderboard,
  rooms,
  histories,
  limit = 5,
}: {
  currentPlayerName: string;
  leaderboard: LobbyPlayerSummary[];
  rooms: LobbyRoomSummary[];
  histories: LobbyHistorySummary[];
  limit?: number;
}) {
  const playerById = new Map(leaderboard.map((entry) => [entry.uid, entry]));
  const roomItems = rooms.slice(0, limit).map((room, index): LobbyActivityFeedItem => {
    const playerCount = Math.max(room.players?.length ?? 0, room.playerIds?.length ?? 0);
    const winnerName = room.winnerName ?? room.pokerWinnerName ?? room.pokerWinnerNames?.[0];
    const host = room.hostName || "Un joueur";
    const hostProfile = room.hostUid ? playerById.get(room.hostUid) : undefined;

    return {
      id: `room-${room.id ?? index}`,
      uid: room.hostUid,
      photoURL: hostProfile?.photoURL,
      displayName: host,
      message:
        room.status === "finished" && winnerName
          ? `${winnerName} gagne ${room.game}.`
          : room.status === "playing"
            ? `${host} lance ${room.game} avec ${playerCount}/${room.maxPlayers} joueurs.`
            : `${host} ouvre ${room.game} (${playerCount}/${room.maxPlayers}).`,
      tone: "room",
    };
  });

  const historyItems = histories
    .slice()
    .sort((left, right) => right.id - left.id)
    .slice(0, limit)
    .map((history): LobbyActivityFeedItem => {
      const amount = Math.abs(Math.round(history.net)).toLocaleString("fr-FR");

      return {
        id: `history-${history.game}-${history.id}`,
        displayName: currentPlayerName,
        message:
          history.net > 0
            ? `${currentPlayerName} gagne ${amount} credits sur ${history.game}.`
            : history.net < 0
              ? `${currentPlayerName} perd ${amount} credits sur ${history.game}.`
              : `${currentPlayerName} termine ${history.game} sans gain.`,
        tone: history.net > 0 ? "gain" : history.net < 0 ? "loss" : "neutral",
      };
    });

  const leaderboardItems = leaderboard.slice(0, limit).map((entry, index): LobbyActivityFeedItem => ({
    id: `leaderboard-${entry.uid}-${index}`,
    uid: entry.uid,
    photoURL: entry.photoURL,
    displayName: entry.displayName,
    message: `${entry.displayName} est dans le classement avec ${Math.round(entry.balance ?? 0).toLocaleString("fr-FR")} credits.`,
    tone: "neutral",
  }));

  return [...roomItems, ...historyItems, ...leaderboardItems].slice(0, limit);
}
