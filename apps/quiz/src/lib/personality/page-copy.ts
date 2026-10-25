// SEO Mission 2, part D: the words of a Which member are you page that carry a number or a
// fact (the answer block, the meta description, the members sentence, the most common
// result), as pure functions so every rule is unit tested. Every number comes from the
// caller: the real saved results (get_personality_counts) with the date they were read,
// the stored questions, or the sourced line-up (rosters.ts). Nothing is typed by hand.

import { buildDistribution } from './view';

import type { Roster } from './rosters';

/** "Most common result" needs this many saved results (rulebook section 4.3: distributions). */
export const MOST_COMMON_MIN = 100;

/**
 * Words a member page never uses (rulebook section 6.1 and the mission: no heights,
 * weights, relationships, "compatibility" or "soulmate" framing, no birth dates).
 */
export const FORBIDDEN_WORDS = /\b(heights?|tall(?:er|est)?|weights?|weighs?|kg|cm|lbs?|dating|girlfriends?|boyfriends?|relationships?|married|compatib\w*|soulmates?|born|birthdays?|birth\s*dates?)\b/gi;

/** The forbidden words found in a text, lowercased, once each. */
export function forbiddenIn(text: string): string[] {
  return [...new Set((text.match(FORBIDDEN_WORDS) ?? []).map((w) => w.toLowerCase()))];
}

/** "October 15, 2026" for an ISO date or date-time, read in UTC. */
export function formatDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export interface SavedResults {
  /** Saved results of the current members, exact. */
  total: number;
  /** When the counts were read (ISO date-time). */
  asOf: string;
}

/**
 * The 40 to 60 word answer block under the H1 (server HTML): what the quiz is and how the
 * result is found, then the real number of saved results with its date when there is one.
 */
export function answerBlock(groupName: string, questionCount: number, saved: SavedResults | null): string {
  const base = `This ${groupName} personality quiz asks ${questionCount} questions about you, then matches you with the ${groupName} member whose quiz profile is closest to your answers. There are no right answers and no timer, and it takes about two minutes. It is free and needs no account.`;
  if (!saved || saved.total <= 0 || !formatDay(saved.asOf)) return base;
  const n = saved.total.toLocaleString('en-US');
  return `${base} As of ${formatDay(saved.asOf)}, fans have saved ${n} ${saved.total === 1 ? 'result' : 'results'}.`;
}

/** The meta description: the primary phrase once, 120 to 160 characters for every page. */
export function metaDescription(groupName: string, questionCount: number): string {
  return `Which ${groupName} member are you? Answer ${questionCount} questions about yourself and get the ${groupName} member whose quiz profile is closest. Free, no timer.`;
}

/** The first sentence of "The <group> members": the count only when both sources agree on it. */
export function membersSentence(groupName: string, roster: Roster): string {
  const names = joinNames(roster.members.map((m) => m.name));
  return roster.countAgreed
    ? `${groupName} has ${roster.members.length} members: ${names}.`
    : `The current ${groupName} members named by both Wikipedia and Wikidata are ${names}.`;
}

export interface MostCommon {
  total: number;
  asOf: string;
  /** The top results, at most three, biggest first, each a whole percent above zero. */
  top: Array<{ name: string; pct: number }>;
  /** How many of `top` share the biggest count (1 = a single most common result). */
  leaders: number;
}

/**
 * The most common results among the saved ones, or null: under MOST_COMMON_MIN results,
 * when the counts could not be read, or for a group with a member under 18 (no
 * per-member stats, rulebook section 6.2). Only the top three: a share is never printed
 * to single out the member fans get least (SYSTEM.md 5.1).
 */
export function mostCommon(
  counts: Readonly<Record<string, number>> | null,
  outcomes: ReadonlyArray<{ name: string }>,
  asOf: string | null,
  minors: boolean,
  min: number = MOST_COMMON_MIN,
): MostCommon | null {
  if (minors || !asOf) return null;
  const d = buildDistribution(counts, outcomes.map((o) => ({ id: o.name, label: o.name, key: o.name })), min);
  if (!d) return null;
  const rows = d.rows
    .map((r) => ({ name: r.label, pct: r.pct }))
    .filter((r) => r.pct > 0)
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, 'en'));
  if (rows.length === 0) return null;
  const leaders = rows.filter((r) => r.pct === rows[0]!.pct).length;
  // Three rows, or every result tied for first when more than three are (naming three of
  // four equal results "the most common" would not be true).
  const top = rows.slice(0, Math.max(3, leaders)).map((r) => ({ name: r.name, pct: Math.round(r.pct) })).filter((r) => r.pct > 0);
  return top.length > 0 ? { total: d.total, asOf, top, leaders: Math.min(leaders, top.length) } : null;
}

/** The sentences of "Most common result": the answer first, with n and the date. */
export function mostCommonText(groupName: string, mc: MostCommon): string[] {
  const n = mc.total.toLocaleString('en-US');
  const day = formatDay(mc.asOf);
  const lead = mc.top.slice(0, mc.leaders);
  const rest = mc.top.slice(mc.leaders);
  const first = lead.length === 1
    ? `${lead[0]!.name} is the most common result of this ${groupName} quiz: ${lead[0]!.pct}% of the ${n} results saved up to ${day}.`
    : `${joinNames(lead.map((r) => r.name))} are the most common results of this ${groupName} quiz, with ${lead[0]!.pct}% each of the ${n} results saved up to ${day}.`;
  const out = [first];
  if (rest.length > 0) out.push(`Next ${rest.length === 1 ? 'comes' : 'come'} ${joinNames(rest.map((r) => `${r.name} (${r.pct}%)`))}.`);
  out.push('A share describes how fans answered the quiz. It says nothing about the members themselves.');
  return out;
}
