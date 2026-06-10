import { useMemo, useRef, useState } from "react";
import appStyles from "./App.module.css";
import styles from "./DailyWheel.module.css";
import { WHEEL_SEGMENTS } from "./wheelLogic";
import type { WheelPrize } from "./wheelLogic";

/**
 * Contrat d'integration (Vague 3).
 *
 * Le parent garde la main sur la logique et le credit :
 * - `canSpin` : resultat de canSpinDailyWheel(state, today). Le bouton est
 *   desactive si false (ou pendant l'animation).
 * - `lastPrizeLabel` : label du dernier lot gagne (persiste), ou null si
 *   aucun spin enregistre. Affiche quand aucune animation n'est en cours.
 * - `onSpin` : appele au clic. Le parent fait spinDailyWheel(), credite le
 *   lot, persiste l'etat, puis retourne { prize, segmentIndex } pour que le
 *   composant anime la roue (~3 s) vers le bon segment et affiche le lot.
 *   Retourner null pour refuser le spin (rien ne se passe).
 */
export type DailyWheelProps = {
  canSpin: boolean;
  lastPrizeLabel: string | null;
  onSpin: () => { prize: WheelPrize; segmentIndex: number } | null;
};

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;
const SPIN_DURATION_MS = 3000;
const FULL_TURNS = 5;

const SEGMENT_COLORS = [
  "#1c2541",
  "#34204f",
  "#173a5e",
  "#3e2a63",
  "#142f4b",
  "#46306b",
  "#7a5d16",
];

function buildConicGradient(): string {
  const stops = WHEEL_SEGMENTS.map((_, index) => {
    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
    const from = (index * SEGMENT_ANGLE).toFixed(4);
    const to = ((index + 1) * SEGMENT_ANGLE).toFixed(4);
    return `${color} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function DailyWheel({ canSpin, lastPrizeLabel, onSpin }: DailyWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonLabel, setWonLabel] = useState<string | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const wheelGradient = useMemo(buildConicGradient, []);

  const handleSpin = () => {
    if (spinning || !canSpin) {
      return;
    }

    const outcome = onSpin();
    if (!outcome) {
      return;
    }

    const segmentCenter = (outcome.segmentIndex + 0.5) * SEGMENT_ANGLE;
    const baseRotation = rotation - (rotation % 360);
    const target = baseRotation + FULL_TURNS * 360 + (360 - segmentCenter);

    setWonLabel(null);
    setSpinning(true);
    setRotation(target);

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      setSpinning(false);
      setWonLabel(outcome.prize.label);
    }, SPIN_DURATION_MS);
  };

  const displayedLabel = wonLabel ?? (spinning ? null : lastPrizeLabel);

  return (
    <section className={`${appStyles.machine} ${styles.wheelMachine}`}>
      <h2 className={styles.wheelTitle}>Roue quotidienne</h2>
      <div className={styles.wheelStage}>
        <div className={styles.pointer} aria-hidden="true" />
        <div
          className={`${styles.wheel} ${spinning ? styles.wheelSpinning : ""}`}
          style={{
            background: wheelGradient,
            transform: `rotate(${rotation}deg)`,
          }}
        >
          {WHEEL_SEGMENTS.map((segment, index) => (
            <span
              key={segment.id}
              className={styles.segmentLabel}
              style={{
                transform: `rotate(${(index + 0.5) * SEGMENT_ANGLE - 90}deg)`,
              }}
            >
              {segment.label}
            </span>
          ))}
          <div className={styles.hub} aria-hidden="true" />
        </div>
      </div>
      <div className={appStyles.controls}>
        <button
          type="button"
          className={appStyles.primaryButton}
          onClick={handleSpin}
          disabled={!canSpin || spinning}
        >
          {spinning ? "La roue tourne..." : "Tourner (gratuit, 1x/jour)"}
        </button>
      </div>
      <p className={styles.prizeLine} role="status" aria-live="polite">
        {spinning
          ? "Bonne chance !"
          : displayedLabel
            ? wonLabel
              ? `Lot gagne : ${wonLabel}`
              : `Dernier lot : ${displayedLabel}`
            : canSpin
              ? "Un tour gratuit vous attend."
              : "Revenez demain pour un nouveau tour."}
      </p>
    </section>
  );
}
