import { useMemo, useState } from "react";
import appStyles from "../App.module.css";
import styles from "./FriendBetsPanel.module.css";
import type { CasinoUser } from "../firebaseClient";
import {
  FRIEND_BET_MAX_STAKE,
  FRIEND_BET_MIN_STAKE,
  FRIEND_BET_TITLE_MAX_LENGTH,
  answerFriendBet,
  createFriendBet,
  declareFriendBetWinner,
  voteCancelFriendBet,
  type FriendBetEntry,
} from "../friendBets";

/**
 * Props du panneau Paris entre amis (Vague 3 : l'intégrateur branche ce composant dans App.tsx).
 *
 * - `user` / `balance` : joueur connecté et son solde (utilisé pour bloquer la création/acceptation
 *   d'un pari dont la mise dépasse le solde — l'escrow réel est géré par le parent).
 * - `friends` : adversaires possibles pour un nouveau pari.
 * - `bets` : tous les paris où le joueur participe (via subscribeFriendBets côté parent).
 * - `onAction()` : appelé après chaque écriture Firestore réussie (création, réponse, déclaration,
 *   vote d'annulation). Le PARENT applique débits/crédits via computeFriendBetSettlements ;
 *   ce composant ne touche jamais au solde.
 */
export type FriendBetsPanelProps = {
  user: CasinoUser;
  balance: number;
  friends: Array<{ uid: string; displayName: string }>;
  bets: FriendBetEntry[];
  onAction: () => void;
};

function formatCredits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

function opponentNameOf(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.opponentName : bet.creatorName;
}

function opponentUidOf(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.opponentUid : bet.creatorUid;
}

function myDeclaration(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.creatorDeclaredUid : bet.opponentDeclaredUid;
}

function otherDeclaration(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.opponentDeclaredUid : bet.creatorDeclaredUid;
}

function myCancelVote(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.creatorCancelVote : bet.opponentCancelVote;
}

function otherCancelVote(bet: FriendBetEntry, uid: string) {
  return bet.creatorUid === uid ? bet.opponentCancelVote : bet.creatorCancelVote;
}

export function FriendBetsPanel({ user, balance, friends, bets, onAction }: FriendBetsPanelProps) {
  const [title, setTitle] = useState("");
  const [stakeInput, setStakeInput] = useState(String(FRIEND_BET_MIN_STAKE));
  const [opponentUid, setOpponentUid] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stake = Math.floor(Number(stakeInput) || 0);
  const selectedOpponent = useMemo(
    () => friends.find((friend) => friend.uid === opponentUid) ?? null,
    [friends, opponentUid],
  );

  const incomingProposals = useMemo(
    () => bets.filter((bet) => bet.status === "proposed" && bet.opponentUid === user.uid),
    [bets, user.uid],
  );
  const outgoingProposals = useMemo(
    () => bets.filter((bet) => bet.status === "proposed" && bet.creatorUid === user.uid),
    [bets, user.uid],
  );
  const activeBets = useMemo(() => bets.filter((bet) => bet.status === "active"), [bets]);
  const finishedBets = useMemo(
    () => bets.filter((bet) => bet.status === "resolved" || bet.status === "canceled" || bet.status === "declined"),
    [bets],
  );

  const canCreate =
    busy === null &&
    selectedOpponent !== null &&
    title.trim().length > 0 &&
    stake >= FRIEND_BET_MIN_STAKE &&
    stake <= FRIEND_BET_MAX_STAKE &&
    stake <= balance;

  const run = (key: string, action: () => Promise<unknown>, onDone?: () => void) => {
    if (busy) {
      return;
    }
    setBusy(key);
    setError(null);
    action()
      .then(() => {
        onDone?.();
        onAction();
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Action impossible pour le moment.");
      })
      .finally(() => setBusy(null));
  };

  const handleCreate = () => {
    if (!selectedOpponent) {
      return;
    }
    run("create", () => createFriendBet(user, selectedOpponent, title, stake), () => {
      setTitle("");
      setOpponentUid("");
    });
  };

  const renderDeclaration = (bet: FriendBetEntry) => {
    const mine = myDeclaration(bet, user.uid);
    const theirs = otherDeclaration(bet, user.uid);
    const disagreement = Boolean(mine && theirs && mine !== theirs);
    const otherUid = opponentUidOf(bet, user.uid);
    const otherName = opponentNameOf(bet, user.uid);

    return (
      <div className={styles.declareBlock}>
        <span className={styles.declareLabel}>Qui a gagné ?</span>
        <div className={styles.declareButtons}>
          <button
            type="button"
            className={mine === user.uid ? `${appStyles.primaryButton} ${styles.declareChosen}` : appStyles.secondaryButton}
            onClick={() => run(`${bet.id}:me`, () => declareFriendBetWinner(bet, user, user.uid))}
            disabled={busy !== null}
          >
            Moi
          </button>
          <button
            type="button"
            className={mine === otherUid ? `${appStyles.primaryButton} ${styles.declareChosen}` : appStyles.secondaryButton}
            onClick={() => run(`${bet.id}:him`, () => declareFriendBetWinner(bet, user, otherUid))}
            disabled={busy !== null}
          >
            Lui
          </button>
        </div>
        {mine && !theirs ? <span className={styles.waitNote}>En attente de la déclaration de {otherName}…</span> : null}
        {disagreement ? (
          <span className={styles.disagreement}>
            ⚠️ Désaccord : vos déclarations ne correspondent pas. Re-déclarez le bon vainqueur ou votez l'annulation.
          </span>
        ) : null}
        <div className={styles.cancelRow}>
          <button
            type="button"
            className={`${appStyles.secondaryButton} ${myCancelVote(bet, user.uid) ? styles.cancelVoted : ""}`}
            onClick={() => run(`${bet.id}:cancel`, () => voteCancelFriendBet(bet, user))}
            disabled={busy !== null || myCancelVote(bet, user.uid)}
          >
            {myCancelVote(bet, user.uid) ? "Annulation votée ✓" : "Voter l'annulation"}
          </button>
          {otherCancelVote(bet, user.uid) ? (
            <span className={styles.waitNote}>{otherName} a voté l'annulation.</span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderHistoryOutcome = (bet: FriendBetEntry) => {
    if (bet.status === "declined") {
      return <span className={styles.outcomeNeutral}>Refusé</span>;
    }
    if (bet.status === "canceled") {
      return <span className={styles.outcomeNeutral}>Annulé (mises remboursées)</span>;
    }
    if (bet.winnerUid === user.uid) {
      return <span className={styles.outcomeWin}>Gagné +{formatCredits(bet.stake * 2)}</span>;
    }
    return <span className={styles.outcomeLoss}>Perdu −{formatCredits(bet.stake)}</span>;
  };

  return (
    <section className={`${appStyles.panel} ${styles.friendBetsPanel}`}>
      <h2>🤝 Paris entre amis</h2>

      <div className={styles.createBlock}>
        <label className={styles.titleField}>
          Intitulé du pari
          <input
            type="text"
            maxLength={FRIEND_BET_TITLE_MAX_LENGTH}
            placeholder="Ex. : je fais x10 au crash avant toi"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy !== null}
          />
        </label>
        <div className={appStyles.controls}>
          <label>
            Mise
            <input
              type="number"
              min={FRIEND_BET_MIN_STAKE}
              max={FRIEND_BET_MAX_STAKE}
              step={1}
              value={stakeInput}
              onChange={(event) => setStakeInput(event.target.value)}
              disabled={busy !== null}
            />
          </label>
          <label>
            Adversaire
            <select value={opponentUid} onChange={(event) => setOpponentUid(event.target.value)} disabled={busy !== null}>
              <option value="">— Choisir un adversaire —</option>
              {friends.map((friend) => (
                <option key={friend.uid} value={friend.uid}>
                  {friend.displayName}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={appStyles.primaryButton} onClick={handleCreate} disabled={!canCreate}>
            {busy === "create" ? "Création…" : "Proposer le pari"}
          </button>
        </div>
        <p className={styles.hintLine}>
          Mise entre {formatCredits(FRIEND_BET_MIN_STAKE)} et {formatCredits(FRIEND_BET_MAX_STAKE)} jetons. Le vainqueur
          remporte le double de la mise.
        </p>
      </div>

      {error ? (
        <p className={styles.errorLine} role="alert">
          {error}
        </p>
      ) : null}

      {incomingProposals.length > 0 ? (
        <div className={styles.betGroup}>
          <h3>Défis reçus</h3>
          <ul className={styles.betList}>
            {incomingProposals.map((bet) => (
              <li key={bet.id} className={styles.betItem}>
                <div className={styles.betHead}>
                  <strong className={styles.betTitle}>{bet.title}</strong>
                  <span className={styles.betStake}>{formatCredits(bet.stake)} jetons</span>
                </div>
                <span className={styles.betVs}>Proposé par {bet.creatorName}</span>
                <div className={styles.answerRow}>
                  <button
                    type="button"
                    className={appStyles.primaryButton}
                    onClick={() => run(`${bet.id}:accept`, () => answerFriendBet(bet, user, true))}
                    disabled={busy !== null || bet.stake > balance}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className={appStyles.secondaryButton}
                    onClick={() => run(`${bet.id}:decline`, () => answerFriendBet(bet, user, false))}
                    disabled={busy !== null}
                  >
                    Refuser
                  </button>
                  {bet.stake > balance ? <span className={styles.waitNote}>Solde insuffisant pour la mise.</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {outgoingProposals.length > 0 ? (
        <div className={styles.betGroup}>
          <h3>Défis envoyés</h3>
          <ul className={styles.betList}>
            {outgoingProposals.map((bet) => (
              <li key={bet.id} className={styles.betItem}>
                <div className={styles.betHead}>
                  <strong className={styles.betTitle}>{bet.title}</strong>
                  <span className={styles.betStake}>{formatCredits(bet.stake)} jetons</span>
                </div>
                <span className={styles.waitNote}>En attente de la réponse de {bet.opponentName}…</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.betGroup}>
        <h3>Paris en cours</h3>
        {activeBets.length === 0 ? (
          <p className={styles.emptyLine}>Aucun pari en cours. Lance un défi à un ami !</p>
        ) : (
          <ul className={styles.betList}>
            {activeBets.map((bet) => (
              <li key={bet.id} className={styles.betItem}>
                <div className={styles.betHead}>
                  <strong className={styles.betTitle}>{bet.title}</strong>
                  <span className={styles.betStake}>{formatCredits(bet.stake)} jetons</span>
                </div>
                <span className={styles.betVs}>Contre {opponentNameOf(bet, user.uid)}</span>
                {renderDeclaration(bet)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {finishedBets.length > 0 ? (
        <div className={styles.betGroup}>
          <h3>Historique</h3>
          <ul className={styles.betList}>
            {finishedBets.map((bet) => (
              <li key={bet.id} className={`${styles.betItem} ${styles.betItemFinished}`}>
                <div className={styles.betHead}>
                  <strong className={styles.betTitle}>{bet.title}</strong>
                  {renderHistoryOutcome(bet)}
                </div>
                <span className={styles.betVs}>
                  Contre {opponentNameOf(bet, user.uid)} · mise {formatCredits(bet.stake)} jetons
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default FriendBetsPanel;
