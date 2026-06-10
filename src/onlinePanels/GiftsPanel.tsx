import { useCallback, useEffect, useMemo, useState } from "react";
import appStyles from "../App.module.css";
import styles from "./GiftsPanel.module.css";
import type { CasinoUser, LeaderboardEntry } from "../firebaseClient";
import {
  GIFT_DAILY_CAP,
  GIFT_MESSAGE_MAX_LENGTH,
  claimGift,
  loadDailyGiftTotal,
  makeItRain,
  pickRainRecipients,
  sendGift,
  type GiftEntry,
} from "../gifts";

/**
 * Props du panneau Cadeaux (Vague 3 : l'intégrateur branche ce composant dans App.tsx).
 *
 * - `user` / `balance` : joueur connecté et son solde courant (pour désactiver les envois trop chers).
 * - `friends` : destinataires possibles d'un cadeau direct.
 * - `leaderboard` : entrées complètes du leaderboard ; makeItRain filtre lui-même les joueurs actifs.
 * - `incomingGifts` : gifts `status === "pending"` adressés au joueur (via subscribeIncomingGifts côté parent).
 * - `onClaim(gift)` : appelé APRÈS claimGift réussi — le PARENT crédite le solde (+gift.amount) et toaste.
 * - `onSent(amount)` : appelé APRÈS sendGift/makeItRain réussi — le PARENT débite le solde du montant total.
 *
 * Le composant ne touche jamais au solde lui-même : seul Firestore (gifts/*) est écrit ici.
 */
export type GiftsPanelProps = {
  user: CasinoUser;
  balance: number;
  friends: Array<{ uid: string; displayName: string }>;
  leaderboard: LeaderboardEntry[];
  incomingGifts: GiftEntry[];
  onClaim: (gift: GiftEntry) => void;
  onSent: (amount: number) => void;
};

function formatCredits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

export function GiftsPanel({ user, balance, friends, leaderboard, incomingGifts, onClaim, onSent }: GiftsPanelProps) {
  const [recipientUid, setRecipientUid] = useState("");
  const [amountInput, setAmountInput] = useState("100");
  const [message, setMessage] = useState("");
  const [rainInput, setRainInput] = useState("500");
  const [dailyTotal, setDailyTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState<"send" | "rain" | string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const refreshDailyTotal = useCallback(() => {
    loadDailyGiftTotal(user.uid)
      .then(setDailyTotal)
      .catch(() => setDailyTotal(null));
  }, [user.uid]);

  useEffect(() => {
    refreshDailyTotal();
  }, [refreshDailyTotal]);

  const selectedFriend = useMemo(
    () => friends.find((friend) => friend.uid === recipientUid) ?? null,
    [friends, recipientUid],
  );
  const amount = Math.floor(Number(amountInput) || 0);
  const rainAmount = Math.floor(Number(rainInput) || 0);
  const capRemaining = dailyTotal === null ? null : Math.max(0, GIFT_DAILY_CAP - dailyTotal);
  const activeRecipients = useMemo(() => pickRainRecipients(user.uid, leaderboard), [user.uid, leaderboard]);

  const canSend =
    busy === null && selectedFriend !== null && amount >= 1 && amount <= balance && (capRemaining === null || amount <= capRemaining);
  const canRain =
    busy === null && rainAmount >= 1 && rainAmount <= balance && (capRemaining === null || rainAmount <= capRemaining);

  const handleSend = () => {
    if (!selectedFriend || busy) {
      return;
    }
    setBusy("send");
    setStatus(null);
    sendGift(user, selectedFriend, amount, message)
      .then(() => {
        onSent(amount);
        setMessage("");
        setStatus({ kind: "ok", text: `Cadeau de ${formatCredits(amount)} crédits envoyé à ${selectedFriend.displayName} !` });
        refreshDailyTotal();
      })
      .catch((error: unknown) => {
        setStatus({ kind: "error", text: error instanceof Error ? error.message : "Envoi du cadeau impossible." });
      })
      .finally(() => setBusy(null));
  };

  const handleRain = () => {
    if (busy) {
      return;
    }
    setBusy("rain");
    setStatus(null);
    makeItRain(user, rainAmount, leaderboard)
      .then(({ recipients, perPlayer }) => {
        const total = perPlayer * recipients.length;
        onSent(total);
        setStatus({
          kind: "ok",
          text: `💸 Il pleut ! ${recipients.length} joueur${recipients.length > 1 ? "s" : ""} arrosé${recipients.length > 1 ? "s" : ""} (+${formatCredits(perPlayer)} chacun, ${formatCredits(total)} au total).`,
        });
        refreshDailyTotal();
      })
      .catch((error: unknown) => {
        setStatus({ kind: "error", text: error instanceof Error ? error.message : "La pluie de crédits a échoué." });
      })
      .finally(() => setBusy(null));
  };

  const handleClaim = (gift: GiftEntry) => {
    if (busy) {
      return;
    }
    setBusy(gift.id);
    setStatus(null);
    claimGift(gift, user.uid)
      .then(() => {
        onClaim(gift);
      })
      .catch((error: unknown) => {
        setStatus({ kind: "error", text: error instanceof Error ? error.message : "Récupération du cadeau impossible." });
      })
      .finally(() => setBusy(null));
  };

  return (
    <section className={`${appStyles.panel} ${styles.giftsPanel}`}>
      <h2>🎁 Cadeaux entre amis</h2>
      <p className={styles.capLine}>
        {capRemaining === null
          ? `Limite quotidienne : ${formatCredits(GIFT_DAILY_CAP)} crédits offerts par jour.`
          : `Tu peux encore offrir ${formatCredits(capRemaining)} / ${formatCredits(GIFT_DAILY_CAP)} crédits aujourd'hui.`}
      </p>

      <div className={appStyles.controls}>
        <label>
          Ami
          <select value={recipientUid} onChange={(event) => setRecipientUid(event.target.value)} disabled={busy !== null}>
            <option value="">— Choisir un ami —</option>
            {friends.map((friend) => (
              <option key={friend.uid} value={friend.uid}>
                {friend.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Montant
          <input
            type="number"
            min={1}
            max={GIFT_DAILY_CAP}
            step={1}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            disabled={busy !== null}
          />
        </label>
        <button type="button" className={appStyles.primaryButton} onClick={handleSend} disabled={!canSend}>
          {busy === "send" ? "Envoi…" : "Envoyer 🎁"}
        </button>
      </div>
      <label className={styles.messageField}>
        Message (optionnel, {GIFT_MESSAGE_MAX_LENGTH} caractères max)
        <input
          type="text"
          maxLength={GIFT_MESSAGE_MAX_LENGTH}
          placeholder="Un petit mot pour accompagner le cadeau…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={busy !== null}
        />
      </label>

      <div className={styles.rainBlock}>
        <div className={styles.rainInfo}>
          <strong>Faire pleuvoir 💸</strong>
          <span>
            Montant total réparti entre les joueurs actifs ({activeRecipients.length} en ligne ces 10 dernières minutes).
          </span>
        </div>
        <div className={appStyles.controls}>
          <label>
            Total
            <input
              type="number"
              min={1}
              max={GIFT_DAILY_CAP}
              step={1}
              value={rainInput}
              onChange={(event) => setRainInput(event.target.value)}
              disabled={busy !== null}
            />
          </label>
          <button type="button" className={appStyles.secondaryButton} onClick={handleRain} disabled={!canRain}>
            {busy === "rain" ? "Pluie en cours…" : "Faire pleuvoir 💸"}
          </button>
        </div>
      </div>

      {status ? (
        <p className={status.kind === "ok" ? styles.statusOk : styles.statusError} role="status">
          {status.text}
        </p>
      ) : null}

      <h3 className={styles.incomingTitle}>Cadeaux reçus en attente</h3>
      {incomingGifts.length === 0 ? (
        <p className={styles.emptyLine}>Aucun cadeau en attente pour le moment.</p>
      ) : (
        <ul className={styles.giftList}>
          {incomingGifts.map((gift) => (
            <li key={gift.id} className={styles.giftItem}>
              <div className={styles.giftMeta}>
                <span className={styles.giftFrom}>
                  {gift.kind === "rain" ? "💸 Pluie de" : "🎁 Cadeau de"} <strong>{gift.fromDisplayName}</strong>
                </span>
                {gift.message ? <span className={styles.giftMessage}>« {gift.message} »</span> : null}
              </div>
              <button
                type="button"
                className={appStyles.primaryButton}
                onClick={() => handleClaim(gift)}
                disabled={busy !== null}
              >
                {busy === gift.id ? "…" : `Récupérer +${formatCredits(gift.amount)}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default GiftsPanel;
