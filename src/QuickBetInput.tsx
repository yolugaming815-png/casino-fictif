import type { ChangeEvent } from "react";
import appStyles from "./App.module.css";
import styles from "./QuickBetInput.module.css";
import { MIN_BET } from "./gameLogic";
import { QUICK_BET_CHIPS, clampBet, doubleBet, halveBet } from "./quickBet";

type QuickBetInputProps = {
  id: string;
  value: number;
  onChange: (bet: number) => void;
  balance: number;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function QuickBetInput({
  id,
  value,
  onChange,
  balance,
  min = MIN_BET,
  max,
  disabled = false,
}: QuickBetInputProps) {
  const effectiveMax = Math.min(max ?? Number.POSITIVE_INFINITY, balance);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(clampBet(Number(event.target.value), min, effectiveMax));
  };

  return (
    <div className={styles.quickBet}>
      <input
        id={id}
        className={styles.betField}
        type="number"
        inputMode="numeric"
        min={min}
        max={Number.isFinite(effectiveMax) ? effectiveMax : undefined}
        step={1}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <div className={styles.chipRow}>
        {QUICK_BET_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.chipButton}
            onClick={() => onChange(clampBet(chip, min, effectiveMax))}
            disabled={disabled || chip > effectiveMax}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className={styles.modifierRow}>
        <button
          type="button"
          className={`${appStyles.secondaryButton} ${styles.modifierButton}`}
          onClick={() => onChange(halveBet(value, min, effectiveMax))}
          disabled={disabled}
        >
          ½
        </button>
        <button
          type="button"
          className={`${appStyles.secondaryButton} ${styles.modifierButton}`}
          onClick={() => onChange(doubleBet(value, min, effectiveMax))}
          disabled={disabled}
        >
          ×2
        </button>
        <button
          type="button"
          className={`${appStyles.primaryButton} ${styles.modifierButton}`}
          onClick={() => onChange(clampBet(effectiveMax, min, effectiveMax))}
          disabled={disabled || !Number.isFinite(effectiveMax)}
        >
          MAX
        </button>
      </div>
    </div>
  );
}
