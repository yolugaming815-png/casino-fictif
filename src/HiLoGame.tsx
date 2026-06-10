import { useState } from "react";
import appStyles from "./App.module.css";
import styles from "./HiLoGame.module.css";
import type { Card } from "./blackjackLogic";
import { MIN_BET } from "./gameLogic";
import {
  drawHiLoCard,
  drawHiLoNextCard,
  getHiLoMultiplier,
  resolveHiLoGuess,
  type HiLoGuess,
} from "./hiLoLogic";
import { QuickBetInput } from "./QuickBetInput";

export type HiLoOutcome = "cashout" | "lose";

export type HiLoHistoryItem = {
  id: number;
  bet: number;
  /** Nombre de guesses gagnés avant la fin de la manche. */
  steps: number;
  /** Multiplicateur cumulé encaissé (0 si perdu). */
  finalMultiplier: number;
  payout: number;
  net: number;
  outcome: HiLoOutcome;
  balanceAfter: number;
};

export type HiLoRoundResult = {
  bet: number;
  steps: number;
  /** Multiplicateur cumulé final : produit des guesses gagnés (0 si perdu). */
  finalMultiplier: number;
  /** payout = Math.round(bet * finalMultiplier), 0 si perdu. */
  payout: number;
  /** net = payout - bet. */
  net: number;
  outcome: HiLoOutcome;
};

export type HiLoGameProps = {
  /** Solde courant du joueur (credits virtuels). */
  balance: number;
  /** Pause globale : bloque distribution, guesses et cash out. */
  paused?: boolean;
  /** Historique persiste par App.tsx, affiche tel quel (plus recent en premier). */
  history: HiLoHistoryItem[];
  /**
   * Appele au moment de distribuer la premiere carte. Doit debiter la mise et
   * retourner true si la manche peut demarrer (false = solde insuffisant...).
   */
  onRoundStart: (bet: number) => boolean;
  /** Appele a la fin de la manche (cash out ou mauvaise reponse). Credite le payout. */
  onRoundEnd: (result: HiLoRoundResult) => void;
};

type HiLoPhase = "idle" | "playing";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isRedSuit(card: Card): boolean {
  return card.suit === "♥" || card.suit === "♦";
}

function formatMultiplier(multiplier: number): string {
  return `x${multiplier.toFixed(2)}`;
}

function HiLoCardFace({ card, dimmed }: { card: Card | null; dimmed?: boolean }) {
  if (!card) {
    return (
      <div className={`${styles.hiloCard} ${styles.hiloCardEmpty}`} aria-label="Aucune carte">
        <span className={styles.hiloCardPlaceholder}>?</span>
      </div>
    );
  }

  const red = isRedSuit(card);

  return (
    <div
      className={`${styles.hiloCard} ${red ? styles.hiloCardRed : ""} ${dimmed ? styles.hiloCardDimmed : ""}`}
      aria-label={`${card.rank} ${card.suit}`}
    >
      <span className={styles.hiloCardCorner}>
        {card.rank}
        <small>{card.suit}</small>
      </span>
      <span className={styles.hiloCardSuit} aria-hidden="true">
        {card.suit}
      </span>
      <span className={`${styles.hiloCardCorner} ${styles.hiloCardCornerBottom}`}>
        {card.rank}
        <small>{card.suit}</small>
      </span>
    </div>
  );
}

export function HiLoGame({ balance, paused = false, history, onRoundStart, onRoundEnd }: HiLoGameProps) {
  const [bet, setBet] = useState(MIN_BET);
  const [phase, setPhase] = useState<HiLoPhase>("idle");
  const [roundBet, setRoundBet] = useState(0);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [steps, setSteps] = useState(0);
  const [cumulativeMultiplier, setCumulativeMultiplier] = useState(1);
  const [message, setMessage] = useState(
    "Choisis ta mise puis devine si la prochaine carte sera plus haute ou plus basse.",
  );

  const playing = phase === "playing";
  const higherMultiplier = currentCard ? getHiLoMultiplier(currentCard, "higher") : null;
  const lowerMultiplier = currentCard ? getHiLoMultiplier(currentCard, "lower") : null;
  const potentialPayout = Math.round(roundBet * cumulativeMultiplier);
  const canDeal = !paused && !playing && bet >= MIN_BET && bet <= balance;
  const canCashOut = playing && !paused && steps >= 1;

  function handleDeal() {
    if (paused || playing || bet < MIN_BET || bet > balance) {
      return;
    }

    if (!onRoundStart(bet)) {
      setMessage("Impossible de lancer la manche : mise refusee.");
      return;
    }

    setRoundBet(bet);
    setCurrentCard(drawHiLoCard());
    setSteps(0);
    setCumulativeMultiplier(1);
    setPhase("playing");
    setMessage("Plus haut ou plus bas ? L'egalite relance la carte (push).");
  }

  function handleGuess(guess: HiLoGuess) {
    if (!playing || paused || !currentCard) {
      return;
    }

    const guessMultiplier = getHiLoMultiplier(currentCard, guess);
    if (guessMultiplier === null) {
      return;
    }

    const nextCard = drawHiLoNextCard(currentCard);
    const result = resolveHiLoGuess(currentCard, nextCard, guess);
    const drawnLabel = `${nextCard.rank}${nextCard.suit}`;

    if (result === "push") {
      setMessage(`${drawnLabel} : egalite, push. La carte est relancee sans changement.`);
      return;
    }

    if (result === "win") {
      const nextMultiplier = round2(cumulativeMultiplier * guessMultiplier);
      setCurrentCard(nextCard);
      setSteps(steps + 1);
      setCumulativeMultiplier(nextMultiplier);
      setMessage(
        `${drawnLabel} : gagne ${formatMultiplier(guessMultiplier)} ! Cumul ${formatMultiplier(nextMultiplier)} (${Math.round(
          roundBet * nextMultiplier,
        )} credits si cash out).`,
      );
      return;
    }

    setCurrentCard(nextCard);
    setPhase("idle");
    setMessage(`${drawnLabel} : mauvaise reponse, mise perdue (-${roundBet} credits).`);
    onRoundEnd({
      bet: roundBet,
      steps,
      finalMultiplier: 0,
      payout: 0,
      net: -roundBet,
      outcome: "lose",
    });
  }

  function handleCashOut() {
    if (!canCashOut) {
      return;
    }

    const payout = Math.round(roundBet * cumulativeMultiplier);
    setPhase("idle");
    setMessage(
      `Cash out a ${formatMultiplier(cumulativeMultiplier)} : +${payout - roundBet} credits net (${payout} encaisse).`,
    );
    onRoundEnd({
      bet: roundBet,
      steps,
      finalMultiplier: cumulativeMultiplier,
      payout,
      net: payout - roundBet,
      outcome: "cashout",
    });
  }

  return (
    <>
      <section className={appStyles.machine}>
        <div className={styles.hiloLayout}>
          <HiLoCardFace card={currentCard} dimmed={!playing && currentCard !== null} />
          <div className={styles.hiloStats}>
            <div className={styles.hiloStat}>
              <small>Multiplicateur cumule</small>
              <strong>{formatMultiplier(playing ? cumulativeMultiplier : 1)}</strong>
            </div>
            <div className={styles.hiloStat}>
              <small>Guesses gagnes</small>
              <strong>{playing ? steps : 0}</strong>
            </div>
            <div className={styles.hiloStat}>
              <small>Cash out potentiel</small>
              <strong>{playing ? potentialPayout : 0} credits</strong>
            </div>
          </div>
        </div>

        <p className={appStyles.message}>{message}</p>

        {playing ? (
          <div className={appStyles.controls}>
            <button
              className={`${appStyles.primaryButton} ${styles.guessButton}`}
              type="button"
              onClick={() => handleGuess("higher")}
              disabled={paused || higherMultiplier === null}
            >
              Plus haut {higherMultiplier !== null ? `(${formatMultiplier(higherMultiplier)})` : "(—)"}
            </button>
            <button
              className={`${appStyles.primaryButton} ${styles.guessButton}`}
              type="button"
              onClick={() => handleGuess("lower")}
              disabled={paused || lowerMultiplier === null}
            >
              Plus bas {lowerMultiplier !== null ? `(${formatMultiplier(lowerMultiplier)})` : "(—)"}
            </button>
            <button
              className={`${appStyles.secondaryButton} ${styles.cashOutButton}`}
              type="button"
              onClick={handleCashOut}
              disabled={!canCashOut}
            >
              CASH OUT ({potentialPayout})
            </button>
          </div>
        ) : (
          <div className={appStyles.controls}>
            <label htmlFor="hiloBet">Mise virtuelle</label>
            <QuickBetInput id="hiloBet" value={bet} onChange={setBet} balance={balance} disabled={paused} />
            <button className={appStyles.primaryButton} type="button" onClick={handleDeal} disabled={!canDeal}>
              Distribuer
            </button>
          </div>
        )}

        {paused && (
          <div className={appStyles.pausePanel} role="status">
            Pause active. Le hi-lo est une simulation sans argent reel.
          </div>
        )}
      </section>

      <section className={appStyles.columns}>
        <article className={appStyles.panel}>
          <h2>Regles hi-lo</h2>
          <p>
            Une carte est tiree, devine si la suivante sera plus haute ou plus basse (As = 1, Roi = 13).
            Chaque bonne reponse multiplie ton gain, l'egalite relance la carte (push), une mauvaise
            reponse fait tout perdre. Encaisse quand tu veux apres un guess gagne. Credits virtuels,
            gratuits et sans valeur reelle.
          </p>
        </article>

        <article className={appStyles.panel}>
          <h2>10 dernieres manches</h2>
          {history.length === 0 ? (
            <p className={appStyles.empty}>Aucune manche pour le moment.</p>
          ) : (
            <ol className={appStyles.history}>
              {history.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.outcome === "cashout"
                      ? `Cash out ${formatMultiplier(item.finalMultiplier)}`
                      : "Perdu"}{" "}
                    | {item.steps} guess{item.steps > 1 ? "es" : ""}
                  </span>
                  <small>
                    mise {item.bet} | {item.net >= 0 ? "+" : ""}
                    {item.net} | solde {item.balanceAfter}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </>
  );
}
