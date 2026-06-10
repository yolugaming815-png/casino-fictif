import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import appStyles from "../App.module.css";
import styles from "./CrashPanel.module.css";
import type { CasinoUser, OnlineRoomEntry } from "../firebaseClient";
import { crashMultiplierAt, verifyCrashCommitment } from "../crashMath";
import {
  CRASH_HEARTBEAT_STALE_MS,
  CRASH_MAX_BET,
  CRASH_MAX_FLYING_MS,
  CRASH_MIN_BET,
  cashOutCrash,
  loadCrashSecret,
  parseCrashRoom,
  pingCrashHeartbeat,
  placeCrashBet,
  revealCrashRound,
  startCrashRound,
  startNextCrashBettingPhase,
  takeOverCrashResolver,
  voidCrashRound,
  type CrashSecret,
} from "../crashRooms";

/**
 * Contrat d'integration (Vague 3) du panneau Crash multijoueur.
 *
 * - `room` : room Firestore de type "crash" (live, mise a jour via onSnapshot dans App).
 * - `user` : utilisateur connecte, ou null (lecture seule : aucune action possible).
 * - `balance` : solde courant, utilise UNIQUEMENT pour desactiver le bouton de mise.
 *   Le debit/credit reel passe par computeCrashSettlements cote App — le panel
 *   n'ecrit jamais le solde, il n'ecrit que dans la room.
 * - `onLeave` : callback "Quitter la table" (App gere leaveOnlineRoom + navigation).
 */
export type CrashPanelProps = {
  room: OnlineRoomEntry;
  user: CasinoUser | null;
  balance: number;
  onLeave: (room: OnlineRoomEntry) => void;
};

const BETTING_COUNTDOWN_MS = 20_000;
const NEXT_ROUND_DELAY_MS = 8_000;
const HEARTBEAT_INTERVAL_MS = 5_000;

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Une erreur est survenue.";
}

function formatChips(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function CrashPanel({ room, user, balance, onLeave }: CrashPanelProps) {
  const view = useMemo(() => parseCrashRoom(room), [room]);
  const uid = user?.uid ?? "";
  const isResolver = uid !== "" && view.resolverUid === uid;
  const isPlayer = uid !== "" && room.playerIds.includes(uid);
  const myBet = uid ? view.bets[uid] : undefined;
  const betEntries = useMemo(
    () => Object.values(view.bets).sort((a, b) => (a.placedAtMs ?? 0) - (b.placedAtMs ?? 0)),
    [view.bets],
  );

  const [betAmount, setBetAmount] = useState("100");
  const [autoCashout, setAutoCashout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveMultiplier, setLiveMultiplier] = useState(1);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [hashVerified, setHashVerified] = useState<boolean | null>(null);

  // Refs lues dans les boucles asynchrones (rAF / intervals) sans re-abonner.
  const roomRef = useRef(room);
  roomRef.current = room;
  const userRef = useRef(user);
  userRef.current = user;
  const secretRef = useRef<{ roundId: number; secret: CrashSecret } | null>(null);
  const revealRequestedRef = useRef(0);
  const autoStartRequestedRef = useRef(0);
  const nextRoundRequestedRef = useRef(0);

  // Horloge 1 s : countdowns + detection heartbeat mort.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Animation locale du multiplicateur (rAF depuis crashStartAt) + reveal par le resolver
  // des que le multiplicateur local depasse le crashPoint secret.
  useEffect(() => {
    if (view.phase !== "flying" || view.startAtMs === null || view.voided) {
      setLiveMultiplier(1);
      return;
    }

    const startAt = view.startAtMs;
    const roundId = view.roundId;
    let raf = 0;

    const tick = () => {
      const multiplier = crashMultiplierAt(Date.now() - startAt);
      setLiveMultiplier(multiplier);

      let secret = secretRef.current?.roundId === roundId ? secretRef.current.secret : null;
      if (!secret) {
        secret = loadCrashSecret(roomRef.current.id, roundId);
        if (secret) {
          secretRef.current = { roundId, secret };
        }
      }

      const currentUser = userRef.current;
      if (secret && currentUser && isResolver && revealRequestedRef.current !== roundId && multiplier >= secret.crashPoint) {
        revealRequestedRef.current = roundId;
        revealCrashRound(roomRef.current, currentUser, secret.crashPoint, secret.salt).catch(() => {
          setTimeout(() => {
            revealRequestedRef.current = 0;
          }, 2000);
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view.phase, view.startAtMs, view.roundId, view.voided, isResolver]);

  // Heartbeat resolver toutes les 5 s pendant flying.
  useEffect(() => {
    if (!isResolver || view.phase !== "flying" || view.voided) {
      return;
    }

    const interval = setInterval(() => {
      const currentUser = userRef.current;
      if (currentUser) {
        pingCrashHeartbeat(roomRef.current, currentUser).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isResolver, view.phase, view.voided]);

  // Apres reveal : le resolver relance une phase betting au bout de 8 s.
  useEffect(() => {
    if (!isResolver || view.phase !== "revealed" || nextRoundRequestedRef.current === view.roundId) {
      return;
    }

    const timer = setTimeout(() => {
      nextRoundRequestedRef.current = view.roundId;
      const currentUser = userRef.current;
      if (currentUser) {
        startNextCrashBettingPhase(roomRef.current, currentUser).catch(() => {
          nextRoundRequestedRef.current = 0;
        });
      }
    }, NEXT_ROUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isResolver, view.phase, view.roundId]);

  // Lancement automatique par le resolver quand le countdown betting expire (>= 1 mise).
  useEffect(() => {
    if (!isResolver || view.phase !== "betting" || view.bettingStartedAtMs === null) {
      return;
    }
    if (!Object.keys(view.bets).length || nowMs - view.bettingStartedAtMs < BETTING_COUNTDOWN_MS) {
      return;
    }
    if (autoStartRequestedRef.current === view.roundId) {
      return;
    }

    autoStartRequestedRef.current = view.roundId;
    const currentUser = userRef.current;
    if (!currentUser) {
      return;
    }

    const roundId = view.roundId;
    startCrashRound(roomRef.current, currentUser)
      .then((secret) => {
        secretRef.current = { roundId, secret };
      })
      .catch(() => {
        autoStartRequestedRef.current = 0;
      });
  }, [isResolver, view.phase, view.bettingStartedAtMs, view.bets, view.roundId, nowMs]);

  // Verification publique du commitment SHA-256 a la phase revealed.
  useEffect(() => {
    if (view.phase !== "revealed" || view.voided || !view.hash || !view.salt || view.crashPoint <= 0) {
      setHashVerified(null);
      return;
    }

    let cancelled = false;
    verifyCrashCommitment(view.crashPoint, view.salt, view.hash)
      .then((ok) => {
        if (!cancelled) {
          setHashVerified(ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHashVerified(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view.phase, view.voided, view.hash, view.salt, view.crashPoint]);

  const runAction = async (action: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePlaceBet = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    const amount = Math.floor(Number(betAmount));
    const auto = autoCashout.trim() === "" ? 0 : Number(autoCashout.replace(",", "."));
    void runAction(() => placeCrashBet(room, user, amount, Number.isFinite(auto) ? auto : 0));
  };

  const handleStartNow = () => {
    if (!user) {
      return;
    }
    const roundId = view.roundId;
    void runAction(async () => {
      const secret = await startCrashRound(room, user);
      secretRef.current = { roundId, secret };
    });
  };

  const handleCashOut = () => {
    if (!user) {
      return;
    }
    void runAction(() => cashOutCrash(room, user));
  };

  const handleVoid = () => {
    if (!user) {
      return;
    }
    void runAction(() => voidCrashRound(room, user));
  };

  const handleTakeOver = () => {
    if (!user) {
      return;
    }
    void runAction(() => takeOverCrashResolver(room, user));
  };

  const parsedAmount = Math.floor(Number(betAmount));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= CRASH_MIN_BET && parsedAmount <= CRASH_MAX_BET;
  const canBet = Boolean(user) && view.phase === "betting" && !myBet && amountValid && balance >= parsedAmount && !busy;

  const bettingCountdownSec =
    view.bettingStartedAtMs !== null ? Math.max(0, Math.ceil((view.bettingStartedAtMs + BETTING_COUNTDOWN_MS - nowMs) / 1000)) : null;
  const heartbeatStale = view.hostHeartbeatAtMs === null || nowMs - view.hostHeartbeatAtMs > CRASH_HEARTBEAT_STALE_MS;
  const flightTooLong = view.startAtMs !== null && nowMs - view.startAtMs > CRASH_MAX_FLYING_MS;
  const resolverGone = !room.playerIds.includes(view.resolverUid);
  const canVoid = view.phase === "flying" && !view.voided && isPlayer && (isResolver || heartbeatStale || flightTooLong);
  const canTakeOver = isPlayer && !isResolver && (view.voided || heartbeatStale || resolverGone);
  const resolverName = room.players.find((player) => player.uid === view.resolverUid)?.displayName ?? room.hostName;

  const myCashedOut = myBet ? myBet.cashedOutAtMs !== null : false;
  const myLiveCashoutMultiplier =
    myBet && myBet.cashedOutAtMs !== null && view.startAtMs !== null ? crashMultiplierAt(myBet.cashedOutAtMs - view.startAtMs) : null;
  const potentialPayout = myBet ? Math.floor(myBet.amount * liveMultiplier) : 0;

  return (
    <section className={`${appStyles.panel} ${styles.crashPanel}`}>
      <header className={styles.headerRow}>
        <div className={styles.headerTitle}>
          <h2>Crash</h2>
          <span className={styles.phaseTag} data-phase={view.phase}>
            {view.phase === "betting" ? "Mises ouvertes" : view.phase === "flying" ? "En vol" : view.voided ? "Annulee" : "Crash !"}
          </span>
        </div>
        <div className={styles.headerMeta}>
          <span>Manche #{view.roundId}</span>
          <span>Resolveur : {resolverName}</span>
          <button className={appStyles.secondaryButton} type="button" onClick={() => onLeave(room)}>
            Quitter la table
          </button>
        </div>
      </header>

      {view.history.length > 0 && (
        <div className={styles.historyStrip} aria-label="Historique des 12 derniers crashs">
          {view.history.map((entry) => (
            <span key={entry.roundId} className={styles.historyBadge} data-tone={entry.crashPoint < 2 ? "low" : "high"}>
              x{entry.crashPoint.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {view.phase === "betting" && (
        <div className={styles.phaseBlock}>
          <p className={styles.statusLine}>
            {bettingCountdownSec !== null && bettingCountdownSec > 0 ? (
              <>
                Decollage dans <strong className={styles.countdown}>{bettingCountdownSec}s</strong>
                {betEntries.length === 0 ? " — en attente d'une premiere mise." : ""}
              </>
            ) : betEntries.length === 0 ? (
              "En attente d'une premiere mise pour decoller."
            ) : (
              "Decollage imminent..."
            )}
          </p>

          {!myBet && user && (
            <form className={appStyles.controls} onSubmit={handlePlaceBet}>
              <label>
                Mise
                <input
                  type="number"
                  min={CRASH_MIN_BET}
                  max={CRASH_MAX_BET}
                  step={1}
                  value={betAmount}
                  onChange={(event) => setBetAmount(event.target.value)}
                />
              </label>
              <label>
                Auto cash-out (x)
                <input
                  type="number"
                  min={1.01}
                  step={0.01}
                  placeholder="off"
                  value={autoCashout}
                  onChange={(event) => setAutoCashout(event.target.value)}
                />
              </label>
              <button className={appStyles.primaryButton} type="submit" disabled={!canBet}>
                {busy ? "..." : amountValid && balance < parsedAmount ? "Solde insuffisant" : "Miser"}
              </button>
            </form>
          )}

          {myBet && (
            <p className={styles.myBetLine}>
              Ta mise : <strong>{formatChips(myBet.amount)} jetons</strong>
              {myBet.autoCashout > 0 ? ` — auto cash-out a x${myBet.autoCashout.toFixed(2)}` : ""}
            </p>
          )}

          {isResolver && (
            <button className={appStyles.secondaryButton} type="button" onClick={handleStartNow} disabled={busy || betEntries.length === 0}>
              Lancer maintenant
            </button>
          )}
        </div>
      )}

      {view.phase === "flying" && (
        <div className={styles.phaseBlock}>
          <div className={styles.flightZone}>
            <strong className={styles.bigMultiplier}>x{liveMultiplier.toFixed(2)}</strong>
            {myBet && !myCashedOut && (
              <button className={styles.cashOutButton} type="button" onClick={handleCashOut} disabled={busy || !user}>
                CASH OUT — {formatChips(potentialPayout)} jetons
              </button>
            )}
            {myBet && myCashedOut && (
              <p className={styles.cashedOutLine}>
                Encaisse{myLiveCashoutMultiplier !== null ? ` a ~x${myLiveCashoutMultiplier.toFixed(2)}` : ""} — confirmation au crash.
              </p>
            )}
            {!myBet && <p className={styles.cashedOutLine}>Tu n'as pas mise sur cette manche.</p>}
          </div>

          {(canVoid || canTakeOver) && (
            <div className={styles.alertRow}>
              {(heartbeatStale || flightTooLong) && !isResolver && <span>Le resolveur ne repond plus.</span>}
              {canVoid && (
                <button className={appStyles.secondaryButton} type="button" onClick={handleVoid} disabled={busy}>
                  Annuler la manche
                </button>
              )}
              {canTakeOver && (
                <button className={appStyles.secondaryButton} type="button" onClick={handleTakeOver} disabled={busy}>
                  Devenir resolveur
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {view.phase === "revealed" && (
        <div className={styles.phaseBlock}>
          {view.voided ? (
            <p className={styles.voidedLine}>Manche annulee — toutes les mises sont remboursees.</p>
          ) : (
            <>
              <p className={styles.crashedLine}>
                Crash a <strong className={styles.crashedPoint}>x{view.crashPoint.toFixed(2)}</strong>
              </p>
              <p className={styles.verifyLine}>
                Engagement {view.hash ? `${view.hash.slice(0, 16)}…` : "—"}{" "}
                {hashVerified === null ? (
                  <span className={styles.verifyBadge} data-state="pending">
                    verification...
                  </span>
                ) : hashVerified ? (
                  <span className={styles.verifyBadge} data-state="ok">
                    ✓ verifie
                  </span>
                ) : (
                  <span className={styles.verifyBadge} data-state="ko">
                    ✗ invalide
                  </span>
                )}
              </p>
            </>
          )}
          <p className={styles.statusLine}>Nouvelle manche dans quelques secondes...</p>
          {canTakeOver && (
            <button className={appStyles.secondaryButton} type="button" onClick={handleTakeOver} disabled={busy}>
              Devenir resolveur
            </button>
          )}
        </div>
      )}

      {betEntries.length > 0 && (
        <div className={styles.betsList}>
          <h3 className={styles.betsTitle}>{view.phase === "revealed" ? "Resultats" : "Mises en jeu"}</h3>
          {betEntries.map((bet) => {
            const liveCashout =
              view.phase === "flying" && bet.cashedOutAtMs !== null && view.startAtMs !== null
                ? crashMultiplierAt(bet.cashedOutAtMs - view.startAtMs)
                : null;
            const state =
              view.phase === "revealed" && !view.voided
                ? bet.win
                  ? "won"
                  : "lost"
                : bet.cashedOutAtMs !== null
                  ? "cashed"
                  : "live";

            return (
              <div key={bet.uid} className={styles.betRow} data-state={state}>
                <span className={styles.betName}>
                  {bet.displayName}
                  {bet.uid === uid ? " (toi)" : ""}
                </span>
                <span className={styles.betAmount}>{formatChips(bet.amount)}</span>
                <span className={styles.betOutcome}>
                  {view.phase === "revealed" && !view.voided
                    ? bet.win
                      ? `x${bet.finalMultiplier.toFixed(2)} → +${formatChips(bet.payout)}`
                      : "perdu"
                    : view.phase === "revealed" && view.voided
                      ? "rembourse"
                      : liveCashout !== null
                        ? `cash-out ~x${liveCashout.toFixed(2)}`
                        : bet.autoCashout > 0
                          ? `auto x${bet.autoCashout.toFixed(2)}`
                          : view.phase === "flying"
                            ? "en vol"
                            : "pret"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.note}>Mises de {CRASH_MIN_BET} a {formatChips(CRASH_MAX_BET)} jetons. Les gains sont credites automatiquement apres le crash.</p>
    </section>
  );
}

export default CrashPanel;
