export type WheelPrizeKind = "credits" | "fragments" | "key";

export type WheelPrize = {
  id: string;
  label: string;
  kind: WheelPrizeKind;
  amount: number;
  weight: number;
};

export const WHEEL_SEGMENTS: WheelPrize[] = [
  { id: "credits-50", label: "+50 credits", kind: "credits", amount: 50, weight: 28 },
  { id: "credits-100", label: "+100 credits", kind: "credits", amount: 100, weight: 24 },
  { id: "credits-250", label: "+250 credits", kind: "credits", amount: 250, weight: 18 },
  { id: "credits-500", label: "+500 credits", kind: "credits", amount: 500, weight: 10 },
  { id: "credits-1000", label: "+1000 credits", kind: "credits", amount: 1000, weight: 5 },
  { id: "fragments-3", label: "3 fragments", kind: "fragments", amount: 3, weight: 13 },
  { id: "key-rare", label: "Cle rare", kind: "key", amount: 1, weight: 2 },
];

const TOTAL_WHEEL_WEIGHT = WHEEL_SEGMENTS.reduce(
  (sum, segment) => sum + segment.weight,
  0,
);

export function spinDailyWheel(
  rng: () => number = Math.random,
): { prize: WheelPrize; segmentIndex: number } {
  const roll = rng() * TOTAL_WHEEL_WEIGHT;
  let cumulative = 0;

  for (let index = 0; index < WHEEL_SEGMENTS.length; index += 1) {
    cumulative += WHEEL_SEGMENTS[index].weight;
    if (roll < cumulative) {
      return { prize: WHEEL_SEGMENTS[index], segmentIndex: index };
    }
  }

  const lastIndex = WHEEL_SEGMENTS.length - 1;
  return { prize: WHEEL_SEGMENTS[lastIndex], segmentIndex: lastIndex };
}

export function canSpinDailyWheel(
  state: { date: string; spun: boolean } | null,
  today: string,
): boolean {
  if (!state) {
    return true;
  }

  if (state.date !== today) {
    return true;
  }

  return !state.spun;
}
