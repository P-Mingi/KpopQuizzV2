// SEO Mission 2, part B (owner, 2026-10-14): the strengthened group hub. A group listed here
// gets the extra sections (pick by level, by topic, guess the song, newest, "in 30 seconds",
// how fans score), its own H1 and subtitle, a "Start the {Group} quiz" button and the
// MusicGroup entity in its JSON-LD. Every other hub renders exactly as before: hub.tsx asks
// hubPlus(slug) and falls through to today's tree on null.

import { BTS_FACTS } from './facts/bts';
import { wikidataGroup } from '@/lib/seo/wikidata';

import type { FactSource, HubFacts, ResolvedSource } from './facts/types';

export interface HubPlus {
  slug: string;
  /** The H1, word for word (rulebook 2.1: the primary phrase of the title and description). */
  h1: string;
  /** The visible line under the H1. */
  subtitle: string;
  /** The label of the top button. */
  startLabel: string;
  /**
   * The flagship quiz, in order of preference: the first one that is published wins, else the
   * group's most played quiz. The Team "ARMY level test" leads once the owner publishes it.
   */
  flagshipSlugs: string[];
  /** What the quizzes cover, for the answer block ("from easy member questions to ..."). */
  scope: string;
  facts: HubFacts;
}

const HUB_PLUS: Record<string, HubPlus> = {
  bts: {
    slug: 'bts',
    h1: 'BTS quiz',
    subtitle: 'How well do you know BTS?',
    startLabel: 'Start the BTS quiz',
    flagshipSlugs: ['bts-army-level-test'],
    scope: 'from easy member questions to hard era deep cuts',
    facts: BTS_FACTS,
  },
};

export interface HubPlusAnswerInput {
  name: string;
  scope: string;
  /** Published quizzes of the group (the hub's own fail-closed count). */
  published: number;
  /** The pooled average (hub-scores.ts), null under its floor. */
  pooledAvg: number | null;
  attempts: number;
  /** Playable blind test songs of the group (the hub's own read). */
  songs: number;
  /** "October 2026": when the numbers were read. */
  asOfMonth: string | null;
}

/**
 * The answer block under the H1 (rulebook 3.1: 40 to 60 words in the server HTML, one number
 * with its date and denominator). Every number comes from the hub's own reads; a number under
 * its floor is left out with its sentence, never estimated.
 */
export function hubPlusAnswer(i: HubPlusAnswerInput): string {
  const n = Math.max(0, Math.floor(i.published));
  const parts = [`This ${i.name} quiz hub gathers ${n} free ${i.name} ${n === 1 ? 'quiz' : 'quizzes'} made by fans, ${i.scope}.`];
  if (i.pooledAvg !== null && i.asOfMonth) {
    parts.push(`Across ${i.attempts.toLocaleString('en-US')} scored attempts, fans average ${i.pooledAvg}% (as of ${i.asOfMonth}).`);
  }
  parts.push(i.songs > 0
    ? `Pick a quiz by its measured difficulty below, or name ${i.songs.toLocaleString('en-US')} ${i.name} songs in the blind test.`
    : 'Pick a quiz by its measured difficulty below.');
  return parts.join(' ');
}

export function hubPlus(slug: string): HubPlus | null {
  return HUB_PLUS[slug] ?? null;
}

/** The flagship slug among the published ones, else the fallback (the most played quiz). */
export function flagshipSlug(plus: HubPlus, published: ReadonlySet<string>, fallback: string | null): string | null {
  return plus.flagshipSlugs.find((s) => published.has(s)) ?? fallback;
}

/** A source with its link, or null when it cannot be resolved (a Wikidata source of a group
 *  with no fetched item): an unresolved source is never shown as a dead link. */
export function resolveSource(slug: string, s: FactSource): ResolvedSource | null {
  if (s.kind === 'wikidata') {
    const g = wikidataGroup(slug);
    return g ? { label: s.label, url: `${g.wikidata}#${s.property}`, kind: 'wikidata' } : null;
  }
  return { label: s.label, url: s.url, kind: s.kind };
}

const STRONG: ReadonlySet<ResolvedSource['kind']> = new Set(['official', 'wikidata']);

/**
 * The rows that may render (rulebook 5.4 and 5.5): verified, every source resolved, and for a
 * load-bearing row two sources of which one is official or Wikidata.
 */
export function renderableRows(facts: HubFacts): Array<{ key: string; label: string; value: string; sources: ResolvedSource[] }> {
  const out: Array<{ key: string; label: string; value: string; sources: ResolvedSource[] }> = [];
  for (const r of facts.rows) {
    if (r.status !== 'verified') continue;
    const sources = r.sources.map((s) => resolveSource(facts.slug, s)).filter((s): s is ResolvedSource => s !== null);
    if (sources.length !== r.sources.length) continue;
    if (r.loadBearing && (sources.length < 2 || !sources.some((s) => STRONG.has(s.kind)))) continue;
    out.push({ key: r.key, label: r.label, value: r.value, sources });
  }
  return out;
}

/** "3rd Gen" (groups.generation) as the page writes it: "3rd generation"; null when absent. */
export function generationLabel(raw: string | null | undefined): string | null {
  const m = /^\s*(\d+)(st|nd|rd|th)\s*gen(eration)?\s*$/i.exec(raw ?? '');
  return m ? `${m[1]}${m[2]!.toLowerCase()} generation` : null;
}
