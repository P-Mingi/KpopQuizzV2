// V12 G5: what the personality pages hand to the client component, and the pure
// helpers that build it (unit tested). No Supabase import here.

import { AXIS_KEYS, WEIGHT_SCALE } from './engine';

import type { AxisKey, EngineSpec, Weights } from './engine';
import type { UxIconName } from '@/lib/ux-v1/a0/icons';

export type PersonalityQuizId = 'wma' | 'kpdh';

export interface ResultView {
  id: string;
  name: string;
  /** Public role (a member) or label and debut year (a group). */
  role: string;
  /** About the player (a member result) or why the group fits (the bridge quiz). */
  description: string;
  traits: string[];
  /** A group photo from public/idols. A member result never has one. */
  photo: string | null;
  songs?: Array<{ title: string; year: number }>;
  /** The group page, when the group exists. */
  groupHref?: string | null;
  /** The group's blindtest, only when it is playable. */
  blindtestHref?: string | null;
}

export interface DistributionView {
  /** Real number of saved results behind the shares. */
  total: number;
  rows: Array<{ id: string; label: string; pct: number }>;
}

export interface QuizView {
  quiz: PersonalityQuizId;
  /** groups.slug of a Which member are you page. */
  groupSlug: string | null;
  kicker: string;
  kickerIcon: 'users' | 'music';
  /** The H1, split so the highlighted words are an <em>. */
  title: { before: string; em: string; after: string };
  lead: string;
  meta: string[];
  cta: string;
  /** "You are" / "Your group is". */
  eyebrow: string;
  /** "STAY", or "fans" / "players" when the fandom has no name. */
  who: string;
  questions: Array<{ text: string; options: Array<{ text: string; icon: UxIconName }> }>;
  engine: EngineSpec;
  results: ResultView[];
  distribution: DistributionView | null;
  /** Absolute canonical URL, for sharing. */
  shareUrl: string;
  /** "Which Stray Kids member are you", used on the share images. */
  shareKicker: string;
  /** Offer "Set <member> as your bias tag" under the result. */
  biasOffer: boolean;
}

/**
 * Below this many saved results the shares are hidden (the "same result" line and
 * the distribution): three results would print "33% of fans", a real number that
 * says nothing. Real data only either way; the count shown is the real total.
 */
export const MIN_RESULTS_FOR_SHARES = 20;

/**
 * Shares per outcome from real counts. Only the listed outcomes count (a stored
 * name that is no longer an outcome is left out of the total too). Null when the
 * total is under `min`.
 */
export function buildDistribution(
  counts: Readonly<Record<string, number>> | null,
  outcomes: ReadonlyArray<{ id: string; label: string; key: string }>,
  min: number = MIN_RESULTS_FOR_SHARES,
): DistributionView | null {
  if (!counts) return null;
  const rows = outcomes.map((o) => {
    const n = counts[o.key];
    return { id: o.id, label: o.label, n: typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 };
  });
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (total < min || total <= 0) return null;
  return { total, rows: rows.map((r) => ({ id: r.id, label: r.label, pct: (r.n / total) * 100 })) };
}

/** The whole-number share printed for one outcome, or null when there is none to show. */
export function shareOf(distribution: DistributionView | null, id: string): number | null {
  const row = distribution?.rows.find((r) => r.id === id);
  return row ? Math.round(row.pct) : null;
}

// The stored questions have no icon. The tile icon is decoration (aria-hidden),
// picked from where the option points: its strongest axis, and which end of it.
const AXIS_ICON: Record<AxisKey, { low: UxIconName; high: UxIconName }> = {
  energy: { low: 'moon', high: 'zap' },
  chaos: { low: 'check', high: 'flame' },
  care: { low: 'shield', high: 'heart' },
  craft: { low: 'star', high: 'pen' },
  heart: { low: 'sun', high: 'target' },
  spotlight: { low: 'eye', high: 'book' },
};

export function axisOptionIcon(weights: Weights): UxIconName {
  let best: { key: AxisKey; pull: number; v: number } | null = null;
  for (const key of AXIS_KEYS) {
    const v = weights[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const pull = Math.abs(v - WEIGHT_SCALE / 2);
    if (!best || pull > best.pull) best = { key, pull, v };
  }
  if (!best) return 'star';
  return best.v < WEIGHT_SCALE / 2 ? AXIS_ICON[best.key].low : AXIS_ICON[best.key].high;
}

export function whichMemberPath(groupSlug: string): string {
  return `/which-${groupSlug}-member-are-you`;
}
