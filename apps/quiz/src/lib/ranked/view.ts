// Ranked view models: what the ranked page and the results slot render, derived
// from engine outputs only (season card, ladder rows, season impact). Pure and
// client-safe (no DB, no Next): the page components, the render tests and the e2e
// fixtures all go through these functions, so the text a player reads is the
// engine's number, formatted one way.

import { BEST_RUNS, DAILY_RUN_LIMIT, PLACEMENT_RUNS } from './constants';
import { MASTER_MIN, nextStep, tierFor, tierSteps } from './tiers';

import type { SeasonImpact } from './season';
import type { SeasonCard } from './service';
import type { TierId } from './tiers';

export type LadderScope = 'global' | 'fandom' | 'following';
export const LADDER_SCOPES: readonly LadderScope[] = ['global', 'fandom', 'following'];
export const LADDER_LIMIT = 8;

/** Tier colour key: the six score tiers plus Legend (top 100 Masters). */
export type TierKey = TierId | 'legend';

export interface TierDisplay {
  key: TierKey;
  /** "Gold I", "Master", "Legend". */
  label: string;
  /** "I" / "II" / "III" on the shield, null for Master and Legend. */
  numeral: string | null;
}

/** How a season score shows: its tier and division, or Legend for a top 100 Master. */
export function tierDisplay(score: number, legend = false): TierDisplay {
  const t = tierFor(score);
  if (legend && score >= MASTER_MIN) return { key: 'legend', label: 'Legend', numeral: null };
  return { key: t.tier, label: t.label, numeral: t.division };
}

/** The seven stops of the "Tiers" strip (15.4): six score tiers and Legend. */
export const TIER_STRIP: ReadonlyArray<{ key: TierKey; name: string; floor: string }> = [
  { key: 'bronze', name: 'Bronze', floor: '0' },
  { key: 'silver', name: 'Silver', floor: '4,000' },
  { key: 'gold', name: 'Gold', floor: '6,500' },
  { key: 'platinum', name: 'Platinum', floor: '8,500' },
  { key: 'diamond', name: 'Diamond', floor: '10,500' },
  { key: 'master', name: 'Master', floor: '12,000' },
  { key: 'legend', name: 'Legend', floor: 'Top 100' },
];

/** 1860 -> "1,860" (en-US grouping, like the rest of the site). */
export function comma(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 2140 -> "2.1s". */
export function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---- ladder -------------------------------------------------------------------

/** One ladder row as the API returns it: public profile fields only, never a user id. */
export interface LadderEntry {
  /** Global position on the season ladder. */
  position: number;
  /** Position inside the scope (Global = position). */
  scopePosition: number;
  seasonScore: number;
  tier: TierDisplay;
  avgAnswerMs: number | null;
  /** The asking player's own row. */
  me: boolean;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  accent: string | null;
  font: string | null;
  bias: string | null;
}

export interface LadderView {
  season: { id: number };
  scope: LadderScope;
  /** Top rows of the scope (at most LADDER_LIMIT). */
  rows: LadderEntry[];
  /** The asking player's row (null for guests and players still placing). */
  me: LadderEntry | null;
  /** Placed players in the scope. */
  total: number;
  /** Why the scope cannot be shown: a guest asked for a personal scope, or no main fandom is set. */
  needs: 'sign_in' | 'fandom' | null;
}

/** A row of public.ranked_ladder() (pending migration v11-p7-ranked.sql). */
export interface LadderDbRow {
  position: number | string;
  scope_position: number | string;
  scope_total: number | string;
  season_score: number;
  avg_answer_ms: number | null;
  runs_total: number;
  is_me: boolean | null;
  legend: boolean | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

export function ladderEntryFrom(row: LadderDbRow): LadderEntry {
  return {
    position: Number(row.position),
    scopePosition: Number(row.scope_position),
    seasonScore: row.season_score,
    tier: tierDisplay(row.season_score, row.legend === true),
    avgAnswerMs: row.avg_answer_ms,
    me: row.is_me === true,
    name: row.display_name || row.username || 'Anonymous',
    username: row.username,
    avatarUrl: row.avatar_url,
    accent: row.name_accent,
    font: row.name_font,
    bias: row.bias,
  };
}

/** Split ranked_ladder() rows into the top of the scope and the asking player's row. */
export function ladderViewFrom(season: number, scope: LadderScope, rows: readonly LadderDbRow[], limit = LADDER_LIMIT): LadderView {
  const entries = rows.map(ladderEntryFrom).sort((a, b) => a.scopePosition - b.scopePosition);
  return {
    season: { id: season },
    scope,
    rows: entries.filter((e) => e.scopePosition <= limit),
    me: entries.find((e) => e.me) ?? null,
    total: rows.length ? Number(rows[0]!.scope_total) : 0,
    needs: null,
  };
}

/** "· Master · average 1.4s" (the sub line of a ladder row). */
export function ladderSub(e: Pick<LadderEntry, 'tier' | 'avgAnswerMs'>): string {
  return e.avgAnswerMs === null ? e.tier.label : `${e.tier.label} · average ${secs(e.avgAnswerMs)}`;
}

// ---- season card ------------------------------------------------------------------

export type CardState =
  | { kind: 'loading' }
  | { kind: 'not_live' }
  | { kind: 'error' }
  | { kind: 'guest'; season: SeasonCard['season'] }
  | { kind: 'placing'; season: SeasonCard['season']; me: NonNullable<SeasonCard['me']> }
  | { kind: 'placed'; season: SeasonCard['season']; me: NonNullable<SeasonCard['me']> };

export function cardState(card: SeasonCard | null, status: 'loading' | 'not_live' | 'error' | 'live'): CardState {
  if (status !== 'live' || !card) return { kind: status === 'live' ? 'loading' : status };
  if (!card.signedIn || !card.me) return { kind: 'guest', season: card.season };
  return card.me.placement.complete ? { kind: 'placed', season: card.season, me: card.me } : { kind: 'placing', season: card.season, me: card.me };
}

/** "Season 3 · ends in 19 days" (the last day reads "ends today"). */
export function seasonLine(season: SeasonCard['season']): string {
  const d = season.daysLeft;
  return `Season ${season.id} · ${d <= 0 ? 'ends today' : d === 1 ? 'ends in 1 day' : `ends in ${d} days`}`;
}

/**
 * The progress bar under the card: how far the score is between the start of its
 * current step (division) and the next one. Master has no next step: full bar.
 */
export function stepProgress(score: number): number {
  const next = nextStep(score);
  if (!next) return 1;
  const steps = tierSteps();
  let from = 0;
  for (const s of steps) if (s.at <= score) from = s.at;
  const span = next.at - from;
  return span > 0 ? Math.min(1, Math.max(0, (score - from) / span)) : 0;
}

/** "12 of 15 runs left today" / "No ranked runs left today". */
export function runsLeftLine(runsLeft: number): string {
  if (runsLeft <= 0) return 'No ranked runs left today';
  return `${runsLeft} of ${DAILY_RUN_LIMIT} runs left today`;
}

/** Placement copy: "3 / 5 placed", "2 placement runs to go". */
export function placementLines(done: number): { title: string; toGo: string } {
  const left = Math.max(0, PLACEMENT_RUNS - done);
  return {
    title: `${Math.min(done, PLACEMENT_RUNS)} / ${PLACEMENT_RUNS} placed`,
    toGo: left === 1 ? '1 placement run to go' : `${left} placement runs to go`,
  };
}

/** The "Your best 5 runs" strip: the counted runs, the lowest flagged once there are 5. */
export function bestStrip(best: ReadonlyArray<{ id: string; points: number }>): Array<{ id: string; points: number; lowest: boolean }> {
  return best.map((r, i) => ({ id: r.id, points: r.points, lowest: best.length >= BEST_RUNS && i === best.length - 1 }));
}

// ---- season impact (results slot) -------------------------------------------------

export interface ImpactView {
  before: TierDisplay;
  after: TierDisplay;
  /** Show "before -> after" chips (a promotion), or only the current tier. */
  moved: boolean;
  /** Sentence parts: plain text and the bold season score. */
  lead: string;
  score: string;
  tail: string;
  /** "You move from #412 to #398 on the ladder." when the position improved. */
  ladder: string | null;
}

/**
 * The "Season impact" block under a ranked result (15.4, prototype btend-ranked):
 * the tier before and after, and one sentence on what the run did.
 */
export function impactView(impact: SeasonImpact, ladder: { before: number | null; after: number | null }): ImpactView {
  const before = tierDisplay(impact.before.score);
  const after = tierDisplay(impact.after.score);
  const moved = impact.promoted;
  const score = comma(impact.after.score);
  let lead: string;
  let tail: string;
  if (!impact.placement.complete) {
    lead = `Placement run ${impact.placement.done} of ${impact.placement.of}. Season score `;
    tail = '.';
  } else if (!impact.counted) {
    lead = `This run did not beat your lowest best run (${comma(impact.toBeat ?? 0)}). Your season score stays `;
    tail = '.';
  } else if (impact.replaced) {
    lead = `This run replaces your lowest best run (${comma(impact.replaced.points)}). Season score `;
    tail = moved ? `, and you reach ${after.label}.` : '.';
  } else {
    // the fifth run: placement just completed
    lead = 'Placement complete. Season score ';
    tail = `, you start in ${after.label}.`;
  }
  const ladderLine = ladder.before !== null && ladder.after !== null && ladder.after < ladder.before
    ? `You move from #${comma(ladder.before)} to #${comma(ladder.after)} on the ladder.`
    : ladder.before === null && ladder.after !== null
      ? `You are #${comma(ladder.after)} on the ladder.`
      : null;
  return { before, after, moved, lead, score, tail, ladder: ladderLine };
}
