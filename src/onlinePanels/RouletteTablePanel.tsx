import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import appStyles from "../App.module.css";
import styles from "./RouletteTablePanel.module.css";
import type { CasinoUser, OnlineRoomEntry } from "../firebaseClient";
import { onlineTimestampToMillis } from "../firebaseClient";
import { evaluateRouletteBet, getRouletteColor, type RouletteBetKind } from "../rouletteLogic";
import {
  ROULETTE_TABLE_BETTING_MS,
  ROULETTE_TABLE_BET_MAX,
  ROULETTE_TABLE_BET_MIN,
  ROULETTE_TABLE_MAX_BETS_PER_PLAYER,
  countRouletteTableBets,
  parseRouletteTableRoom,
  placeRouletteTableBet,
  spinRouletteTable,
  startNextRouletteTableRound,
} from "../rouletteTableRooms";

/**
 * Contrat d'integration (Vague 3) du panneau "Table roulette" (room type "roulette-table").
 * - `room`   : room temps reel (onSnapshot) — les champs rt* sont lus via parseRouletteTableRoom(room).
 * - `user`   : utilisateur connecte (doit deja etre dans room.playerIds pour miser/lancer).
 * - `balance`: solde local, utilise uniquement pour borner la mise cote UI.
 * - `onLeave`: callback "Quitter la table" — l'integrateur retire le joueur de la room.
 * Les debits/credits passent par computeRouletteTableSettlements cote App (pas dans ce composant).
 */
export type RouletteTablePanelProps = {
  room: OnlineRoomEntry;
  user: CasinoUser;
  balance: number;
  onLeave: (room: OnlineRoomEntry) => void;
};

const BET_KIND_OPTIONS: Array<{ kind: RouletteBetKind; label: string }> = [
  { kind: "red", label: "Rouge (x2)" },
  { kind: "black", label: "Noir (x2)" },
  { kind: "even", label: "Pair (x2)" },
  { kind: "odd", label: "Impair (x2)" },
  { kind: "low", label: "1-18 (x2)" },
  { kind: "high", label: "19-36 (x2)" },
  { kind: "dozen1", label: "1re douzaine (x3)" },
  { kind: "dozen2", label: "2e douzaine (x3)" },
  { kind: "dozen3", label: "3e douzaine (x3)" },
  { kind: "straight", label: "Plein (x36)" },
];

function betKindLabel(kind: RouletteBetKind, number: number): string {
  if (kind === "straight") {
    return `Numero ${number}`;
  }

  return BET_KIND_OPTIONS.find((option) => option.kind === kind)?.label.replace(/ \(x\d+\)$/, "") ?? kind;
}

export function RouletteTablePanel({ room, user, balance, onLeave }: RouletteTablePanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const [betKind, setBetKind] = useState<RouletteBetKind>("red");
  const [betNumber, setBetNumber] = useState(17);
  const [betAmount, setBetAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const view = useMemo(() => parseRouletteTableRoom(room), [room]);
  const isHost = room.hostUid === user.uid;
  const isSeated = room.playerIds.includes(user.uid);
  const totalBets = countRouletteTableBets(view);
  const myBets = view.bets[user.uid];

  useEffect(() => {
    if (view.phase !== "betting") {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [view.phase]);

  const bettingStartedAt = onlineTimestampToMillis(view.bettingStartedAt);
  const remainingMs = bettingStartedAt === null ? ROULETTE_TABLE_BETTING_MS : Math.max(0, ROULETTE_TABLE_BETTING_MS - (now - bettingStartedAt));
  const countdownDone = remainingMs <= 0;
  const canSpin = isSeated && view.phase === "betting" && (isHost || (countdownDone && totalBets >= 1));

  const maxBet = Math.max(ROULETTE_TABLE_BET_MIN, Math.min(ROULETTE_TABLE_BET_MAX, Math.floor(balance)));

  async function runAction(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  function handlePlaceBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (betAmount > balance) {
      setMessage("Solde insuffisant pour cette mise.");
      return;
    }

    void runAction(() =>
      placeRouletteTableBet(room, user, { kind: betKind, number: betKind === "straight" ? betNumber : undefined }, betAmount),
    );
  }

  return (
    <section className={`${appStyles.panel} ${styles.tablePanel}`}>
      <header className={styles.tableHeader}>
        <div>
          <h2>Table roulette</h2>
          <p>
            Tour {view.roundId} | {room.players.length} joueur{room.players.length > 1 ? "s" : ""} | Hote : {room.hostName}
          </p>
        </div>
        <button className={appStyles.secondaryButton} type="button" onClick={() => onLeave(room)} disabled={busy}>
          Quitter la table
        </button>
      </header>

      {view.history.length > 0 && (
        <div className={styles.historyStrip} aria-label="Derniers numeros sortis">
          {view.history.map((number, index) => (
            <span className={styles.historyDot} data-color={getRouletteColor(number)} key={`${index}-${number}`}>
              {number}
            </span>
          ))}
        </div>
      )}

      {view.phase === "betting" ? (
        <>
          <div className={styles.countdownRow}>
            <strong className={styles.countdown} data-done={countdownDone}>
              {countdownDone ? "Mises closes" : `Mises ouvertes : ${Math.ceil(remainingMs / 1000)} s`}
            </strong>
            <span>
              {totalBets} mise{totalBets > 1 ? "s" : ""} sur la table
            </span>
          </div>

          <form className={appStyles.controls} onSubmit={handlePlaceBet}>
            <label htmlFor={`rt-kind-${room.id}`}>Pari</label>
            <select
              id={`rt-kind-${room.id}`}
              value={betKind}
              onChange={(event) => setBetKind(event.target.value as RouletteBetKind)}
              disabled={busy || !isSeated}
            >
              {BET_KIND_OPTIONS.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </select>
            {betKind === "straight" && (
              <>
                <label htmlFor={`rt-number-${room.id}`}>Numero</label>
                <input
                  id={`rt-number-${room.id}`}
                  type="number"
                  min={0}
                  max={36}
                  step={1}
                  value={betNumber}
                  onChange={(event) => setBetNumber(Math.max(0, Math.min(36, Math.floor(Number(event.target.value) || 0))))}
                  disabled={busy || !isSeated}
                />
              </>
            )}
            <label htmlFor={`rt-amount-${room.id}`}>Mise</label>
            <input
              id={`rt-amount-${room.id}`}
              type="number"
              min={ROULETTE_TABLE_BET_MIN}
              max={maxBet}
              step={1}
              value={betAmount}
              onChange={(event) => setBetAmount(Math.max(ROULETTE_TABLE_BET_MIN, Math.floor(Number(event.target.value) || ROULETTE_TABLE_BET_MIN)))}
              disabled={busy || !isSeated}
            />
            <button
              className={appStyles.primaryButton}
              type="submit"
              disabled={busy || !isSeated || (myBets?.bets.length ?? 0) >= ROULETTE_TABLE_MAX_BETS_PER_PLAYER}
            >
              Miser
            </button>
            <button
              className={appStyles.secondaryButton}
              type="button"
              onClick={() => void runAction(() => spinRouletteTable(room, user))}
              disabled={busy || !canSpin}
            >
              Lancer
            </button>
          </form>
          {!isSeated && <p className={styles.notice}>Rejoins la table pour miser.</p>}
        </>
      ) : (
        <div className={styles.resultBlock}>
          <span className={styles.resultNumber} data-color={view.resultNumber >= 0 ? getRouletteColor(view.resultNumber) : "green"}>
            {view.resultNumber >= 0 ? view.resultNumber : "?"}
          </span>
          <div>
            <h3>
              Le {view.resultNumber} sort{view.resultNumber >= 0 && ` (${getRouletteColor(view.resultNumber) === "red" ? "rouge" : getRouletteColor(view.resultNumber) === "black" ? "noir" : "vert"})`}
            </h3>
            <button
              className={appStyles.primaryButton}
              type="button"
              onClick={() => void runAction(() => startNextRouletteTableRound(room, user))}
              disabled={busy || !isSeated}
            >
              Nouveau tour
            </button>
          </div>
        </div>
      )}

      <div className={styles.betsBoard}>
        <h3>Mises des joueurs</h3>
        {Object.keys(view.bets).length === 0 ? (
          <p className={styles.notice}>Aucune mise pour ce tour.</p>
        ) : (
          <ul className={styles.betsList}>
            {Object.values(view.bets).map((player) => {
              const payout =
                view.phase === "results" && view.resultNumber >= 0
                  ? player.bets.reduce(
                      (sum, bet) =>
                        sum + evaluateRouletteBet({ kind: bet.kind, number: bet.number >= 0 ? bet.number : undefined }, bet.amount, view.resultNumber).payout,
                      0,
                    )
                  : null;

              return (
                <li className={styles.betsRow} data-me={player.uid === user.uid} key={player.uid}>
                  <strong>{player.displayName}</strong>
                  <span className={styles.betChips}>
                    {player.bets.map((bet, index) => (
                      <span className={styles.betChip} key={index}>
                        {bet.amount.toLocaleString("fr-FR")} sur {betKindLabel(bet.kind, bet.number)}
                      </span>
                    ))}
                  </span>
                  {payout !== null && (
                    <strong className={styles.payout} data-win={payout > 0}>
                      {payout > 0 ? `+${payout.toLocaleString("fr-FR")}` : `-${player.total.toLocaleString("fr-FR")}`}
                    </strong>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {message && <p className={styles.errorMessage}>{message}</p>}
    </section>
  );
}
