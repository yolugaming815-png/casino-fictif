import { useState } from "react";
import styles from "./ReactionBar.module.css";
import type { CasinoUser } from "../firebaseClient";
import { FEED_REACTION_EMOJIS, toggleFeedReaction, type FeedReactionEmoji } from "../feedReactions";

/**
 * Props de la barre de réactions d'un évènement du feed (Vague 3 : rendue sous chaque item du feed).
 *
 * - `user` : joueur connecté (null interdit — ne rendre la barre que connecté). Sert à savoir
 *   si « j'ai réagi » et à signer le toggle Firestore.
 * - `eventId` : id STABLE de l'évènement du feed (cf. lobbyActivity.ts) — encodé côté feedReactions.
 * - `reactions` : listes d'uids par emoji pour cet évènement (via subscribeFeedReactions côté parent).
 *   Le compteur affiché vient de ces listes ; le toggle est optimiste le temps de l'aller-retour.
 */
export type ReactionBarProps = {
  user: CasinoUser;
  eventId: string;
  reactions: Record<FeedReactionEmoji, string[]>;
};

const EMOJI_GLYPHS: Record<FeedReactionEmoji, string> = {
  clap: "👏",
  laugh: "😂",
  fire: "🔥",
};

const EMOJI_LABELS: Record<FeedReactionEmoji, string> = {
  clap: "Applaudir",
  laugh: "Rire",
  fire: "Enflammer",
};

export function ReactionBar({ user, eventId, reactions }: ReactionBarProps) {
  const [pending, setPending] = useState<FeedReactionEmoji | null>(null);

  const handleToggle = (emoji: FeedReactionEmoji, currentlyReacted: boolean) => {
    if (pending) {
      return;
    }
    setPending(emoji);
    toggleFeedReaction(user, eventId, emoji, currentlyReacted)
      .catch(() => {
        // Écriture refusée ou hors-ligne : le compteur reste piloté par l'abonnement parent.
      })
      .finally(() => setPending(null));
  };

  return (
    <div className={styles.reactionBar} role="group" aria-label="Réactions">
      {FEED_REACTION_EMOJIS.map((emoji) => {
        const uids = reactions[emoji] ?? [];
        const reacted = uids.includes(user.uid);

        return (
          <button
            key={emoji}
            type="button"
            className={`${styles.reactionButton} ${reacted ? styles.reactionActive : ""}`}
            onClick={() => handleToggle(emoji, reacted)}
            disabled={pending !== null}
            aria-pressed={reacted}
            title={EMOJI_LABELS[emoji]}
          >
            <span aria-hidden="true">{EMOJI_GLYPHS[emoji]}</span>
            {uids.length > 0 ? <span className={styles.reactionCount}>{uids.length}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export default ReactionBar;
