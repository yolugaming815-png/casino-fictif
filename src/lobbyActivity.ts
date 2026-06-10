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
  players?: Array<{ uid: string; displayName: string; photoURL?: string }>;
  playerIds?: string[];
  maxPlayers: number;
  winnerUid?: string;
  winnerName?: string;
  pokerWinnerUid?: string;
  pokerWinnerName?: string;
  pokerWinnerUids?: string[];
  pokerWinnerNames?: string[];
  pokerPot?: number;
  russianPot?: number;
  russianShots?: Array<{ uid: string; displayName: string; survived: boolean; amount: number; round?: number }>;
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

type LobbyActivityCandidate = LobbyActivityFeedItem & {
  sortValue: number;
};

function timestampToMillis(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
}

function normalizeName(name: string | undefined) {
  return (name ?? "").trim().toLocaleLowerCase("fr-FR");
}

function formatCredits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

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
  currentPlayerUid,
  currentPlayerName,
  currentPlayerPhotoURL,
  leaderboard,
  rooms,
  histories,
  limit = 5,
}: {
  currentPlayerUid?: string;
  currentPlayerName: string;
  currentPlayerPhotoURL?: string;
  leaderboard: LobbyPlayerSummary[];
  rooms: LobbyRoomSummary[];
  histories: LobbyHistorySummary[];
  limit?: number;
}) {
  const playerById = new Map<string, LobbyPlayerSummary>();
  const playerByName = new Map<string, LobbyPlayerSummary>();

  const rememberPlayer = (player: LobbyPlayerSummary | undefined) => {
    if (!player?.uid && !player?.displayName) {
      return;
    }

    const existingById = player.uid ? playerById.get(player.uid) : undefined;
    const merged = existingById
      ? {
          ...existingById,
          displayName: existingById.displayName || player.displayName,
          photoURL: existingById.photoURL || player.photoURL,
        }
      : player;

    if (merged.uid) {
      playerById.set(merged.uid, merged);
    }

    const nameKey = normalizeName(merged.displayName);
    if (nameKey && (!playerByName.has(nameKey) || merged.photoURL)) {
      playerByName.set(nameKey, merged);
    }
  };

  leaderboard.forEach(rememberPlayer);
  rooms.forEach((room) => {
    room.players?.forEach((player) => rememberPlayer(player));
  });
  rememberPlayer({
    uid: currentPlayerUid ?? "",
    displayName: currentPlayerName || "Joueur",
    photoURL: currentPlayerPhotoURL,
  });

  const resolvePlayer = (uid: string | undefined, displayName: string | undefined) => {
    const byId = uid ? playerById.get(uid) : undefined;
    const byName = playerByName.get(normalizeName(displayName));

    return {
      uid: byId?.uid || uid || byName?.uid,
      displayName: byId?.displayName || byName?.displayName || displayName || "Un joueur",
      photoURL: byId?.photoURL || byName?.photoURL,
    };
  };

  const stableRoomKey = (room: LobbyRoomSummary) =>
    room.id ?? `${room.type ?? "room"}-${room.hostUid ?? normalizeName(room.hostName)}-${normalizeName(room.game)}`;

  const roomItems = rooms.map((room, index): LobbyActivityCandidate => {
    const roomKey = stableRoomKey(room);
    const playerCount = Math.max(room.players?.length ?? 0, room.playerIds?.length ?? 0);
    const latestRussianShot = room.russianShots?.at(-1);
    const winnerUid = room.winnerUid ?? room.pokerWinnerUid ?? room.pokerWinnerUids?.[0];
    const winnerName = room.winnerName ?? room.pokerWinnerName ?? room.pokerWinnerNames?.[0];
    const hostProfile = resolvePlayer(room.hostUid, room.hostName);
    const finishedWinner = resolvePlayer(winnerUid, winnerName);
    const shotPlayer = resolvePlayer(latestRussianShot?.uid, latestRussianShot?.displayName);
    const sortValue = timestampToMillis(room.updatedAt) || timestampToMillis(room.createdAt) || index;

    if (room.type === "russian-roulette" && room.status === "playing" && latestRussianShot) {
      return {
        id: `room-${roomKey}-shot-${latestRussianShot.uid}-${latestRussianShot.round ?? room.russianShots?.length ?? 0}`,
        uid: shotPlayer.uid,
        photoURL: shotPlayer.photoURL,
        displayName: shotPlayer.displayName,
        message: latestRussianShot.survived
          ? `${shotPlayer.displayName} survit a ${room.game}.`
          : `${shotPlayer.displayName} perd ${formatCredits(latestRussianShot.amount)} credits sur ${room.game}.`,
        tone: latestRussianShot.survived ? "neutral" : "loss",
        sortValue,
      };
    }

    if (room.status === "finished" && (finishedWinner.uid || winnerName)) {
      const pot = room.type === "poker" ? room.pokerPot ?? 0 : room.type === "russian-roulette" ? room.russianPot ?? 0 : 0;

      return {
        id: `room-${roomKey}-winner-${finishedWinner.uid ?? normalizeName(finishedWinner.displayName)}`,
        uid: finishedWinner.uid,
        photoURL: finishedWinner.photoURL,
        displayName: finishedWinner.displayName,
        message: pot > 0 ? `${finishedWinner.displayName} gagne ${formatCredits(pot)} credits sur ${room.game}.` : `${finishedWinner.displayName} gagne ${room.game}.`,
        tone: "gain",
        sortValue,
      };
    }

    return {
      id: `room-${roomKey}`,
      uid: hostProfile.uid,
      photoURL: hostProfile.photoURL,
      displayName: hostProfile.displayName,
      message:
        room.status === "finished"
          ? `${hostProfile.displayName} termine ${room.game}.`
          : room.status === "playing"
          ? `${hostProfile.displayName} lance ${room.game} avec ${playerCount}/${room.maxPlayers} joueurs.`
          : `${hostProfile.displayName} ouvre ${room.game} (${playerCount}/${room.maxPlayers}).`,
      tone: "room",
      sortValue,
    };
  });

  const historyItems = histories
    .map((history): LobbyActivityCandidate => {
      const amount = Math.abs(Math.round(history.net)).toLocaleString("fr-FR");
      const currentPlayer = resolvePlayer(currentPlayerUid, currentPlayerName);

      return {
        id: `history-${history.game}-${history.id}`,
        uid: currentPlayer.uid,
        photoURL: currentPlayer.photoURL,
        displayName: currentPlayer.displayName,
        message:
          history.net > 0
            ? `${currentPlayer.displayName} gagne ${amount} credits sur ${history.game}.`
            : history.net < 0
              ? `${currentPlayer.displayName} perd ${amount} credits sur ${history.game}.`
              : `${currentPlayer.displayName} termine ${history.game} sans gain.`,
        tone: history.net > 0 ? "gain" : history.net < 0 ? "loss" : "neutral",
        sortValue: history.id,
      };
    });

  return [...roomItems, ...historyItems]
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, limit)
    .map(({ sortValue: _sortValue, ...item }) => item);
}
