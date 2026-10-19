// Run O1, lot (b), lane LB: the frozen series fixtures (docs/o1/contracts/fixtures/series/*.json) as the loader's
// SeriesHub, and a fake supabase client for the loader. Used by the unit tests next to the code; nothing else imports it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Group } from '@/lib/db/types';
import type { SeriesDb, SeriesHub, SeriesQuizRow } from './series';
import type { ArcRow, CharacterRow, SeriesRow, SeriesThemeRow } from './types';

export const FIXTURE_SLUGS = ['death-note', 'one-piece', 'spy-x-family'] as const;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const DIR = path.join(ROOT, 'docs/o1/contracts/fixtures/series');

export interface FixtureQuestion { question?: string; options?: string[]; spoiler?: { arc: number; scope: 'anime' | 'manga' | 'both' }; fun_fact?: string }
export interface FixtureQuiz {
  slug: string; title: string; quiz_type: string; difficulty: string;
  expected_level: { arc_ord: number; scope: 'anime' | 'manga' | 'both' | null };
  questions: FixtureQuestion[];
}
interface Fixture {
  group: { slug: string; name: string; display_color: string; text_color: string };
  series: Record<string, unknown>;
  arcs: Array<Record<string, unknown>>;
  characters: Array<Record<string, unknown>>;
  themes: Array<Record<string, unknown>>;
  quizzes: FixtureQuiz[];
}

export function readFixture(slug: string): Fixture {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), 'utf8')) as Fixture;
}

/** A fixture as a SeriesHub: ids are assigned, columns the fixture leaves out take their defaults. */
export function hubFromFixture(slug: string, over: { airing?: unknown; playableThemes?: number; trivia?: number; picks?: Record<number, number> } = {}): SeriesHub {
  const f = readFixture(slug);
  const gid = 100 + FIXTURE_SLUGS.indexOf(slug as (typeof FIXTURE_SLUGS)[number]);
  const group = {
    id: gid, name: f.group.name, slug: f.group.slug, fandom_name: '', display_color: f.group.display_color, text_color: f.group.text_color,
    logo_url: null, quiz_count: f.quizzes.length, total_plays: 0, seo_intro: null, is_custom: false, needs_review: false,
    created_by_user: false, created_at: '2026-10-01T00:00:00Z',
  } as Group;
  const series = {
    group_id: gid, aliases: [], studios: [], authors: [], director: null, magazine: null, publisher: null,
    anime_start_year: null, anime_end_year: null, manga_start_year: null, manga_end_year: null, episodes: null, seasons: null,
    volumes: null, chapters: null, chapters_approx: false, official_url: null, airing: over.airing ?? null, wikidata_qid: null, tier: null,
    title_native: null, title_romaji: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
    ...f.series,
  } as unknown as SeriesRow;
  const arcs = f.arcs.map((a, i) => ({
    id: i + 1, group_id: gid, parent_id: null, episode_from: null, episode_to: null, chapter_from: null, chapter_to: null,
    volume_from: null, volume_to: null, manga_only: false, anime_only: false, source_url: null, ...a,
  })) as unknown as ArcRow[];
  const characters = f.characters.map((c, i) => ({
    id: 1000 + gid * 10 + i, group_id: gid, name_native: null, aliases: [], affiliation: null, wikidata_qid: null,
    created_at: '2026-10-01T00:00:00Z', ...c,
  })) as unknown as CharacterRow[];
  const themes = f.themes.map((th, i) => ({
    id: 2000 + gid * 10 + i, group_id: gid, season: null, deezer_playable: i < (over.playableThemes ?? 0), ...th,
  })) as unknown as SeriesThemeRow[];
  const quizzes: SeriesQuizRow[] = f.quizzes.map((q, i) => ({
    slug: q.slug, title: q.title, quiz_type: q.quiz_type, difficulty: q.difficulty, play_count: 100 - i, like_count: 0,
    total_score_sum: 0, total_completions: 0, question_count: q.questions.length, created_at: '2026-10-02T00:00:00Z',
    spoiler_arc_ord: q.expected_level.arc_ord === 0 ? null : q.expected_level.arc_ord, spoiler_scope: q.expected_level.scope,
  }));
  const trivia = Array.from({ length: over.trivia ?? 0 }, (_, i) => ({
    fact: `${f.group.name} fact number ${i + 1} is stored with its source.`, category: (['history', 'members', 'music', 'achievements', 'fun'] as const)[i % 5]!,
    source: 'Wikipedia', source_url: 'https://en.wikipedia.org/wiki/Special:Search',
  }));
  return { group, series, arcs, characters, themes, trivia, sources: [], quizzes, oshiCounts: over.picks ?? {} };
}

type Table = { data?: unknown; error?: { message: string } | null };

/** A supabase-like client over fixed tables; a table with `error` fails like a missing table does. */
export function fakeDb(tables: Record<string, Table>): SeriesDb & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    from(table: string) {
      calls.push(table);
      const res: Table = tables[table] ?? { data: [], error: null };
      const rows = (): unknown[] => (Array.isArray(res.data) ? res.data : res.data == null ? [] : [res.data]);
      const out = (data: unknown): Promise<{ data: unknown; error: { message: string } | null }> => Promise.resolve({ data, error: res.error ?? null });
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gt', 'lte', 'order', 'limit']) chain[m] = () => chain;
      chain.maybeSingle = () => out(res.error ? null : rows()[0] ?? null);
      chain.range = (from: number, to: number) => out(res.error ? null : rows().slice(from, to + 1));
      chain.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => out(res.error ? null : res.data ?? null).then(ok, bad);
      return chain;
    },
  } as SeriesDb & { calls: string[] };
}

/** The tables of a fixture hub, as the database would answer the loader. */
export function tablesOf(hub: SeriesHub): Record<string, Table> {
  return {
    groups: { data: hub.group },
    series: { data: hub.series },
    arcs: { data: hub.arcs },
    characters: { data: hub.characters },
    series_themes: { data: hub.themes },
    trivia: { data: hub.trivia },
    entity_sources: { data: hub.sources },
    favourite_character_counts: { data: Object.entries(hub.oshiCounts).map(([character_id, picks]) => ({ character_id: Number(character_id), picks })) },
    quizzes: { data: hub.quizzes },
  };
}
