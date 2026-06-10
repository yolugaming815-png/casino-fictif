import {
  arrayRemove,
  arrayUnion,
  collection,
  documentId,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type { CasinoUser } from "./firebaseClient";

export type FeedReactionEmoji = "clap" | "laugh" | "fire";

export const FEED_REACTION_EMOJIS: FeedReactionEmoji[] = ["clap", "laugh", "fire"];

export type FeedReactionState = {
  clap: string[];
  laugh: string[];
  fire: string[];
};

const REACTIONS_COLLECTION = "feedReactions";
const FIRESTORE_IN_CHUNK_SIZE = 10;

// Import dynamique : firebaseClient depend de Vite (import.meta.env), ce qui le rend
// inchargeable sous node --test. Les helpers purs de ce module restent testables.
async function resolveDb(): Promise<Firestore | null> {
  const { getCasinoDb } = await import("./firebaseClient");
  return getCasinoDb();
}

function parseReactionUids(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((uid): uid is string => typeof uid === "string" && uid.length > 0);
}

export function encodeFeedEventId(eventId: string): string {
  return eventId.replace(/[^\w-]/g, "_").slice(0, 180);
}

export function chunkFeedEventIds(encodedIds: string[]): string[][] {
  const uniqueIds = [...new Set(encodedIds.filter((id) => id.length > 0))];
  const chunks: string[][] = [];

  for (let index = 0; index < uniqueIds.length; index += FIRESTORE_IN_CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(index, index + FIRESTORE_IN_CHUNK_SIZE));
  }

  return chunks;
}

export function parseFeedReactionDoc(data: Record<string, unknown>): FeedReactionState {
  const reactions = (data.reactions ?? {}) as Record<string, unknown>;

  return {
    clap: parseReactionUids(reactions.clap),
    laugh: parseReactionUids(reactions.laugh),
    fire: parseReactionUids(reactions.fire),
  };
}

export function subscribeFeedReactions(
  eventIds: string[],
  onChange: (reactionsByEventId: Record<string, FeedReactionState>) => void,
): () => void {
  const eventIdByEncodedId = new Map<string, string>();
  eventIds.forEach((eventId) => {
    const encodedId = encodeFeedEventId(eventId);
    if (encodedId && !eventIdByEncodedId.has(encodedId)) {
      eventIdByEncodedId.set(encodedId, eventId);
    }
  });

  const chunks = chunkFeedEventIds([...eventIdByEncodedId.keys()]);
  if (chunks.length === 0) {
    onChange({});
    return () => undefined;
  }

  let unsubscribes: Array<() => void> = [];
  let canceled = false;

  void resolveDb().then((db) => {
    if (!db) {
      onChange({});
      return;
    }

    if (canceled) {
      return;
    }

    const reactionsByEventId: Record<string, FeedReactionState> = {};

    unsubscribes = chunks.map((chunkIds) =>
      onSnapshot(
        query(collection(db, REACTIONS_COLLECTION), where(documentId(), "in", chunkIds)),
        (snapshot) => {
          chunkIds.forEach((encodedId) => {
            const eventId = eventIdByEncodedId.get(encodedId);
            if (eventId) {
              delete reactionsByEventId[eventId];
            }
          });

          snapshot.docs.forEach((reactionDoc) => {
            const eventId = eventIdByEncodedId.get(reactionDoc.id);
            if (eventId) {
              reactionsByEventId[eventId] = parseFeedReactionDoc(reactionDoc.data());
            }
          });

          onChange({ ...reactionsByEventId });
        },
        () => {
          // Lecture refusee ou indisponible : on garde le feed sans reactions pour ce chunk.
        },
      ),
    );
  });

  return () => {
    canceled = true;
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export async function toggleFeedReaction(
  user: CasinoUser,
  eventId: string,
  emoji: FeedReactionEmoji,
  currentlyReacted: boolean,
): Promise<void> {
  const db = await resolveDb();
  if (!db) {
    return;
  }

  const encodedId = encodeFeedEventId(eventId);
  if (!encodedId) {
    return;
  }

  await setDoc(
    doc(db, REACTIONS_COLLECTION, encodedId),
    {
      eventId,
      reactions: {
        [emoji]: currentlyReacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function hasReacted(state: FeedReactionState | undefined, emoji: FeedReactionEmoji, uid: string | undefined): boolean {
  if (!state || !uid) {
    return false;
  }

  return (state[emoji] ?? []).includes(uid);
}
