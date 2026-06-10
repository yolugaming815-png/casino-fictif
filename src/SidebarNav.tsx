import { useEffect, useState } from "react";
import appStyles from "./App.module.css";
import styles from "./SidebarNav.module.css";
import { NAV_GROUPS, type CasinoGame, type MainSection, type NavGroupId } from "./sections";
import type { CasinoUser, OnlineRoomType } from "./firebaseClient";
import { publicCasinoAvatarUrl } from "./avatarLibrary";
import { LevelChip } from "./dashboardWidgets";

/**
 * Contrat d'intégration (Vague 3c) : remplace le bloc nav d'App.tsx (~4256-4525),
 * y compris le bouton "Menu" mobile et le backdrop.
 *
 * - `levelBadge` : null tant que la progression n'est pas chargée ; sinon affiché sous le profil.
 * - `badges` : compteurs bruts par section sociale ; agrégés sur l'en-tête du groupe replié.
 * - `firebaseReady` : résultat de `isFirebaseConfigured()` (gate du bouton Connexion Google).
 * - `onMobileMenuOpenChange` : brancher sur `setMobileMenuOpen` (ouvre via le bouton Menu, ferme via le backdrop).
 * - `onSelectSection` / `onSelectGame` / `onSelectOnlineGame` : brancher sur
 *   `selectMainSection` / `selectGame` / `selectOnlineGame` (qui ferment déjà le menu mobile).
 * - État des groupes pliables persisté dans localStorage "casino-nav-groups-v1" ;
 *   le groupe contenant la section active est automatiquement déplié.
 */
export type SidebarNavProps = {
  activeSection: MainSection;
  activeGame: CasinoGame;
  activeOnlineGame: OnlineRoomType;
  mobileMenuOpen: boolean;
  isAdmin: boolean;
  accountUser: CasinoUser | null;
  accountLoading: boolean;
  balance: number;
  isLeaderboardLeader: boolean;
  firebaseReady: boolean;
  levelBadge: { level: number; title?: string; soupActive?: boolean } | null;
  badges: { friends: number; trades: number; messages: number; activity: number };
  onSelectSection: (section: MainSection) => void;
  onSelectGame: (game: CasinoGame) => void;
  onSelectOnlineGame: (game: OnlineRoomType) => void;
  onOpenOwnProfile: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onMobileMenuOpenChange: (open: boolean) => void;
};

const NAV_GROUPS_STORAGE_KEY = "casino-nav-groups-v1";

type GroupOpenState = Record<NavGroupId, boolean>;

const DEFAULT_GROUP_STATE: GroupOpenState = {
  casino: true,
  multiplayer: true,
  collection: true,
  social: true,
};

function loadGroupState(): GroupOpenState {
  try {
    const raw = window.localStorage.getItem(NAV_GROUPS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_GROUP_STATE };
    }
    const parsed = JSON.parse(raw) as Partial<Record<NavGroupId, unknown>>;
    const state = { ...DEFAULT_GROUP_STATE };
    for (const group of NAV_GROUPS) {
      if (typeof parsed[group.id] === "boolean") {
        state[group.id] = parsed[group.id] as boolean;
      }
    }
    return state;
  } catch {
    return { ...DEFAULT_GROUP_STATE };
  }
}

function saveGroupState(state: GroupOpenState) {
  try {
    window.localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible : on garde l'état en mémoire seulement
  }
}

function groupOfSection(section: MainSection): NavGroupId | null {
  for (const group of NAV_GROUPS) {
    if (group.sections.includes(section)) {
      return group.id;
    }
  }
  return null;
}

const SECTION_LABELS: Record<MainSection, string> = {
  home: "Accueil",
  games: "Jeux",
  online: "Jeux en ligne",
  missions: "Missions",
  cases: "Cases",
  shop: "Boutique",
  inventory: "Inventaire",
  bonus: "Bonus",
  friends: "Amis",
  trades: "Echanges",
  messages: "Messages",
  activity: "Activite",
  admin: "Admin",
};

const CASINO_GAMES: Array<{ id: CasinoGame; label: string; icon: NavIconName }> = [
  { id: "slots", label: "Machine a sous", icon: "slots" },
  { id: "blackjack", label: "Blackjack", icon: "blackjack" },
  { id: "plinko", label: "Plinko", icon: "plinko" },
  { id: "roulette", label: "Roulette", icon: "roulette" },
  { id: "rocket", label: "Rocket Games", icon: "rocket" },
  { id: "claw", label: "Machine a pince", icon: "claw" },
  { id: "mines", label: "Mines", icon: "mines" },
  { id: "hilo", label: "Hi-Lo", icon: "hilo" },
];

const ONLINE_GAMES: Array<{ id: OnlineRoomType; label: string; icon: NavIconName }> = [
  { id: "duel", label: "Duel", icon: "duel" },
  { id: "poker", label: "Poker", icon: "poker" },
  { id: "russian-roulette", label: "Roulette russe", icon: "roulette" },
  { id: "crash", label: "Crash", icon: "crash" },
  { id: "roulette-table", label: "Roulette live", icon: "roulette" },
  { id: "coinflip", label: "Pile ou face", icon: "coinflip" },
];

export function SidebarNav({
  activeSection,
  activeGame,
  activeOnlineGame,
  mobileMenuOpen,
  isAdmin,
  accountUser,
  accountLoading,
  balance,
  isLeaderboardLeader,
  firebaseReady,
  levelBadge,
  badges,
  onSelectSection,
  onSelectGame,
  onSelectOnlineGame,
  onOpenOwnProfile,
  onSignIn,
  onSignOut,
  onMobileMenuOpenChange,
}: SidebarNavProps) {
  const [groupOpen, setGroupOpen] = useState<GroupOpenState>(loadGroupState);

  const activeGroup = groupOfSection(activeSection);

  useEffect(() => {
    if (!activeGroup) {
      return;
    }
    setGroupOpen((current) => {
      if (current[activeGroup]) {
        return current;
      }
      const next = { ...current, [activeGroup]: true };
      saveGroupState(next);
      return next;
    });
  }, [activeGroup]);

  function toggleGroup(groupId: NavGroupId) {
    setGroupOpen((current) => {
      const next = { ...current, [groupId]: !current[groupId] };
      saveGroupState(next);
      return next;
    });
  }

  const sectionBadges: Partial<Record<MainSection, number>> = {
    friends: badges.friends,
    trades: badges.trades,
    messages: badges.messages,
    activity: badges.activity,
  };

  function groupBadgeTotal(groupId: NavGroupId): number {
    const group = NAV_GROUPS.find((entry) => entry.id === groupId);
    if (!group) {
      return 0;
    }
    return group.sections.reduce((sum, section) => sum + (sectionBadges[section] ?? 0), 0);
  }

  function renderSectionButton(section: MainSection) {
    const badge = sectionBadges[section] ?? 0;
    const isExpandable = section === "games" || section === "online";
    return (
      <button
        key={section}
        className={activeSection === section ? appStyles.activeTab : ""}
        type="button"
        onClick={() => onSelectSection(section)}
      >
        <NavIcon name={section} />
        <span className={appStyles.tabLabel}>{SECTION_LABELS[section]}</span>
        {badge > 0 ? (
          <span
            className={section === "messages" ? `${appStyles.tabBadge} ${appStyles.messageUnreadBadge}` : appStyles.tabBadge}
            aria-label={section === "messages" ? `${badge} message${badge > 1 ? "s" : ""} non lu${badge > 1 ? "s" : ""}` : undefined}
          >
            {badge}
          </span>
        ) : null}
        <span className={appStyles.tabChevron} aria-hidden="true">
          {isExpandable && activeSection === section ? "⌄" : "›"}
        </span>
      </button>
    );
  }

  function renderGroup(groupId: NavGroupId) {
    const group = NAV_GROUPS.find((entry) => entry.id === groupId);
    if (!group) {
      return null;
    }
    const open = groupOpen[groupId];
    const badgeTotal = groupBadgeTotal(groupId);
    return (
      <div key={groupId} className={styles.navGroup}>
        <button
          className={styles.groupHeader}
          type="button"
          aria-expanded={open}
          onClick={() => toggleGroup(groupId)}
        >
          <span className={styles.groupEmoji} aria-hidden="true">
            {group.emoji}
          </span>
          <span className={styles.groupLabel}>{group.label}</span>
          {!open && badgeTotal > 0 ? <span className={appStyles.tabBadge}>{badgeTotal}</span> : null}
          <span className={`${styles.groupChevron} ${open ? styles.groupChevronOpen : ""}`} aria-hidden="true">
            ›
          </span>
        </button>
        {open ? (
          <div className={styles.groupBody}>
            {group.sections.map((section) => (
              <div key={section}>
                {renderSectionButton(section)}
                {section === "games" && activeSection === "games" ? (
                  <div className={appStyles.subTabs} aria-label="Choix du jeu">
                    {CASINO_GAMES.map((game) => (
                      <button
                        key={game.id}
                        className={activeGame === game.id ? appStyles.activeTab : ""}
                        type="button"
                        onClick={() => onSelectGame(game.id)}
                      >
                        <NavIcon name={game.icon} />
                        <span className={appStyles.tabLabel}>{game.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {section === "online" && activeSection === "online" ? (
                  <div className={appStyles.subTabs} aria-label="Choix du jeu en ligne">
                    {ONLINE_GAMES.map((game) => (
                      <button
                        key={game.id}
                        className={activeOnlineGame === game.id ? appStyles.activeTab : ""}
                        type="button"
                        onClick={() => onSelectOnlineGame(game.id)}
                      >
                        <NavIcon name={game.icon} />
                        <span className={appStyles.tabLabel}>{game.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const avatar = publicCasinoAvatarUrl(
    accountUser?.photoURL,
    accountUser?.uid || accountUser?.email || accountUser?.displayName || "joueur",
  );

  return (
    <>
      {!mobileMenuOpen && (
        <button className={appStyles.mobileMenuButton} type="button" onClick={() => onMobileMenuOpenChange(true)}>
          Menu
        </button>
      )}
      {mobileMenuOpen ? (
        <button
          className={appStyles.mobileMenuBackdrop}
          type="button"
          aria-label="Fermer le menu"
          onClick={() => onMobileMenuOpenChange(false)}
        />
      ) : null}

      <nav
        className={`${appStyles.modeTabs} ${mobileMenuOpen ? appStyles.modeTabsOpen : ""}`}
        aria-label="Section principale"
        style={mobileMenuOpen ? { transform: "translateX(0px)", transition: "none" } : undefined}
      >
        <button className={appStyles.menuProfile} type="button" onClick={onOpenOwnProfile}>
          <span className={appStyles.menuAvatarFrame}>
            {isLeaderboardLeader ? (
              <span className={appStyles.menuRankBadge} aria-label="Premier du classement">
                <svg viewBox="0 0 32 22" aria-hidden="true">
                  <path d="M4 20 L7 7 L13 14 L16 3 L19 14 L25 7 L28 20 Z" />
                  <path d="M7 20 H25" />
                </svg>
              </span>
            ) : null}
            <span className={appStyles.menuAvatar} data-avatar-source={avatar.source}>
              <img alt="" src={avatar.url} />
            </span>
            {isAdmin ? (
              <span className={appStyles.menuAdminBadge} aria-label="Admin">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 4 L20 11" />
                  <path d="M11 6 L18 13" />
                  <path d="M5 20 L14 11" />
                  <path d="M3 18 L6 21" />
                  <path d="M10 5 L14 1 L23 10 L19 14 Z" />
                </svg>
              </span>
            ) : null}
          </span>
          <div>
            <strong>{accountUser?.displayName || "Joueur"}</strong>
            <small>{balance.toLocaleString("fr-FR")} credits</small>
          </div>
        </button>
        {levelBadge ? (
          <div className={styles.profileLevel}>
            <LevelChip level={levelBadge.level} title={levelBadge.title} soupActive={levelBadge.soupActive} />
          </div>
        ) : null}
        <div className={appStyles.menuAccountActions} aria-label="Compte">
          {accountUser ? (
            <button className={appStyles.menuActionButton} type="button" onClick={onSignOut} disabled={accountLoading}>
              <span>Déconnexion</span>
            </button>
          ) : (
            <button
              className={appStyles.menuActionButton}
              type="button"
              onClick={onSignIn}
              disabled={accountLoading || !firebaseReady}
              title="Connecte-toi pour sauvegarder tes scores"
            >
              <span>Connexion Google</span>
            </button>
          )}
        </div>

        {renderSectionButton("home")}
        {renderGroup("casino")}
        {renderGroup("multiplayer")}
        {renderSectionButton("missions")}
        {renderGroup("collection")}
        {renderGroup("social")}
        {isAdmin ? renderSectionButton("admin") : null}
      </nav>
    </>
  );
}

type NavIconName =
  | MainSection
  | "slots"
  | "blackjack"
  | "plinko"
  | "roulette"
  | "rocket"
  | "claw"
  | "duel"
  | "poker"
  | "mines"
  | "hilo"
  | "crash"
  | "coinflip";

/** Équivalent local du MenuIcon interne d'App.tsx (mêmes tracés SVG + nouveaux jeux). */
function NavIcon({ name }: { name: NavIconName }) {
  return (
    <span className={appStyles.tabIcon} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        {name === "home" && (
          <>
            <path d="M6 15.5 16 7l10 8.5" />
            <path d="M9.5 14.5V25h13V14.5" />
            <path d="M13.5 25v-7h5v7" />
            <path d="M21.5 9.5v-3h3v5.5" />
          </>
        )}
        {name === "games" && (
          <>
            <rect x="6" y="10" width="11" height="11" rx="2.5" transform="rotate(-12 11.5 15.5)" />
            <rect x="15" y="12" width="11" height="11" rx="2.5" transform="rotate(10 20.5 17.5)" />
            <circle cx="10.5" cy="14" r="0.8" />
            <circle cx="13.5" cy="17" r="0.8" />
            <circle cx="19" cy="16" r="0.8" />
            <circle cx="22" cy="19" r="0.8" />
          </>
        )}
        {name === "slots" && (
          <>
            <rect x="6" y="9" width="18" height="15" rx="2" />
            <path d="M10 9V6h10v3M8 24h16M11 13h3M15 13h3M19 13h3" />
            <path d="M12.5 18h7" />
            <path d="M25 11h2v7h-2" />
          </>
        )}
        {name === "blackjack" || name === "poker" ? (
          <>
            <path d="M16 6c4.8 4.2 8 7.4 8 11.2 0 3-2.3 5.1-5.2 5.1-1.1 0-2.1-.3-2.8-.9.4 2.5 1.6 3.8 3.7 4.6h-7.4c2.1-.8 3.3-2.1 3.7-4.6-.8.6-1.7.9-2.8.9-2.9 0-5.2-2.1-5.2-5.1C8 13.4 11.2 10.2 16 6Z" />
            <path d="M16 9.5v12" />
          </>
        ) : null}
        {name === "plinko" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M16 10v12M12 13h6.4a3 3 0 0 1 0 6H12" />
            <path d="M8.5 9.5 6.8 7.8M23.5 9.5l1.7-1.7M8.5 22.5l-1.7 1.7M23.5 22.5l1.7 1.7" />
          </>
        )}
        {name === "roulette" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <circle cx="16" cy="16" r="4" />
            <path d="M16 6v20M6 16h20M9 9l14 14M23 9 9 23" />
            <circle cx="20.8" cy="11.5" r="1.3" />
          </>
        )}
        {name === "rocket" && (
          <>
            <path d="M17 5c4.2 3 5.8 8.2 3.8 13.5L14 11.7C15 8.5 16.1 6.2 17 5Z" />
            <path d="M14 11.7 8 13l4.8 2.6M20.8 18.5 19.5 25l-2.8-4.7" />
            <circle cx="17.9" cy="11.2" r="1.6" />
            <path d="M11.5 20.5 7 25M9 18l-3 3M14 23l-3 3" />
          </>
        )}
        {name === "claw" && (
          <>
            <rect x="7" y="9" width="12" height="14" rx="2" />
            <rect x="10" y="13" width="6" height="5" rx="1" />
            <path d="M21 8v15M19 8h4M21 23l-3 3M21 23l3 3" />
            <path d="M8 26h10" />
          </>
        )}
        {name === "mines" && (
          <>
            <circle cx="16" cy="18" r="7" />
            <path d="M16 7v4M5 18h4M23 18h4M8.5 10.5l2.8 2.8M23.5 10.5l-2.8 2.8M8.5 25.5l2.8-2.8M23.5 25.5l-2.8-2.8" />
            <circle cx="13.5" cy="15.5" r="1.2" />
          </>
        )}
        {name === "hilo" && (
          <>
            <rect x="7" y="6" width="12" height="16" rx="2" />
            <path d="M13 11v6M10.5 13.5 13 11l2.5 2.5" />
            <rect x="15" y="11" width="12" height="16" rx="2" transform="rotate(8 21 19)" />
            <path d="M21.5 23.5v-6M19 21l2.5 2.5L24 21" />
          </>
        )}
        {name === "crash" && (
          <>
            <path d="M6 25V7M6 25h20" />
            <path d="M8 22c5-1 9-4 11.5-10" />
            <path d="m17 9.5 2.5 2.5L22 9.5M19.5 6.5V12" />
          </>
        )}
        {name === "coinflip" && (
          <>
            <circle cx="16" cy="16" r="8" />
            <path d="M16 11v10M13.5 13.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" />
            <path d="M5 12c.8-2.6 2.3-4.7 4.5-6.2M27 20c-.8 2.6-2.3 4.7-4.5 6.2" />
          </>
        )}
        {name === "online" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M6 16h20M16 6c3 3.1 4.4 6.5 4.4 10S19 22.9 16 26M16 6c-3 3.1-4.4 6.5-4.4 10S13 22.9 16 26" />
          </>
        )}
        {name === "duel" && (
          <>
            <path d="M8 23 23 8M9.5 8.5l14 14" />
            <path d="M6 20.5 11.5 26 8 26 6 24ZM20.5 6 26 11.5 26 8 24 6Z" />
            <path d="M6 11.5 11.5 6 8 6 6 8ZM20.5 26 26 20.5 26 24 24 26Z" />
          </>
        )}
        {name === "missions" && (
          <>
            <rect x="8" y="6" width="16" height="20" rx="2.5" />
            <path d="M12 11h8M12 16h8M12 21h5" />
            <path d="m11 16 1.6 1.6L16 14" />
            <path d="M13 6h6l-1-2h-4Z" />
          </>
        )}
        {name === "cases" && (
          <>
            <path d="M7 12 16 7l9 5-9 5Z" />
            <path d="M7 12v9l9 5 9-5v-9M16 17v9" />
            <path d="M11.5 9.5 20.5 14.5" />
          </>
        )}
        {name === "shop" && (
          <>
            <path d="M7 9h3l2.2 11h10.3L25 12H11" />
            <circle cx="14" cy="25" r="1.7" />
            <circle cx="22" cy="25" r="1.7" />
            <path d="M16 15h4M18 13v4" />
          </>
        )}
        {name === "inventory" && (
          <>
            <rect x="8" y="10" width="16" height="15" rx="3" />
            <path d="M11 10V8a5 5 0 0 1 10 0v2M8 17h16M12 21h8" />
            <path d="M10 25v2M22 25v2" />
          </>
        )}
        {name === "bonus" && (
          <>
            <rect x="7" y="13" width="18" height="12" rx="2" />
            <path d="M6 13h20M16 13v12M8.5 10.5c0-2 1.5-3 3-2.5 1.7.6 3.2 3 4.5 5-2.8.1-5.4-.2-7.5-2.5ZM23.5 10.5c0-2-1.5-3-3-2.5-1.7.6-3.2 3-4.5 5 2.8.1 5.4-.2 7.5-2.5Z" />
          </>
        )}
        {name === "friends" && (
          <>
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="21" cy="13" r="3" />
            <path d="M5.5 25c.8-4.5 4-7 7.2-7s6.2 2.5 7 7" />
            <path d="M18.5 25c.5-2.7 2.3-4.5 5-4.8 1.4.7 2.5 2.3 3 4.8" />
          </>
        )}
        {name === "trades" && (
          <>
            <path d="M8 11h15l-3-3M24 21H9l3 3" />
            <path d="M23 8v6M9 18v6" />
            <circle cx="13" cy="16" r="2" />
          </>
        )}
        {name === "messages" && (
          <>
            <rect x="6" y="9" width="20" height="15" rx="2.5" />
            <path d="m7 11 9 7 9-7" />
            <path d="m7 23 6.5-6M25 23l-6.5-6" />
          </>
        )}
        {name === "activity" && (
          <>
            <path d="M16 7v11" />
            <circle cx="16" cy="23" r="1.5" />
            <path d="M10 10c1.5-2 3.5-3 6-3s4.5 1 6 3M9 25h14" />
          </>
        )}
        {name === "admin" && (
          <>
            <path d="M16 6 25 10v6.5c0 5.1-3.4 8.6-9 10-5.6-1.4-9-4.9-9-10V10Z" />
            <path d="m16 12 1.4 2.8 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4Z" />
          </>
        )}
      </svg>
    </span>
  );
}

export default SidebarNav;
