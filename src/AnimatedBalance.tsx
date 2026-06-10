import { useEffect, useRef, useState } from "react";
import styles from "./AnimatedBalance.module.css";

const COUNT_DURATION_MS = 600;
const CHIP_DURATION_MS = 1400;

type AnimatedBalanceProps = {
  value: number;
  className?: string;
};

type FloatingChip = {
  id: number;
  delta: number;
};

function easeOutCubic(ratio: number) {
  return 1 - Math.pow(1 - ratio, 3);
}

export function AnimatedBalance({ value, className }: AnimatedBalanceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [chips, setChips] = useState<FloatingChip[]>([]);
  const targetValueRef = useRef(value);
  const displayValueRef = useRef(value);
  const frameRef = useRef(0);
  const chipIdRef = useRef(0);
  const chipTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const previousTarget = targetValueRef.current;
    if (previousTarget === value) {
      return;
    }

    targetValueRef.current = value;

    const delta = Math.round(value - previousTarget);
    if (delta !== 0) {
      chipIdRef.current += 1;
      const chipId = chipIdRef.current;
      setChips((current) => [...current, { id: chipId, delta }]);
      const timeoutId = window.setTimeout(() => {
        setChips((current) => current.filter((chip) => chip.id !== chipId));
        chipTimeoutsRef.current = chipTimeoutsRef.current.filter((id) => id !== timeoutId);
      }, CHIP_DURATION_MS);
      chipTimeoutsRef.current.push(timeoutId);
    }

    const from = displayValueRef.current;
    const startedAt = performance.now();
    cancelAnimationFrame(frameRef.current);

    const stepFrame = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / COUNT_DURATION_MS);
      const next = ratio >= 1 ? value : from + (value - from) * easeOutCubic(ratio);
      displayValueRef.current = next;
      setDisplayValue(next);

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(stepFrame);
      }
    };

    frameRef.current = requestAnimationFrame(stepFrame);
  }, [value]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      chipTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      chipTimeoutsRef.current = [];
    },
    [],
  );

  return (
    <span className={className ? `${styles.balance} ${className}` : styles.balance} aria-live="polite">
      <span className={styles.value}>{Math.round(displayValue).toLocaleString("fr-FR")}</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={chip.delta > 0 ? `${styles.chip} ${styles.chipGain}` : `${styles.chip} ${styles.chipLoss}`}
          aria-hidden="true"
        >
          {chip.delta > 0 ? "+" : "−"}
          {Math.abs(chip.delta).toLocaleString("fr-FR")}
        </span>
      ))}
    </span>
  );
}
