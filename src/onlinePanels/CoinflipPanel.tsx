import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import appStyles from "../App.module.css";
import styles from "./CoinflipPanel.module.css";
import type { CasinoUser, OnlineRoomEntry } from "../firebaseClient";
import { COINFLIP_MIN_BET, createCoinflipRoom, joinAndFlipCoinflip, parseCoinflipRoom } from "../coinflipRooms";

/**
 * Contrat d'integration (Vague 3) du mode "Pile ou face" de la section online.
 * - `rooms`    : liste temps reel des rooms online — le panel filtre lui-meme type === "coinflip".
 * - `user`     : utilisateur connecte (createur ou challenger).
 * - `balance`  : solde local, utilise uniquement pour borner la mise cote UI.
 * - `friends`  : amis invitables a la creation (optionnel, room privee via invitedUid).
 * - `onRefresh`: demande un rechargement de la liste des rooms (apres creation / flip).
 * Hote = face (heads), challenger = pile (tails). Les debits/credits passent par
 * computeCoinflipSettlements cote App (pas dans ce composant).
 */
export type CoinflipPanelProps = {
  rooms: OnlineRoomEntry[];
  user: CasinoUser;
  balance: number;
  friends: Array<{ uid: string; displayName: string }>;
  onRefresh: () => void;
};

const FLIP_ANIMATION_MS = 3000;

type FlipState = {
  roomId: string;
  phase: "flipping" | "done";
};

function sideLabel(side: "heads" | "tails" | ""): string {
  if (side === "heads") {
    return "Face";
  }

  return side === "tails" ? "Pile" : "?";
}

export function CoinflipPanel({ rooms, user, balance, friends, onRefresh }: CoinflipPanelProps) {
  const [bet, setBet] = useState(COINFLIP_MIN_BET);
  const [invitedUid, setInvitedUid] = useState("");
  const [busyRoomId, setBusyRoomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [message, setMessage] = useState("");
  const flipTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }
    },
    [],
  );

  const coinflipRooms = useMemo(() => rooms.filter((room) => room.type === "coinflip"), [rooms]);
  const openRooms = coinflipRooms.filter((room) => room.status === "waiting");
  const finishedRooms = coinflipRooms.filter((room) => room.status === "finished" && room.playerIds.includes(user.uid));
  const flipRoom = flip ? coinflipRooms.find((room) => room.id === flip.roomId) ?? null : null;
  const flipView = flipRoom ? parseCoinflipRoom(flipRoom) : null;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (bet > balance) {
      setMessage("Solde insuffisant pour cette mise.");
      return;
    }

    const friend = friends.find((entry) => entry.uid === invitedUid);

    setCreating(true);
    setMessage("");

    try {
      await createCoinflipRoom(user, bet, friend ? { uid: friend.uid, displayName: friend.displayName } : undefined);
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Creation du salon impossible.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(room: OnlineRoomEntry) {
    const view = parseCoinflipRoom(room);

    if (view.bet > balance) {
      setMessage("Solde insuffisant pour relever ce pile ou face.");
      return;
    }

    setBusyRoomId(room.id);
    setMessage("");

    try {
      await joinAndFlipCoinflip(room, user);
      setFlip({ roomId: room.id, phase: "flipping" });
      onRefresh();

      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }

      flipTimerRef.current = window.setTimeout(() => {
        setFlip((current) => (current && current.roomId === room.id ? { roomId: room.id, phase: "done" } : current));
        onRefresh();
      }, FLIP_ANIMATION_MS);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de rejoindre ce pile ou face.");
    } finally {
      setBusyRoomId("");
    }
  }

  return (
    <section className={`${appStyles.panel} ${styles.coinflipPanel}`}>
      <header className={styles.panelHeader}>
        <div>
          <h2>Pile ou face</h2>
          <p>Cree un salon, un adversaire le rejoint : la piece decide, le gagnant rafle les deux mises.</p>
        </div>
        <button className={appStyles.secondaryButton} type="button" onClick={onRefresh}>
          Actualiser
        </button>
      </header>

      <form className={appStyles.controls} onSubmit={handleCreate}>
        <label htmlFor="coinflip-bet">Mise</label>
        <input
          id="coinflip-bet"
          type="number"
          min={COINFLIP_MIN_BET}
          max={Math.max(COINFLIP_MIN_BET, Math.floor(balance))}
          step={1}
          value={bet}
          onChange={(event) => setBet(Math.max(COINFLIP_MIN_BET, Math.floor(Number(event.target.value) || COINFLIP_MIN_BET)))}
          disabled={creating}
        />
        <label htmlFor="coinflip-invite">Inviter</label>
        <select id="coinflip-invite" value={invitedUid} onChange={(event) => setInvitedUid(event.target.value)} disabled={creating}>
          <option value="">Ouvert a tous</option>
          {friends.map((friend) => (
            <option key={friend.uid} value={friend.uid}>
              {friend.displayName}
            </option>
          ))}
        </select>
        <button className={appStyles.primaryButton} type="submit" disabled={creating}>
          {creating ? "..." : "Creer le salon"}
        </button>
      </form>

      {flip && flipView && flipRoom && (
        <div className={styles.flipStage}>
          {flip.phase === "flipping" || flipRoom.status !== "finished" ? (
            <>
              <div className={styles.coin} data-result={flipView.result || "heads"}>
                <span className={styles.coinFace}>F</span>
                <span className={`${styles.coinFace} ${styles.coinBack}`}>P</span>
              </div>
              <p>La piece tourne...</p>
            </>
          ) : (
            <>
              <div className={`${styles.coin} ${styles.coinSettled}`} data-result={flipView.result || "heads"}>
                <span className={styles.coinFace}>{flipView.result === "tails" ? "P" : "F"}</span>
              </div>
              <p>
                <strong>{sideLabel(flipView.result)}</strong> ! {flipView.winnerName || "?"} remporte{" "}
                {(flipView.bet * 2).toLocaleString("fr-FR")} credits
                {flipView.winnerUid === user.uid ? " — bien joue !" : "."}
              </p>
            </>
          )}
        </div>
      )}

      <div className={styles.roomsBlock}>
        <h3>Salons ouverts</h3>
        {openRooms.length === 0 ? (
          <p className={styles.notice}>Aucun pile ou face en attente : lance le tien.</p>
        ) : (
          <ul className={styles.roomList}>
            {openRooms.map((room) => {
              const view = parseCoinflipRoom(room);
              const mine = room.hostUid === user.uid;
              const lockedForMe = Boolean(room.invitedUid) && room.invitedUid !== user.uid && !mine;

              return (
                <li className={styles.roomRow} key={room.id}>
                  <div>
                    <strong>{room.hostName}</strong>
                    <span className={styles.roomMeta}>
                      Mise {view.bet.toLocaleString("fr-FR")} | Hote = face
                      {room.invitedName ? ` | Prive : ${room.invitedName}` : ""}
                    </span>
                  </div>
                  {mine ? (
                    <span className={styles.waitingTag}>En attente d'un adversaire</span>
                  ) : (
                    <button
                      className={appStyles.primaryButton}
                      type="button"
                      onClick={() => void handleJoin(room)}
                      disabled={busyRoomId === room.id || lockedForMe}
                    >
                      {busyRoomId === room.id ? "..." : lockedForMe ? "Prive" : "Rejoindre (pile)"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {finishedRooms.length > 0 && (
        <div className={styles.roomsBlock}>
          <h3>Resultats recents</h3>
          <ul className={styles.roomList}>
            {finishedRooms.map((room) => {
              const view = parseCoinflipRoom(room);
              const won = view.winnerUid === user.uid;

              return (
                <li className={styles.roomRow} key={room.id}>
                  <div>
                    <strong>
                      {room.players.map((player) => player.displayName).join(" vs ") || room.hostName}
                    </strong>
                    <span className={styles.roomMeta}>
                      {sideLabel(view.result)} | {view.winnerName || "?"} gagne {(view.bet * 2).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <span className={styles.resultTag} data-win={won}>
                    {won ? "Gagne" : "Perdu"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && <p className={styles.errorMessage}>{message}</p>}
    </section>
  );
}
