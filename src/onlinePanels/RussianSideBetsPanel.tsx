import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import appStyles from "../App.module.css";
import styles from "./RussianSideBetsPanel.module.css";
import type { CasinoUser, OnlineRoomEntry } from "../firebaseClient";
import { RUSSIAN_SIDE_BET_MAX, RUSSIAN_SIDE_BET_MIN, parseRussianSideBets, placeRussianSideBet } from "../russianSideBets";

/**
 * Contrat d'integration (Vague 3) de l'encart "paris spectateurs" de la roulette russe.
 * A afficher DANS une room "russian-roulette" en cours (status playing ou finished) pour
 * les utilisateurs qui ne sont PAS dans room.playerIds.
 * - `room`   : room temps reel (onSnapshot) — survivants via room.russianAliveUids, paris via room.raw.russianSideBets.
 * - `user`   : utilisateur connecte (spectateur potentiel).
 * - `balance`: solde local, utilise uniquement pour borner la mise cote UI.
 * Les debits/credits passent par computeRussianSideBetSettlements cote App (pas dans ce composant).
 */
export type RussianSideBetsPanelProps = {
  room: OnlineRoomEntry;
  user: CasinoUser;
  balance: number;
};

export function RussianSideBetsPanel({ room, user, balance }: RussianSideBetsPanelProps) {
  const [targetUid, setTargetUid] = useState("");
  const [amount, setAmount] = useState(RUSSIAN_SIDE_BET_MIN);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const sideBets = useMemo(() => parseRussianSideBets(room), [room]);
  const survivors = useMemo(
    () => room.players.filter((player) => room.russianAliveUids.includes(player.uid)),
    [room.players, room.russianAliveUids],
  );

  const odds = room.russianAliveUids.length;
  const isPlayer = room.playerIds.includes(user.uid);
  const myBet = sideBets.find((bet) => bet.spectatorUid === user.uid);
  const canBet = room.status === "playing" && !isPlayer && !myBet && survivors.length > 0;
  const maxAmount = Math.max(RUSSIAN_SIDE_BET_MIN, Math.min(RUSSIAN_SIDE_BET_MAX, Math.floor(balance)));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const target = targetUid || survivors[0]?.uid || "";

    if (!target) {
      setMessage("Choisis un survivant avant de parier.");
      return;
    }

    if (amount > balance) {
      setMessage("Solde insuffisant pour ce pari.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await placeRussianSideBet(room, user, target, amount);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pari impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={styles.sidePanel}>
      <h3>Paris spectateurs</h3>
      <p className={styles.subtitle}>
        Mise sur le survivant de ton choix : cote x{Math.max(1, odds)} tant qu'ils sont {Math.max(1, odds)} en vie.
      </p>

      <ul className={styles.survivorList}>
        {survivors.length === 0 ? (
          <li className={styles.notice}>Plus aucun survivant a coter.</li>
        ) : (
          survivors.map((player) => (
            <li className={styles.survivorRow} key={player.uid}>
              <strong>{player.displayName}</strong>
              <span className={styles.oddsTag}>x{odds}</span>
            </li>
          ))
        )}
      </ul>

      {canBet && (
        <form className={appStyles.controls} onSubmit={handleSubmit}>
          <label htmlFor={`rsb-target-${room.id}`}>Survivant</label>
          <select id={`rsb-target-${room.id}`} value={targetUid || survivors[0]?.uid || ""} onChange={(event) => setTargetUid(event.target.value)} disabled={busy}>
            {survivors.map((player) => (
              <option key={player.uid} value={player.uid}>
                {player.displayName}
              </option>
            ))}
          </select>
          <label htmlFor={`rsb-amount-${room.id}`}>Mise</label>
          <input
            id={`rsb-amount-${room.id}`}
            type="number"
            min={RUSSIAN_SIDE_BET_MIN}
            max={maxAmount}
            step={1}
            value={amount}
            onChange={(event) => setAmount(Math.max(RUSSIAN_SIDE_BET_MIN, Math.min(RUSSIAN_SIDE_BET_MAX, Math.floor(Number(event.target.value) || RUSSIAN_SIDE_BET_MIN))))}
            disabled={busy}
          />
          <button className={appStyles.primaryButton} type="submit" disabled={busy}>
            Parier
          </button>
        </form>
      )}

      {isPlayer && <p className={styles.notice}>Tu joues cette partie : les paris spectateurs te sont fermes.</p>}

      {sideBets.length > 0 && (
        <ul className={styles.betList}>
          {sideBets.map((bet) => {
            const settled = room.status === "finished" && Boolean(room.winnerUid);
            const won = settled && bet.targetUid === room.winnerUid;

            return (
              <li className={styles.betRow} data-me={bet.spectatorUid === user.uid} key={bet.spectatorUid}>
                <span>
                  <strong>{bet.displayName}</strong> mise {bet.amount.toLocaleString("fr-FR")} sur {bet.targetName || "un joueur"} (x{bet.odds})
                </span>
                {settled && (
                  <strong className={styles.betOutcome} data-win={won}>
                    {won ? `+${(bet.amount * bet.odds).toLocaleString("fr-FR")}` : "Perdu"}
                  </strong>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message && <p className={styles.errorMessage}>{message}</p>}
    </aside>
  );
}
