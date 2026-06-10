import { useState } from "react";
import appStyles from "./App.module.css";
import styles from "./MinesGame.module.css";
import { QuickBetInput } from "./QuickBetInput";
import {
  MINES_COLUMNS,
  MINES_GRID_SIZE,
  MINES_OPTIONS,
  evaluateMinesCashOut,
  generateMinePositions,
  getMinesMultiplier,
  getMinesMultiplierTable,
  isMine,
  type MinesCount,
} from "./minesLogic";

/** Entrée d'historique fournie par App.tsx (persistée dans SavedGameState.minesHistory). */
export type MinesHistoryItem = {
  id: number;
  bet: number;
  mines: number;
  revealed: number;
  multiplier: number;
  payout: number;
  net: number;
  outcome: "cashout" | "boom";
  balanceAfter: number;
};

/** Résultat de manche transmis à l'intégrateur via onRoundEnd. */
export type MinesRoundResult = {
  bet: number;
  mines: MinesCount;
  revealed: number;
  multiplier: number;
  payout: number;
  net: number;
  outcome: "cashout" | "boom";
};

/**
 * Contrat d'intégration (Vague 3a) :
 * - `onRoundStart(bet)` est appelé au clic sur "Lancer la partie" ; il doit débiter la mise
 *   et retourner `false` en cas de refus (solde insuffisant, pause active...) — la manche
 *   n'est alors pas démarrée.
 * - `onRoundEnd(result)` est appelé une seule fois par manche : au cash out
 *   (outcome "cashout", payout à créditer) ou quand une mine explose (outcome "boom",
 *   payout 0, net = -bet).
 * - `history` est rendu tel quel (les 10 dernières manches, plus récentes en premier).
 */
export type MinesGameProps = {
  balance: number;
  paused?: boolean;
  history: MinesHistoryItem[];
  onRoundStart: (bet: number) => boolean;
  onRoundEnd: (result: MinesRoundResult) => void;
};

type MinesStatus = "idle" | "playing" | "cashed" | "boom";

const GRID_CELLS = Array.from({ length: MINES_GRID_SIZE }, (_, index) => index);

export function MinesGame({ balance, paused = false, history, onRoundStart, onRoundEnd }: MinesGameProps) {
  const [bet, setBet] = useState(50);
  const [minesCount, setMinesCount] = useState<MinesCount>(3);
  const [roundBet, setRoundBet] = useState(0);
  const [roundMines, setRoundMines] = useState<MinesCount>(3);
  const [positions, setPositions] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [boomCell, setBoomCell] = useState<number | null>(null);
  const [status, setStatus] = useState<MinesStatus>("idle");
  const [message, setMessage] = useState("Choisis ta mise, le nombre de mines, puis lance la partie.");

  const playing = status === "playing";
  const maxSafeReveals = MINES_GRID_SIZE - roundMines;
  const safeReveals = revealed.length;
  const currentMultiplier = playing ? getMinesMultiplier(roundMines, safeReveals) : 1;
  const nextMultiplier =
    playing && safeReveals < maxSafeReveals ? getMinesMultiplier(roundMines, safeReveals + 1) : null;
  const cashOutPreview = playing && safeReveals > 0 ? evaluateMinesCashOut(roundBet, roundMines, safeReveals) : null;
  const multiplierTable = getMinesMultiplierTable(playing ? roundMines : minesCount);

  const startRound = () => {
    if (playing || !onRoundStart(bet)) {
      if (!playing) {
        setMessage("Lancement refuse : verifie ton solde virtuel ou la pause active.");
      }
      return;
    }

    setRoundBet(bet);
    setRoundMines(minesCount);
    setPositions(generateMinePositions(minesCount));
    setRevealed([]);
    setBoomCell(null);
    setStatus("playing");
    setMessage(`Partie lancee : ${minesCount} mines cachees. Ouvre une case.`);
  };

  const finishCashOut = (revealCount: number) => {
    const result = evaluateMinesCashOut(roundBet, roundMines, revealCount);
    setStatus("cashed");
    setMessage(`Cash out a x${result.multiplier} : +${result.payout} credits virtuels.`);
    onRoundEnd({
      bet: roundBet,
      mines: roundMines,
      revealed: revealCount,
      multiplier: result.multiplier,
      payout: result.payout,
      net: result.net,
      outcome: "cashout",
    });
  };

  const revealCell = (cell: number) => {
    if (!playing || revealed.includes(cell)) {
      return;
    }

    if (isMine(positions, cell)) {
      setBoomCell(cell);
      setStatus("boom");
      setMessage(`BOOM ! Mine en case ${cell + 1}. Mise virtuelle perdue (-${roundBet}).`);
      onRoundEnd({
        bet: roundBet,
        mines: roundMines,
        revealed: safeReveals,
        multiplier: 0,
        payout: 0,
        net: -roundBet,
        outcome: "boom",
      });
      return;
    }

    const nextRevealed = [...revealed, cell];
    setRevealed(nextRevealed);

    if (nextRevealed.length >= maxSafeReveals) {
      finishCashOut(nextRevealed.length);
      return;
    }

    setMessage(
      `Case sure ! Multiplicateur x${getMinesMultiplier(roundMines, nextRevealed.length)} — cash out ou continue.`,
    );
  };

  const cellContent = (cell: number): string => {
    if (revealed.includes(cell)) {
      return "💎";
    }

    if (status === "boom" || status === "cashed") {
      if (isMine(positions, cell)) {
        return cell === boomCell ? "💥" : "💣";
      }
      return "";
    }

    return "";
  };

  const cellClassName = (cell: number): string => {
    const classes = [styles.cell];

    if (revealed.includes(cell)) {
      classes.push(styles.cellSafe);
    } else if ((status === "boom" || status === "cashed") && isMine(positions, cell)) {
      classes.push(cell === boomCell ? styles.cellMineHit : styles.cellMine);
    } else if (status === "boom" || status === "cashed") {
      classes.push(styles.cellSpent);
    }

    return classes.join(" ");
  };

  return (
    <>
      <section className={appStyles.machine}>
        <div className={styles.layout}>
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `repeat(${MINES_COLUMNS}, minmax(0, 1fr))` }}
            role="group"
            aria-label="Grille Mines 5 par 5"
          >
            {GRID_CELLS.map((cell) => (
              <button
                key={cell}
                type="button"
                className={cellClassName(cell)}
                onClick={() => revealCell(cell)}
                disabled={!playing || revealed.includes(cell)}
                aria-label={`Case ${cell + 1}`}
              >
                {cellContent(cell)}
              </button>
            ))}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.statRow}>
              <span>Multiplicateur courant</span>
              <strong>x{currentMultiplier.toFixed(2)}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Prochaine case sure</span>
              <strong>{nextMultiplier !== null ? `x${nextMultiplier.toFixed(2)}` : "—"}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Cases sures ouvertes</span>
              <strong>
                {playing ? safeReveals : 0} / {maxSafeReveals}
              </strong>
            </div>
            <button
              type="button"
              className={`${appStyles.primaryButton} ${styles.cashOutButton}`}
              onClick={() => finishCashOut(safeReveals)}
              disabled={!playing || safeReveals === 0}
            >
              CASH OUT {cashOutPreview ? `+${cashOutPreview.payout}` : ""}
            </button>
          </aside>
        </div>

        <p className={appStyles.message}>{message}</p>

        <div className={appStyles.controls}>
          <label htmlFor="minesBet">Mise virtuelle</label>
          <QuickBetInput id="minesBet" value={bet} onChange={setBet} balance={balance} disabled={playing} />
          <div className={styles.minesSelector} role="group" aria-label="Nombre de mines">
            {MINES_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  option === minesCount ? `${styles.minesOption} ${styles.minesOptionActive}` : styles.minesOption
                }
                onClick={() => setMinesCount(option)}
                disabled={playing}
              >
                {option} mines
              </button>
            ))}
          </div>
          <button
            type="button"
            className={appStyles.primaryButton}
            onClick={startRound}
            disabled={paused || playing || bet > balance}
          >
            Lancer la partie
          </button>
        </div>

        {paused && (
          <div className={appStyles.pausePanel} role="status">
            Pause active. Les Mines utilisent seulement des credits virtuels gratuits.
          </div>
        )}
      </section>

      <section className={appStyles.columns}>
        <article className={appStyles.panel}>
          <h2>Multiplicateurs ({playing ? roundMines : minesCount} mines)</h2>
          <p>
            Chaque case sure ouverte augmente le multiplicateur. Une mine touchee fait perdre toute la mise. Cash out
            quand tu veux pour securiser le gain virtuel.
          </p>
          <div className={styles.multiplierTable}>
            {multiplierTable.map((multiplier, index) => (
              <div
                key={index}
                className={
                  playing && index + 1 === safeReveals
                    ? `${styles.multiplierChip} ${styles.multiplierChipActive}`
                    : styles.multiplierChip
                }
              >
                <small>{index + 1}</small>
                <span>x{multiplier}</span>
              </div>
            ))}
          </div>
          <p>
            Simulation fictive : les credits n'ont aucune valeur reelle et les multiplicateurs ne promettent aucun gain
            reel.
          </p>
        </article>

        <article className={appStyles.panel}>
          <h2>10 dernieres parties</h2>
          {history.length === 0 ? (
            <p className={appStyles.empty}>Aucune partie pour le moment.</p>
          ) : (
            <ol className={appStyles.history}>
              {history.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.outcome === "cashout" ? "Cash out" : "Boom"} | {item.mines} mines | {item.revealed} cases | x
                    {item.multiplier}
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
