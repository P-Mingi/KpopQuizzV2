// Run O1, lot H2b: Crossover, the one dark block (Plan.dc.html, section 3.D): 3 picks that cross K-pop and anime, and one fact that links
// the two worlds, drawn from the editorial list (crossover-list.ts) and changed every week (ISO week of the UTC date).
// A pick is shown only while its quiz is published; a fact only while its trivia row is published. Fewer than 3 resolve: fewer are shown.

import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { CROSSOVER_ENTRIES, CROSSOVER_FACTS } from './crossover-list';
import { hubCached } from './cache';
import { isListable, must, QUIZ_SELECT, resolveOrigins, siteName, toCard } from './util';
import { sourceName } from './did-you-know';

import type { Db } from './catalog';
import type { CrossoverEntry, CrossoverFactEntry } from './crossover-list';
import type { QuizRow } from './util';
import type { HubCrossover, HubCrossoverQuiz, HubOpts, HubOrigins, HubSite } from './types';

export const CROSSOVER_SHOWN = 3;

/** ISO 8601 week of a UTC date: `2026-W43`. */
export function isoWeek(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** The week number as an integer counter (monotonic across years), the rotation key. */
export function weekIndex(now: Date): number {
  return Math.floor((Math.floor(now.getTime() / 86_400_000) + 3) / 7);
}

/** `count` items starting at the week's offset, wrapping: the list turns by `count` places a week. */
export function rotate<T>(items: readonly T[], count: number, week: number): T[] {
  if (items.length <= count) return [...items];
  const start = (week * count) % items.length;
  return Array.from({ length: count }, (_, i) => items[(start + i) % items.length]!);
}

export interface CrossoverReads {
  readonly quizzes: (site: HubSite, slugs: readonly string[]) => Promise<QuizRow[]>;
  readonly facts: (site: HubSite, texts: readonly string[]) => Promise<Array<{ fact: string; source: string | null; source_url: string | null }>>;
}

export async function readCrossover(origins: HubOrigins, now: Date, reads: CrossoverReads): Promise<HubCrossover | null> {
  const week = weekIndex(now);
  // Resolve every entry first, so a dropped quiz is replaced by the next one of the list instead of leaving a hole.
  const quizSlugs = (site: HubSite): string[] => CROSSOVER_ENTRIES.flatMap((e) => (e.kind === 'quiz' && e.site === site ? [e.slug] : []));
  const rowsBySlug = new Map<string, QuizRow>();
  for (const site of ['kpop', 'anime'] as HubSite[]) {
    const slugs = quizSlugs(site);
    if (slugs.length === 0) continue;
    for (const r of await reads.quizzes(site, slugs)) if (isListable(r)) rowsBySlug.set(`${r.site_id}/${r.slug}`, r);
  }
  const resolved: HubCrossoverQuiz[] = [];
  for (const e of CROSSOVER_ENTRIES as readonly CrossoverEntry[]) {
    if (e.kind === 'page') {
      resolved.push({ site: e.site, siteName: siteName(e.site), title: e.title, href: `${origins[e.site]}${e.path}`, tile: e.tile, meta: e.meta, line: e.line });
      continue;
    }
    const row = rowsBySlug.get(`${e.site}/${e.slug}`);
    if (!row) continue;
    const c = toCard(row, origins, now);
    resolved.push({ site: e.site, siteName: c.siteName, title: c.title, href: c.href, tile: c.tile, meta: c.meta, line: e.line });
  }
  const quizzes = rotate(resolved, CROSSOVER_SHOWN, week);

  const bySource = new Map<string, { fact: string; source: string | null; source_url: string | null }>();
  for (const site of ['kpop', 'anime'] as HubSite[]) {
    const texts = CROSSOVER_FACTS.filter((f) => f.site === site).map((f) => f.basedOn);
    if (texts.length === 0) continue;
    for (const r of await reads.facts(site, texts)) bySource.set(r.fact, r);
  }
  const facts: Array<{ entry: CrossoverFactEntry; source: string; url: string }> = [];
  for (const entry of CROSSOVER_FACTS) {
    const row = bySource.get(entry.basedOn);
    const url = row?.source_url?.trim();
    if (row && row.source && url) facts.push({ entry, source: sourceName(row.source), url });
  }
  const pick = rotate(facts, 1, week)[0];
  if (quizzes.length === 0 && !pick) return null;
  return { quizzes, fact: pick ? { text: pick.entry.text, source: pick.source, sourceUrl: pick.url } : null, week: isoWeek(now) };
}

export function dbCrossoverReads(db: Db): CrossoverReads {
  return {
    quizzes: async (site, slugs) =>
      must<QuizRow[]>(await forSite(db.from('quizzes').select(QUIZ_SELECT), site).eq('status', 'published').in('slug', [...slugs]), 'crossover quizzes'),
    facts: async (site, texts) =>
      must<Array<{ fact: string; source: string | null; source_url: string | null }>>(
        await forSite(db.from('trivia').select('fact, source, source_url'), site).eq('status', 'published').in('fact', [...texts]),
        'crossover facts',
      ),
  };
}

const cached = hubCached('crossover', (origins: HubOrigins) => readCrossover(origins, new Date(), dbCrossoverReads(createPublicReadClient())));

/** The Crossover block of the week, cached one hour (tag hub:crossover). */
export async function getCrossover(opts?: HubOpts): Promise<HubCrossover | null> {
  return cached(resolveOrigins(opts));
}
