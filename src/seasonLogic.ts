const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEK_MS = 7 * 86_400_000;

export function getSeasonKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function previousSeasonKey(key: string): string {
  const [yearPart, monthPart] = key.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return key;
  }
  const previousMonth = month <= 1 ? 12 : month - 1;
  const previousYear = month <= 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

export function getWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayIndex = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayIndex + 3);
  const isoYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayIndex = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayIndex + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / WEEK_MS);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function previousWeekKey(date: Date): string {
  const previous = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7, 12);
  return getWeekKey(previous);
}

export function seasonLabel(key: string): string {
  const [yearPart, monthPart] = key.split("-");
  const monthIndex = Number(monthPart) - 1;
  const label = MONTH_LABELS[monthIndex];
  if (!label || !yearPart) {
    return key;
  }
  return `${label} ${yearPart}`;
}

export function weekLabel(key: string): string {
  const separatorIndex = key.indexOf("-W");
  if (separatorIndex === -1) {
    return key;
  }
  const week = Number(key.slice(separatorIndex + 2));
  if (!Number.isFinite(week)) {
    return key;
  }
  return `Semaine ${week}`;
}

export type PeriodNetState = {
  seasonKey: string;
  seasonNet: number;
  weeklyKey: string;
  weeklyNet: number;
};

function sanitizeNet(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

export function normalizePeriodNet(value: unknown, now: Date): PeriodNetState {
  const fallback: PeriodNetState = {
    seasonKey: getSeasonKey(now),
    seasonNet: 0,
    weeklyKey: getWeekKey(now),
    weeklyNet: 0,
  };

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  return {
    seasonKey: typeof raw.seasonKey === "string" && raw.seasonKey ? raw.seasonKey : fallback.seasonKey,
    seasonNet: sanitizeNet(raw.seasonNet),
    weeklyKey: typeof raw.weeklyKey === "string" && raw.weeklyKey ? raw.weeklyKey : fallback.weeklyKey,
    weeklyNet: sanitizeNet(raw.weeklyNet),
  };
}

export function rollPeriodNet(state: PeriodNetState, now: Date): PeriodNetState {
  const seasonKey = getSeasonKey(now);
  const weeklyKey = getWeekKey(now);
  const seasonChanged = state.seasonKey !== seasonKey;
  const weeklyChanged = state.weeklyKey !== weeklyKey;

  if (!seasonChanged && !weeklyChanged) {
    return state;
  }

  return {
    seasonKey,
    seasonNet: seasonChanged ? 0 : state.seasonNet,
    weeklyKey,
    weeklyNet: weeklyChanged ? 0 : state.weeklyNet,
  };
}

export function applyNetToPeriods(state: PeriodNetState, net: number, now: Date): PeriodNetState {
  const rolled = rollPeriodNet(state, now);
  const roundedNet = sanitizeNet(net);

  return {
    ...rolled,
    seasonNet: rolled.seasonNet + roundedNet,
    weeklyNet: rolled.weeklyNet + roundedNet,
  };
}
