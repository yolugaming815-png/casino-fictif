import { useEffect, useRef, useState } from "react";
import appStyles from "../App.module.css";
import styles from "./DuelArenaPanel.module.css";
import {
  DUEL_ROUND_BET,
  duelGameKey,
  playSeededPlinkoDuelRound,
  playSeededSlotsDuelRound,
  scoreRocketDuelRound,
  seededRocketCrashMultiplier,
  type DuelRoundIndex,
} from "../duelGameplay";
import type { CasinoUser, OnlineRoomEntry } from "../firebaseClient";

/**
 * Props du panneau d'arene de duel seede (Vague 2).
 *
 * - `room` : salle de duel en statut "playing" (ou "finished"). Le seed et la mise
 *   sont lus dans `room.raw.duelSeed` / `room.raw.duelStake` (numbers, ecrits en Vague 0).
 * - `user` : joueur connecte (null = spectateur, aucun bouton de jeu).
 * - `onPlayRound` : appele UNE fois par manche revelee avec le score de la manche
 *   (payout base sur DUEL_ROUND_BET = 100). L'integrateur (Vague 3) y branche
 *   playDuelRound(room, score) de firebaseClient.
 */
export type DuelArenaPanelProps = {
  room: OnlineRoomEntry;
  user: CasinoUser | null;
  onPlayRound: (room: OnlineRoomEntry, score: number) => Promise<void> | void;
};

const REVEAL_DELAY_MS = 1500;
const ROCKET_MIN = 1.1;
const ROCKET_MAX = 5;
const PLINKO_SLOT_COUNT = 11; // 10 rangees => 11 cases

type RoundResult =
  | { kind: "slots"; reels: readonly [string, string, string]; label: string; score: number }
  | { kind: "plinko"; slot: number; multiplier: number; score: number }
  | { kind: "rocket"; crash: number; target: number; success: boolean; score: number };

type ArenaPhase = "idle" | "animating" | "revealed";

function rawNumber(raw: Record<string, unknown>, key: string): number {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatPoints(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("fr-FR")}`;
}

export function DuelArenaPanel({ room, user, onPlayRound }: DuelArenaPanelProps) {
  const gameKey = duelGameKey(room.game);
  const duelSeed = rawNumber(room.raw, "duelSeed");
  const duelStake = rawNumber(room.raw, "duelStake");
  const uid = user?.uid ?? "";
  const isPlayer = Boolean(uid) && room.players.some((player) => player.uid === uid);
  const myScore = room.duelScores[uid] ?? { rounds: [], total: 0 };
  const opponent = room.players.find((player) => player.uid !== uid);
  const opponentScore = opponent ? room.duelScores[opponent.uid] ?? { rounds: [], total: 0 } : { rounds: [], total: 0 };
  const roundsPlayed = myScore.rounds.length;
  const allRoundsPlayed = roundsPlayed >= 3;

  const [phase, setPhase] = useState<ArenaPhase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [rocketTarget, setRocketTarget] = useState(2);
  const [pending, setPending] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Room du DERNIER render : handlePlayRound et le timeout de revelation lisent ici
  // plutot que dans une closure perimee, pour calculer l'index de manche reel.
  const roomRef = useRef(room);
  roomRef.current = room;
  // Plus grand index de manche deja soumis a onPlayRound pour CE duel : tant que le
  // snapshot Firestore n'a pas reflete la manche soumise, roundsPlayed reste <= cet
  // index et le bouton reste verrouille (fenetre de latence anti-double-jeu).
  const submittedRoundRef = useRef(-1);

  useEffect(() => {
    // Nouveau duel : on repart de zero (verrous compris).
    submittedRoundRef.current = -1;
    setPhase("idle");
    setResult(null);
    setPending(false);
  }, [room.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const canPlay =
    isPlayer &&
    room.status === "playing" &&
    !allRoundsPlayed &&
    phase !== "animating" &&
    !pending &&
    roundsPlayed > submittedRoundRef.current;

  function currentRoundsPlayed(): number {
    const latest = roomRef.current.duelScores[uid] ?? { rounds: [], total: 0 };
    return latest.rounds.length;
  }

  function handlePlayRound() {
    if (!canPlay) {
      return;
    }

    // Index recalcule depuis la room du dernier render au moment du clic.
    const latestRounds = currentRoundsPlayed();
    if (latestRounds > 2 || latestRounds <= submittedRoundRef.current) {
      return;
    }
    const round = latestRounds as DuelRoundIndex;
    let roundResult: RoundResult;

    if (gameKey === "slots") {
      const { outcome, score } = playSeededSlotsDuelRound(duelSeed, round, uid);
      roundResult = { kind: "slots", reels: outcome.reels, label: outcome.label, score };
    } else if (gameKey === "plinko") {
      const { outcome, score } = playSeededPlinkoDuelRound(duelSeed, round, uid);
      roundResult = { kind: "plinko", slot: outcome.slot, multiplier: outcome.multiplier, score };
    } else {
      const target = Math.round(Math.min(Math.max(rocketTarget, ROCKET_MIN), ROCKET_MAX) * 10) / 10;
      const crash = seededRocketCrashMultiplier(duelSeed, round);
      const score = scoreRocketDuelRound(crash, target);
      roundResult = { kind: "rocket", crash, target, success: crash >= target, score };
    }

    setResult(roundResult);
    setPhase("animating");
    setPending(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPhase("revealed");
      // Si la room indique deja >= round+1 manches jouees (autre onglet, snapshot
      // arrive entre-temps), cette manche est deja enregistree : on ne rejoue pas.
      if (currentRoundsPlayed() > round) {
        setPending(false);
        return;
      }
      submittedRoundRef.current = round;
      Promise.resolve(onPlayRound(roomRef.current, roundResult.score))
        .catch(() => {
          // Echec d'ecriture : on relache le verrou d'index pour permettre de rejouer
          // cette manche (elle n'a pas ete enregistree cote serveur).
          submittedRoundRef.current = round - 1;
        })
        .finally(() => {
          setPending(false);
        });
    }, REVEAL_DELAY_MS);
  }

  const finished = room.status === "finished" || Boolean(room.winnerUid);
  const waitingOpponent = allRoundsPlayed && !finished;
  const pot = duelStake * 2;
  const won = finished && room.winnerUid === uid;
  const animating = phase === "animating";

  return (
    <section className={`${appStyles.panel} ${styles.arena}`}>
      <header className={styles.arenaHeader}>
        <h2>{room.game}</h2>
        <span className={styles.potBadge}>Pot : {pot.toLocaleString("fr-FR")} credits</span>
      </header>

      <div className={styles.scoreGrid}>
        {room.players.map((player) => {
          const score = room.duelScores[player.uid] ?? { rounds: [], total: 0 };
          const isMe = player.uid === uid;

          return (
            <div className={`${styles.scoreCard} ${isMe ? styles.scoreCardMe : ""}`} key={player.uid}>
              <strong>{player.displayName}{isMe ? " (toi)" : ""}</strong>
              <span className={styles.scoreTotal}>{formatPoints(score.total)}</span>
              <div className={styles.roundDots}>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className={`${styles.roundDot} ${index < score.rounds.length ? styles.roundDotDone : ""}`}
                    title={index < score.rounds.length ? formatPoints(score.rounds[index]) : "Manche a jouer"}
                  >
                    {index < score.rounds.length ? formatPoints(score.rounds[index]) : "—"}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {finished ? (
        <div className={`${styles.finalPanel} ${won ? styles.finalWin : styles.finalLose}`}>
          <strong>{room.winnerUid ? (won ? "Victoire !" : `Gagnant : ${room.winnerName || "adversaire"}`) : "Egalite"}</strong>
          <span>
            {won
              ? `Tu remportes le pot de ${pot.toLocaleString("fr-FR")} credits.`
              : `Le pot de ${pot.toLocaleString("fr-FR")} credits est attribue.`}
          </span>
        </div>
      ) : waitingOpponent ? (
        <div className={styles.waitingPanel}>
          <span className={styles.waitingSpinner} aria-hidden="true" />
          <p>
            Tes 3 manches sont jouees ({formatPoints(myScore.total)}). En attente de {opponent?.displayName ?? "l'adversaire"} (
            {opponentScore.rounds.length}/3 manches)...
          </p>
        </div>
      ) : !isPlayer ? (
        <p className={styles.spectatorHint}>Tu observes ce duel en spectateur.</p>
      ) : (
        <div className={styles.playZone}>
          <p className={styles.roundLabel}>
            Manche {Math.min(roundsPlayed + 1, 3)}/3 — mise virtuelle {DUEL_ROUND_BET} credits, meme seed pour les deux joueurs.
          </p>

          {gameKey === "rocket" && (
            <div className={`${appStyles.controls} ${styles.rocketControls}`}>
              <label htmlFor={`duel-rocket-target-${room.id}`}>Cible cash-out</label>
              <input
                id={`duel-rocket-target-${room.id}`}
                type="range"
                min={ROCKET_MIN}
                max={ROCKET_MAX}
                step={0.1}
                value={rocketTarget}
                disabled={animating}
                onChange={(event) => setRocketTarget(Number(event.target.value))}
              />
              <strong className={styles.rocketTargetValue}>x{rocketTarget.toFixed(1)}</strong>
            </div>
          )}

          {result && result.kind === "slots" && (
            <div className={styles.miniReels}>
              {result.reels.map((symbol, index) => (
                <span className={`${styles.miniReel} ${animating ? styles.miniReelSpinning : ""}`} key={index}>
                  {animating ? "❔" : symbol}
                </span>
              ))}
            </div>
          )}

          {result && result.kind === "plinko" && (
            <div className={styles.plinkoStrip}>
              {animating && <span className={styles.plinkoBall} aria-hidden="true" />}
              <div className={styles.plinkoSlots}>
                {Array.from({ length: PLINKO_SLOT_COUNT }, (_, index) => (
                  <span
                    className={`${styles.plinkoSlot} ${!animating && index === result.slot ? styles.plinkoSlotHit : ""}`}
                    key={index}
                  >
                    {!animating && index === result.slot ? `x${result.multiplier}` : "·"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result && result.kind === "rocket" && (
            <div className={styles.rocketStage}>
              {animating ? (
                <span className={styles.rocketFlying}>🚀 Vol en cours... cible x{result.target.toFixed(1)}</span>
              ) : (
                <span className={result.success ? styles.positiveText : styles.negativeText}>
                  Crash a x{result.crash.toFixed(1)} — {result.success ? `cash-out reussi a x${result.target.toFixed(1)}` : `cible x${result.target.toFixed(1)} manquee`}
                </span>
              )}
            </div>
          )}

          {phase === "revealed" && result && (
            <p className={`${styles.roundScore} ${result.score > 0 ? styles.positiveText : styles.negativeText}`}>
              Score de la manche : {formatPoints(result.score)}
            </p>
          )}

          <button className={appStyles.primaryButton} type="button" onClick={handlePlayRound} disabled={!canPlay}>
            {animating ? "Revelation..." : `Jouer la manche ${Math.min(roundsPlayed + 1, 3)}`}
          </button>
        </div>
      )}
    </section>
  );
}

export default DuelArenaPanel;
