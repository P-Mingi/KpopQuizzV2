// P10 passport view model (DESIGN-SPEC 16.7 passport, 17.8). Pure functions only:
// the pages (/me, /u/[username]) read the real rows, this module shapes them for
// the v11 render, and the unit tests pin every rule. No I/O here.

import { badgeRarity, RARITY_ORDER } from '@/lib/badges';
import { isValidTheme, PASSPORT_THEMES } from '@/lib/passport-themes';
import { MASTERY } from '@/lib/passport';

import type { Rarity } from '@/lib/badges';

// ---- theme ----------------------------------------------------------------

/** Band tint per passport theme (the prototype's THEMES table, third column). The
 *  band behind the group photo is this tint in BOTH themes (the prototype sets it
 *  on :root; the dark reference shows the same light tint). */
export const THEME_BAND: Record<string, string> = {
  default: '#FCE8EF',
  purple: '#EEEDFE',
  blue: '#E6F1FB',
  teal: '#E1F5EE',
  amber: '#FCF0DC',
  coral: '#FBE4D8',
};

export function themeKey(theme: string | null | undefined): string {
  return theme && isValidTheme(theme) ? theme : 'default';
}

/** Band tint + XP bar colour for a stored profiles.profile_theme. */
export function themeColours(theme: string | null | undefined): { band: string; bar: string } {
  const k = themeKey(theme);
  return { band: THEME_BAND[k] ?? '#FCE8EF', bar: PASSPORT_THEMES[k]?.swatch ?? '#E8457A' };
}

// ---- band -----------------------------------------------------------------

export type BandMode = 'image' | 'group' | 'flat';

/** Band source (17.8): the fan's header image, else their main group photo blurred
 *  over the theme tint, else the flat tint. */
export function bandMode(headerUrl: string | null | undefined, groupPhoto: string | null | undefined): BandMode {
  if (headerUrl && /^https:\/\//i.test(headerUrl)) return 'image';
  if (groupPhoto) return 'group';
  return 'flat';
}

// ---- identity line ----------------------------------------------------------

export function levelChip(level: number, title: string): string {
  return `Lv ${level} · ${title}`;
}

const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "STAY since 2019 · joined March 2025 · 24 followers" (prototype pmeta). Every
 *  part is real and optional except the join date. */
export function metaLine(args: { fandomName?: string | null; stanSince?: number | null; createdAt: string; followers: number }): string {
  const parts: string[] = [];
  if (args.stanSince) parts.push(`${args.fandomName?.trim() || 'Stan'} since ${args.stanSince}`);
  const d = new Date(args.createdAt);
  if (!Number.isNaN(d.getTime())) parts.push(`joined ${MONTH_FMT.format(d)}`);
  parts.push(`${args.followers.toLocaleString('en-US')} ${args.followers === 1 ? 'follower' : 'followers'}`);
  return parts.join(' · ');
}

/** "1,280 / 2,000 XP to Lv 8" (total XP / total XP needed for the next level, as
 *  the live passport shows it); the bar is lib/constants getLevelInfo().progress,
 *  the share of the current level already done. */
export function xpLine(xp: number, nextReq: number | null, level: number, progress: number): { have: string; rest: string; pct: number } {
  return {
    have: Math.max(0, xp).toLocaleString('en-US'),
    rest: nextReq !== null ? ` / ${nextReq.toLocaleString('en-US')} XP to Lv ${level + 1}` : ' XP',
    pct: Math.min(100, Math.max(0, progress)),
  };
}

// ---- stats ------------------------------------------------------------------

export interface StatCell { value: string; label: string }

export function countLabel(n: number): string {
  return n.toLocaleString('en-US');
}

export function streakLabel(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Owner stats (prototype: quizzes played, average score, streak, quizzes made,
 *  blindtest rank). "blindtest rank" has no live source (bt_players is never
 *  written, WIRING-MAP), so the real blindtests-played counter takes its place. */
export function personalStats(s: { quizzesPlayed: number; averagePct: number | null; streak: number; quizzesMade: number; blindtestsPlayed: number }): StatCell[] {
  const out: StatCell[] = [{ value: countLabel(s.quizzesPlayed), label: 'quizzes played' }];
  if (s.averagePct !== null) out.push({ value: `${s.averagePct}%`, label: 'average score' });
  out.push({ value: streakLabel(s.streak), label: 'streak' });
  out.push({ value: countLabel(s.quizzesMade), label: 'quizzes made' });
  out.push({ value: countLabel(s.blindtestsPlayed), label: 'blindtests played' });
  return out;
}

/** Public stats: exactly what the public passport exposed before (streak,
 *  mastered, quizzes made, plays received). Privacy fail-closed: no play counts,
 *  no average. */
export function publicStats(s: { streak: number; groupsMastered: number; groupsTotal: number; quizzesMade: number; playsReceived: number }): StatCell[] {
  return [
    { value: streakLabel(s.streak), label: 'streak' },
    { value: `${s.groupsMastered} / ${s.groupsTotal}`, label: 'groups mastered' },
    { value: countLabel(s.quizzesMade), label: 'quizzes made' },
    { value: countLabel(s.playsReceived), label: 'plays received' },
  ];
}

/** Average score in percent over plays rows (score / total_questions), null when
 *  there is no scored play. */
export function averagePct(rows: Array<{ score: number | null; total_questions: number | null }>): number | null {
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    const t = r.total_questions ?? 0;
    if (t <= 0 || r.score === null || r.score === undefined) continue;
    sum += Math.min(1, Math.max(0, r.score / t));
    n += 1;
  }
  return n > 0 ? Math.round((sum / n) * 100) : null;
}

// ---- groups mastered ----------------------------------------------------------

/** Progress toward mastery in percent (MASTERY: 30+ plays at 80%+ accuracy). Both
 *  conditions count: plays share x accuracy share; 100 only when mastered. */
export function masteryPct(plays: number, accuracy: number, mastered: boolean): number {
  if (mastered) return 100;
  if (plays <= 0) return 0;
  const p = Math.min(1, plays / MASTERY.minPlays) * Math.min(1, accuracy / MASTERY.minAccuracy);
  return Math.min(99, Math.round(p * 100));
}

export interface MasteryRow { name: string; slug: string; pct: number }

export function topMastery(stats: Array<{ group_id: number; songs_played: number; accuracy: number; mastered: boolean }>, groups: Map<number, { name: string; slug: string }>, limit = 3): MasteryRow[] {
  return stats
    .filter((s) => s.songs_played > 0 && groups.has(s.group_id))
    .map((s) => ({ name: groups.get(s.group_id)!.name, slug: groups.get(s.group_id)!.slug, pct: masteryPct(s.songs_played, s.accuracy, s.mastered), plays: s.songs_played }))
    .sort((a, b) => b.pct - a.pct || b.plays - a.plays || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name, slug, pct }) => ({ name, slug, pct }));
}

// ---- badges -------------------------------------------------------------------

export interface BadgeDef { id: string; name: string; description: string; sort_order?: number | null }
export interface BadgeTile { id: string; name: string; description: string; rarity: Rarity; earned: boolean }

/** Every badge from badge_definitions (their order), earned first then locked,
 *  rarity from lib/badges badgeRarity(). */
export function badgeTiles(defs: BadgeDef[], earnedIds: Iterable<string>): BadgeTile[] {
  const earned = new Set(earnedIds);
  const tiles = defs.map((d) => ({ id: d.id, name: d.name, description: d.description ?? '', rarity: badgeRarity(d.id), earned: earned.has(d.id) }));
  return [...tiles.filter((t) => t.earned), ...tiles.filter((t) => !t.earned)];
}

/** Overview "Pinned badges": the pinned one first, then the other earned ones, max 6. */
export function pinnedTiles(tiles: BadgeTile[], pinnedId: string | null | undefined, max = 6): BadgeTile[] {
  const earned = tiles.filter((t) => t.earned);
  const pin = pinnedId ? earned.find((t) => t.id === pinnedId) : undefined;
  return [...(pin ? [pin] : []), ...earned.filter((t) => t !== pin)].slice(0, max);
}

export function earnedLine(tiles: BadgeTile[]): string {
  const n = tiles.filter((t) => t.earned).length;
  return `${n} of ${tiles.length} earned · colour and shape show rarity`;
}

export { RARITY_ORDER };

// ---- history ------------------------------------------------------------------

/** "6 hours ago", "yesterday", "2 days ago", "3 weeks ago" (UTC based, deterministic
 *  for a given `now`). */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  const w = Math.round(d / 7);
  if (d < 60) return `${w} weeks ago`;
  const mo = Math.round(d / 30);
  if (d < 365) return `${mo} months ago`;
  const y = Math.round(d / 365);
  return `${y} ${y === 1 ? 'year' : 'years'} ago`;
}

export interface HistoryRow {
  kind: 'quiz' | 'blindtest';
  title: string;
  href: string | null;
  /** group slug for the thumbnail photo (quiz rows) */
  groupSlug: string | null;
  score: number;
  total: number;
  at: string;
}

/** "2/8 · 6 hours ago", "10/10 · perfect · 2 days ago". */
export function historyLine(r: HistoryRow, now?: number): string {
  const parts = [`${r.score}/${r.total}`];
  if (r.total > 0 && r.score >= r.total) parts.push('perfect');
  parts.push(timeAgo(r.at, now));
  return parts.filter(Boolean).join(' · ');
}

/** Quiz rows in the Quizzes tab: "Published · 1.4k plays · 37 likes". */
export function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function quizLine(q: { play_count: number; like_count?: number | null }): string {
  const parts = ['Published', `${compact(q.play_count)} ${q.play_count === 1 ? 'play' : 'plays'}`];
  if (typeof q.like_count === 'number') parts.push(`${compact(q.like_count)} ${q.like_count === 1 ? 'like' : 'likes'}`);
  return parts.join(' · ');
}

/** Rarity order index (legend + sorting helpers). */
export function rarityIndex(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}
