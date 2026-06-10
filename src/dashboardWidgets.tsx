import type { ReactNode } from "react";
import styles from "./dashboardWidgets.module.css";

function formatCredits(amount: number) {
  return Math.round(amount).toLocaleString("fr-FR");
}

type ResumeLastGameCardProps = {
  gameLabel: string;
  gameEmoji?: string;
  lastNet?: number;
  onResume: () => void;
};

export function ResumeLastGameCard({ gameLabel, gameEmoji, lastNet, onResume }: ResumeLastGameCardProps) {
  return (
    <article className={styles.widgetCard}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          {gameEmoji ?? "🎮"}
        </span>
        <h3 className={styles.widgetTitle}>Reprendre la partie</h3>
      </header>
      <p className={styles.widgetText}>
        Dernier jeu : <strong>{gameLabel}</strong>
        {typeof lastNet === "number" && lastNet !== 0 ? (
          <span className={lastNet > 0 ? styles.netGain : styles.netLoss}>
            {" "}
            ({lastNet > 0 ? "+" : "−"}
            {formatCredits(Math.abs(lastNet))})
          </span>
        ) : null}
      </p>
      <button type="button" className={styles.widgetAction} onClick={onResume}>
        Rejouer à {gameLabel}
      </button>
    </article>
  );
}

type DailyStreakCardProps = {
  streak: number;
  nextStreak: number;
  nextReward: number;
  claimedToday: boolean;
  willReset: boolean;
  onClaim: () => void;
};

export function DailyStreakCard({ streak, nextStreak, nextReward, claimedToday, willReset, onClaim }: DailyStreakCardProps) {
  return (
    <article className={styles.widgetCard}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          🔥
        </span>
        <h3 className={styles.widgetTitle}>Série quotidienne</h3>
        <span className={styles.widgetBadge}>Jour {claimedToday ? streak : nextStreak}</span>
      </header>
      <p className={styles.widgetText}>
        {claimedToday
          ? `Bonus du jour récupéré. Reviens demain pour continuer la série (${streak} jour${streak > 1 ? "s" : ""}).`
          : willReset && streak > 0
            ? `Série interrompue : on repart au jour ${nextStreak} avec ${formatCredits(nextReward)} crédits.`
            : `Récupère ${formatCredits(nextReward)} crédits pour le jour ${nextStreak}.`}
      </p>
      <button type="button" className={styles.widgetAction} onClick={onClaim} disabled={claimedToday}>
        {claimedToday ? "Déjà récupéré" : `Récupérer +${formatCredits(nextReward)}`}
      </button>
    </article>
  );
}

export type MissionPreviewItem = {
  id: string;
  label: string;
  progress: number;
  target: number;
  reward: number;
};

type MissionsPreviewCardProps = {
  missions: MissionPreviewItem[];
  onOpenMissions: () => void;
};

export function MissionsPreviewCard({ missions, onOpenMissions }: MissionsPreviewCardProps) {
  const topMissions = missions.slice(0, 3);

  return (
    <article className={styles.widgetCard}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          🎯
        </span>
        <h3 className={styles.widgetTitle}>Missions du jour</h3>
      </header>
      {topMissions.length === 0 ? (
        <p className={styles.widgetText}>Toutes les missions sont terminées. Bravo !</p>
      ) : (
        <ul className={styles.missionList}>
          {topMissions.map((mission) => {
            const ratio = mission.target > 0 ? Math.min(1, Math.max(0, mission.progress / mission.target)) : 0;
            return (
              <li key={mission.id} className={styles.missionItem}>
                <div className={styles.missionRow}>
                  <span className={styles.missionLabel}>{mission.label}</span>
                  <span className={styles.missionReward}>+{formatCredits(mission.reward)}</span>
                </div>
                <div
                  className={styles.missionTrack}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={mission.target}
                  aria-valuenow={Math.min(mission.progress, mission.target)}
                >
                  <div className={styles.missionFill} style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className={styles.widgetActionGhost} onClick={onOpenMissions}>
        Voir toutes les missions
      </button>
    </article>
  );
}

export type FriendOnlineItem = {
  uid: string;
  displayName: string;
  photoURL?: string;
};

type FriendsOnlineCardProps = {
  friends: FriendOnlineItem[];
  onOpenFriends: () => void;
};

export function FriendsOnlineCard({ friends, onOpenFriends }: FriendsOnlineCardProps) {
  return (
    <article className={styles.widgetCard}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          🟢
        </span>
        <h3 className={styles.widgetTitle}>Amis en ligne</h3>
        <span className={styles.widgetBadge}>{friends.length}</span>
      </header>
      {friends.length === 0 ? (
        <p className={styles.widgetText}>Aucun ami en ligne pour le moment.</p>
      ) : (
        <ul className={styles.friendList}>
          {friends.slice(0, 5).map((friend) => (
            <li key={friend.uid} className={styles.friendItem}>
              {friend.photoURL ? (
                <img className={styles.friendAvatar} src={friend.photoURL} alt="" />
              ) : (
                <span className={styles.friendAvatarFallback} aria-hidden="true">
                  {(friend.displayName.trim()[0] ?? "?").toLocaleUpperCase("fr-FR")}
                </span>
              )}
              <span className={styles.friendName}>{friend.displayName}</span>
              <span className={styles.friendDot} aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.widgetActionGhost} onClick={onOpenFriends}>
        Ouvrir les amis
      </button>
    </article>
  );
}

type WeeklyTournamentCardProps = {
  weekLabel: string;
  weeklyNet: number;
  rank?: number;
  leaderName?: string;
  leaderNet?: number;
  onOpenLeaderboard: () => void;
};

export function WeeklyTournamentCard({
  weekLabel,
  weeklyNet,
  rank,
  leaderName,
  leaderNet,
  onOpenLeaderboard,
}: WeeklyTournamentCardProps) {
  return (
    <article className={styles.widgetCard}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          🏆
        </span>
        <h3 className={styles.widgetTitle}>Tournoi hebdo</h3>
        <span className={styles.widgetBadge}>{weekLabel}</span>
      </header>
      <p className={styles.widgetText}>
        Ton net :{" "}
        <strong className={weeklyNet > 0 ? styles.netGain : weeklyNet < 0 ? styles.netLoss : undefined}>
          {weeklyNet > 0 ? "+" : weeklyNet < 0 ? "−" : ""}
          {formatCredits(Math.abs(weeklyNet))}
        </strong>
        {typeof rank === "number" && rank > 0 ? ` · ${rank}e place` : ""}
      </p>
      {leaderName ? (
        <p className={styles.widgetText}>
          En tête : <strong>{leaderName}</strong>
          {typeof leaderNet === "number" ? ` (+${formatCredits(Math.max(0, leaderNet))})` : ""}
        </p>
      ) : null}
      <button type="button" className={styles.widgetActionGhost} onClick={onOpenLeaderboard}>
        Voir le classement
      </button>
    </article>
  );
}

type JackpotSlotProps = {
  children: ReactNode;
};

export function JackpotSlot({ children }: JackpotSlotProps) {
  return <div className={styles.jackpotSlot}>{children}</div>;
}

type SoupButtonProps = {
  onClaim: () => void;
  disabled?: boolean;
};

export function SoupButton({ onClaim, disabled = false }: SoupButtonProps) {
  return (
    <div className={styles.soupBlock}>
      <button type="button" className={styles.soupButton} onClick={onClaim} disabled={disabled}>
        🥣 Soupe populaire +200
      </button>
      <p className={styles.soupHint}>Affiche le titre « Ruiné(e) » pendant 24 h.</p>
    </div>
  );
}

type LevelChipProps = {
  level: number;
  title?: string;
  soupActive?: boolean;
  compact?: boolean;
};

export function LevelChip({ level, title, soupActive = false, compact = false }: LevelChipProps) {
  return (
    <span className={compact ? `${styles.levelChip} ${styles.levelChipCompact}` : styles.levelChip}>
      <span className={styles.levelChipLevel}>Niv. {level}</span>
      {!compact && title ? <span className={styles.levelChipTitle}>{soupActive ? "Ruiné(e)" : title}</span> : null}
      {compact && soupActive ? <span aria-hidden="true">🥣</span> : null}
    </span>
  );
}

type XpBarProps = {
  level: number;
  current: number;
  required: number;
  ratio: number;
};

export function XpBar({ level, current, required, ratio }: XpBarProps) {
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  return (
    <div className={styles.xpBar}>
      <div className={styles.xpBarHeader}>
        <span>Niveau {level}</span>
        <span className={styles.xpBarValues}>
          {formatCredits(current)} / {formatCredits(required)} XP
        </span>
      </div>
      <div
        className={styles.xpTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={Math.min(current, required)}
        aria-label={`Progression du niveau ${level}`}
      >
        <div className={styles.xpFill} style={{ width: `${Math.round(clampedRatio * 100)}%` }} />
      </div>
    </div>
  );
}

export type HallOfFameRecord = {
  key: string;
  label: string;
  top: Array<{
    uid: string;
    displayName: string;
    photoURL?: string;
    seasonNet: number;
  }>;
};

type HallOfFamePanelProps = {
  records: HallOfFameRecord[];
};

const HALL_OF_FAME_MEDALS = ["🥇", "🥈", "🥉"];

export function HallOfFamePanel({ records }: HallOfFamePanelProps) {
  return (
    <section className={styles.hallOfFame}>
      <header className={styles.widgetHeader}>
        <span className={styles.widgetEmoji} aria-hidden="true">
          🏛️
        </span>
        <h3 className={styles.widgetTitle}>Hall of Fame</h3>
      </header>
      {records.length === 0 ? (
        <p className={styles.widgetText}>Aucune saison archivée pour le moment.</p>
      ) : (
        <ul className={styles.hallList}>
          {records.map((record) => (
            <li key={record.key} className={styles.hallRecord}>
              <span className={styles.hallLabel}>{record.label}</span>
              <ol className={styles.hallTop}>
                {record.top.map((entry, index) => (
                  <li key={`${record.key}-${entry.uid}`} className={styles.hallEntry}>
                    <span aria-hidden="true">{HALL_OF_FAME_MEDALS[index] ?? "•"}</span>
                    <span className={styles.hallName}>{entry.displayName}</span>
                    <span className={entry.seasonNet >= 0 ? styles.netGain : styles.netLoss}>
                      {entry.seasonNet >= 0 ? "+" : "−"}
                      {formatCredits(Math.abs(entry.seasonNet))}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
