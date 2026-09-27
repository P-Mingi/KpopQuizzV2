// Ranked tiers and divisions (DESIGN-SPEC 15.4 + 17.6).
//
// Tiers by season score: Bronze 0, Silver 4,000, Gold 6,500, Platinum 8,500,
// Diamond 10,500, Master 12,000. Bronze to Diamond have divisions III, II, I as
// equal thirds of the tier range; Master has none. Legend is not a score: it is
// the top 100 Masters, recomputed nightly (see ladder.ts).
//
// Integer-exact thirds: a score s in a tier [lo, hi) is
//   III when 3 x (s - lo) <  range
//   II  when 3 x (s - lo) <  2 x range
//   I   otherwise
// so Gold (6,500 to 8,500) is III 6,500..7,166, II 7,167..7,833, I 7,834..8,499.

export type TierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
export type Division = 'III' | 'II' | 'I';

export interface TierDef {
  id: TierId;
  name: string;
  min: number;
}

export const TIERS: readonly TierDef[] = [
  { id: 'bronze', name: 'Bronze', min: 0 },
  { id: 'silver', name: 'Silver', min: 4_000 },
  { id: 'gold', name: 'Gold', min: 6_500 },
  { id: 'platinum', name: 'Platinum', min: 8_500 },
  { id: 'diamond', name: 'Diamond', min: 10_500 },
  { id: 'master', name: 'Master', min: 12_000 },
] as const;

export const MASTER_MIN = 12_000;

export interface TierPlacement {
  tier: TierId;
  name: string;
  /** null for Master. */
  division: Division | null;
  /** "Gold I", "Master". */
  label: string;
}

function assertScore(score: number): void {
  if (!Number.isInteger(score) || score < 0) throw new RangeError(`invalid season score ${score}`);
}

function tierIndex(score: number): number {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (score >= TIERS[i]!.min) idx = i;
  return idx;
}

function divisionFor(score: number, lo: number, hi: number): Division {
  const range = hi - lo;
  const offset3 = 3 * (score - lo);
  if (offset3 < range) return 'III';
  if (offset3 < 2 * range) return 'II';
  return 'I';
}

/** Tier and division for a season score. */
export function tierFor(score: number): TierPlacement {
  assertScore(score);
  const i = tierIndex(score);
  const t = TIERS[i]!;
  const next = TIERS[i + 1];
  if (!next) return { tier: t.id, name: t.name, division: null, label: t.name };
  const division = divisionFor(score, t.min, next.min);
  return { tier: t.id, name: t.name, division, label: `${t.name} ${division}` };
}

export interface TierStep {
  label: string;
  tier: TierId;
  division: Division | null;
  /** Lowest season score of this step. */
  at: number;
}

/** Every step from Bronze III to Master, in order, with its first score. */
export function tierSteps(): TierStep[] {
  const steps: TierStep[] = [];
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i]!;
    const next = TIERS[i + 1];
    if (!next) {
      steps.push({ label: t.name, tier: t.id, division: null, at: t.min });
      continue;
    }
    const range = next.min - t.min;
    steps.push({ label: `${t.name} III`, tier: t.id, division: 'III', at: t.min });
    steps.push({ label: `${t.name} II`, tier: t.id, division: 'II', at: t.min + Math.ceil(range / 3) });
    steps.push({ label: `${t.name} I`, tier: t.id, division: 'I', at: t.min + Math.ceil((2 * range) / 3) });
  }
  return steps;
}

export interface NextStep {
  label: string;
  at: number;
  /** Points still needed ("210 points to Platinum III"). */
  toGo: number;
}

/** The next division or tier above `score`, or null at Master (Legend is not a score). */
export function nextStep(score: number): NextStep | null {
  assertScore(score);
  const step = tierSteps().find((s) => s.at > score);
  if (!step) return null;
  return { label: step.label, at: step.at, toGo: step.at - score };
}

/** Did the placement move from `before` to `after` (tier or division)? */
export function isPromotion(before: number, after: number): boolean {
  const a = tierFor(before);
  const b = tierFor(after);
  return a.label !== b.label && after > before;
}
