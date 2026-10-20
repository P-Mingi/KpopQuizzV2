// Run O1, lot (e) part 2, lane E1a: the pure half of scripts/anime/k1/load-fixtures.mjs. It turns the frozen series
// fixtures (docs/o1/contracts/fixtures/series/*.json) into rows and into one idempotent SQL script. No I/O here: the
// script reads the files and runs the SQL through scripts/o1/env.sh and psql. Relative imports only, so the script
// can load this file through tsx. Nothing on a page imports it.
//
// Idempotence: every statement is an upsert on a natural key (groups.slug, series.group_id, arcs (group_id, ord),
// characters (group_id, slug), series_themes (group_id, kind, number), quizzes.slug), so a second run changes nothing.
// A quiz's level (spoiler_arc_ord, spoiler_scope) comes from computeSpoilerLevel over its questions, never from the
// file; a fixture whose expected_level disagrees is refused.

import { computeSpoilerLevel } from './spoilers/core';

import type { QuestionSpoiler } from './types';

/** The site every loaded row belongs to. */
export const FIXTURE_SITE = 'anime';
/** The username of the anime system account (fixtures/users.json). The loader looks it up; it never creates it. */
export const SYSTEM_USERNAME = 'otakuquiz_team';
/** The fallback group slug filled on the anime sites row when it is empty (registry.md, daily). */
export const FALLBACK_GROUP_SLUG = 'anime-mix';

export interface FixtureQuestion {
  readonly question: string;
  readonly spoiler?: QuestionSpoiler;
  readonly [key: string]: unknown;
}

export interface FixtureQuiz {
  readonly slug: string;
  readonly title: string;
  readonly account: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly questions: readonly FixtureQuestion[];
  readonly expected_level: { readonly arc_ord: number; readonly scope: 'anime' | 'manga' | 'both' | null };
}

export interface FixtureArc {
  readonly ord: number; readonly name: string; readonly kind: string;
  readonly manga_only?: boolean; readonly anime_only?: boolean; readonly source_url?: string; readonly status: string;
}

export interface FixtureCharacter {
  readonly slug: string; readonly name: string; readonly name_native?: string; readonly aliases?: readonly string[];
  readonly role: string; readonly debut_arc_ord: number; readonly debut_medium?: string; readonly description: string;
  readonly source_url?: string; readonly spoiler_level: number; readonly identity_spoiler?: boolean; readonly ord: number;
  readonly status: string;
}

export interface FixtureTheme {
  readonly kind: string; readonly number: number; readonly title: string; readonly artist: string; readonly season?: number;
  readonly idol_sung: boolean; readonly source_url?: string; readonly status: string;
}

export interface SeriesFixture {
  readonly group: { readonly slug: string; readonly name: string; readonly display_color: string; readonly text_color: string };
  readonly series: { readonly [key: string]: unknown; readonly type: string; readonly title_en: string; readonly status: string; readonly published: boolean };
  readonly arcs: readonly FixtureArc[];
  readonly characters: readonly FixtureCharacter[];
  readonly themes: readonly FixtureTheme[];
  readonly quizzes: readonly FixtureQuiz[];
}

/** A quiz row as written: the fixture quiz plus the computed level and the count. */
export interface QuizRow {
  readonly group_slug: string;
  readonly slug: string;
  readonly title: string;
  readonly account: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly questions: readonly FixtureQuestion[];
  readonly question_count: number;
  readonly spoiler_arc_ord: number;
  readonly spoiler_scope: 'anime' | 'manga' | 'both' | null;
}

export interface LoadPlan {
  readonly groups: readonly SeriesFixture['group'][];
  readonly series: readonly { readonly group_slug: string; readonly row: SeriesFixture['series'] }[];
  readonly arcs: readonly { readonly group_slug: string; readonly row: FixtureArc }[];
  readonly characters: readonly { readonly group_slug: string; readonly row: FixtureCharacter }[];
  readonly themes: readonly { readonly group_slug: string; readonly row: FixtureTheme }[];
  readonly quizzes: readonly QuizRow[];
}

export interface PlanCounts {
  readonly groups: number; readonly series: number; readonly arcs: number; readonly characters: number;
  readonly themes: number; readonly quizzes: number; readonly questions: number; readonly accounts: number;
}

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/** The level of one fixture quiz, from its questions and the manga-only arcs of its series; refused when it differs from expected_level. */
export function quizLevel(quiz: FixtureQuiz, arcs: readonly FixtureArc[]): { arcOrd: number; scope: 'anime' | 'manga' | 'both' | null } {
  const mangaOnly = new Set(arcs.filter((a) => a.manga_only === true).map((a) => a.ord));
  const level = computeSpoilerLevel(quiz.questions, mangaOnly);
  const want = quiz.expected_level;
  if (level.arcOrd !== want.arc_ord || (level.scope ?? null) !== (want.scope ?? null)) {
    throw new Error(`quiz ${quiz.slug}: computed level ${level.arcOrd}/${String(level.scope)} differs from expected_level ${want.arc_ord}/${String(want.scope)}`);
  }
  return { arcOrd: level.arcOrd, scope: level.scope };
}

/** Fixtures to rows. Throws on a bad slug, a duplicate, or a level that disagrees with its expected value. */
export function buildPlan(fixtures: readonly SeriesFixture[]): LoadPlan {
  const groups: SeriesFixture['group'][] = [];
  const series: { group_slug: string; row: SeriesFixture['series'] }[] = [];
  const arcs: { group_slug: string; row: FixtureArc }[] = [];
  const characters: { group_slug: string; row: FixtureCharacter }[] = [];
  const themes: { group_slug: string; row: FixtureTheme }[] = [];
  const quizzes: QuizRow[] = [];
  const seenGroups = new Set<string>();
  const seenQuizzes = new Set<string>();
  for (const f of fixtures) {
    const slug = f.group.slug;
    if (!SLUG_RE.test(slug)) throw new Error(`bad group slug ${slug}`);
    if (seenGroups.has(slug)) throw new Error(`duplicate group slug ${slug}`);
    seenGroups.add(slug);
    groups.push(f.group);
    series.push({ group_slug: slug, row: f.series });
    for (const row of f.arcs) arcs.push({ group_slug: slug, row });
    for (const row of f.characters) characters.push({ group_slug: slug, row });
    for (const row of f.themes) themes.push({ group_slug: slug, row });
    for (const q of f.quizzes) {
      if (seenQuizzes.has(q.slug)) throw new Error(`duplicate quiz slug ${q.slug}`);
      seenQuizzes.add(q.slug);
      const level = quizLevel(q, f.arcs);
      quizzes.push({
        group_slug: slug, slug: q.slug, title: q.title, account: q.account, quiz_type: q.quiz_type, difficulty: q.difficulty,
        questions: q.questions, question_count: q.questions.length, spoiler_arc_ord: level.arcOrd, spoiler_scope: level.scope,
      });
    }
  }
  return { groups, series, arcs, characters, themes, quizzes };
}

export function countPlan(plan: LoadPlan): PlanCounts {
  return {
    groups: plan.groups.length, series: plan.series.length, arcs: plan.arcs.length, characters: plan.characters.length,
    themes: plan.themes.length, quizzes: plan.quizzes.length,
    questions: plan.quizzes.reduce((n, q) => n + q.question_count, 0),
    accounts: new Set(plan.quizzes.map((q) => q.account)).size,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------------------------------------------

interface Raw { readonly raw: string }
type Cell = string | number | boolean | null | undefined | Raw;

const raw = (sql: string): Raw => ({ raw: sql });
const isRaw = (v: unknown): v is Raw => typeof v === 'object' && v !== null && 'raw' in v;

/** A SQL string literal ('' doubles a quote; standard_conforming_strings is on, so a backslash is plain). */
export function sqlText(s: string): string {
  if (s.includes('\u0000')) throw new Error('a NUL character cannot be loaded');
  return `'${s.replace(/'/g, "''")}'`;
}

function lit(v: Cell): string {
  if (v === null || v === undefined) return 'null';
  if (isRaw(v)) return v.raw;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('a non-finite number cannot be loaded');
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return sqlText(v);
}

const json = (v: unknown): Raw => raw(`${sqlText(JSON.stringify(v ?? null))}::jsonb`);
const textArray = (v: readonly string[] | undefined): Raw => (v && v.length > 0 ? raw(`array[${v.map(sqlText).join(', ')}]::text[]`) : raw("'{}'::text[]"));
const groupId = (slug: string): Raw => raw(`(select id from public.groups where slug = ${sqlText(slug)} and site_id = ${sqlText(FIXTURE_SITE)})`);
const userId = (username: string): Raw => raw(`(select id from public.profiles where username = ${sqlText(username)})`);

function upsert(table: string, cols: readonly string[], rows: readonly (readonly Cell[])[], conflict: readonly string[], guard?: string): string[] {
  const update = cols.filter((c) => !conflict.includes(c)).map((c) => `${c} = excluded.${c}`).join(', ');
  return rows.map((r) => {
    const where = guard ? ` where ${guard}` : '';
    return `insert into public.${table} (${cols.join(', ')}) values (${r.map(lit).join(', ')}) on conflict (${conflict.join(', ')}) do update set ${update}${where};`;
  });
}

/** The values of the series row, in the column order below. */
const SERIES_COLS = [
  'group_id', 'type', 'title_en', 'title_native', 'title_romaji', 'aliases', 'studios', 'director', 'authors', 'magazine', 'publisher',
  'anime_start_year', 'anime_end_year', 'manga_start_year', 'manga_end_year', 'status', 'episodes', 'seasons', 'volumes', 'chapters', 'tier', 'published',
] as const;

function seriesCells(slug: string, s: SeriesFixture['series']): Cell[] {
  const str = (k: string): string | null => (typeof s[k] === 'string' ? (s[k] as string) : null);
  const num = (k: string): number | null => (typeof s[k] === 'number' ? (s[k] as number) : null);
  return [
    groupId(slug), s.type, s.title_en, str('title_native'), str('title_romaji'), textArray(Array.isArray(s.aliases) ? (s.aliases as string[]) : []),
    json(Array.isArray(s.studios) ? s.studios : []), str('director'), json(Array.isArray(s.authors) ? s.authors : []), str('magazine'), str('publisher'),
    num('anime_start_year'), num('anime_end_year'), num('manga_start_year'), num('manga_end_year'), s.status, num('episodes'), num('seasons'),
    num('volumes'), num('chapters'), str('tier'), s.published === true,
  ];
}

/** The accounts the quizzes need, then the tables they and the series need: one failing message each, before any write. */
function preflight(plan: LoadPlan): string {
  const accounts = [...new Set(plan.quizzes.map((q) => q.account))].sort();
  const slugs = plan.groups.map((g) => sqlText(g.slug)).join(', ');
  return [
    'do $fx$',
    'begin',
    "  if to_regclass('public.series') is null or to_regclass('public.arcs') is null or to_regclass('public.characters') is null or to_regclass('public.series_themes') is null then",
    "    raise exception 'load-fixtures: the anime tables are missing (apply SQL 011 first)';",
    '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quizzes' and column_name = 'spoiler_arc_ord') then",
    "    raise exception 'load-fixtures: quizzes.spoiler_arc_ord is missing (apply SQL 011 first)';",
    '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sites' and column_name = 'system_user_id') then",
    "    raise exception 'load-fixtures: sites.system_user_id is missing (apply SQL 009 first)';",
    '  end if;',
    `  if not exists (select 1 from public.sites where id = ${sqlText(FIXTURE_SITE)}) then`,
    "    raise exception 'load-fixtures: the anime row of sites is missing (apply SQL 001 and the launch sites file first)';",
    '  end if;',
    `  if exists (select 1 from public.groups where slug in (${slugs}) and site_id <> ${sqlText(FIXTURE_SITE)}) then`,
    "    raise exception 'load-fixtures: a series slug is already a group of another site';",
    '  end if;',
    `  if exists (select 1 from (values ${accounts.map((a) => `(${sqlText(a)})`).join(', ')}) as a(u) where not exists (select 1 from public.profiles p where p.username = a.u)) then`,
    "    raise exception 'load-fixtures: a fixture account has no profile (run the owner fixtures command first)';",
    '  end if;',
    'end',
    '$fx$;',
  ].join('\n');
}

/** One transaction that loads the whole plan. Safe to run again: every statement is an upsert on its natural key. */
export function renderSql(plan: LoadPlan): string {
  const out: string[] = ['\\set ON_ERROR_STOP on', 'begin;', 'set local client_min_messages = warning;', preflight(plan)];

  // The anime sites row: values only where empty (the system account is looked up, never created).
  out.push(`update public.sites set system_user_id = (select id from public.profiles where username = ${sqlText(SYSTEM_USERNAME)}) where id = ${sqlText(FIXTURE_SITE)} and system_user_id is null;`);
  out.push(`update public.sites set fallback_group_slug = ${sqlText(FALLBACK_GROUP_SLUG)} where id = ${sqlText(FIXTURE_SITE)} and fallback_group_slug is null;`);

  out.push(...upsert('groups', ['name', 'slug', 'display_color', 'text_color', 'site_id'],
    plan.groups.map((g) => [g.name, g.slug, g.display_color, g.text_color, FIXTURE_SITE]), ['slug'], `groups.site_id = ${sqlText(FIXTURE_SITE)}`));

  out.push(...upsert('series', SERIES_COLS, plan.series.map((s) => seriesCells(s.group_slug, s.row)), ['group_id']));

  out.push(...upsert('arcs', ['group_id', 'ord', 'name', 'kind', 'manga_only', 'anime_only', 'source_url', 'status'],
    plan.arcs.map(({ group_slug, row }) => [groupId(group_slug), row.ord, row.name, row.kind, row.manga_only === true, row.anime_only === true, row.source_url ?? null, row.status]),
    ['group_id', 'ord']));

  out.push(...upsert('characters',
    ['group_id', 'slug', 'name', 'name_native', 'aliases', 'role', 'debut_arc_ord', 'debut_medium', 'description', 'source_url', 'spoiler_level', 'identity_spoiler', 'ord', 'status'],
    plan.characters.map(({ group_slug, row }) => [groupId(group_slug), row.slug, row.name, row.name_native ?? null, textArray(row.aliases), row.role, row.debut_arc_ord,
      row.debut_medium ?? null, row.description, row.source_url ?? null, row.spoiler_level, row.identity_spoiler === true, row.ord, row.status]),
    ['group_id', 'slug']));

  out.push(...upsert('series_themes', ['group_id', 'kind', 'number', 'title', 'artist', 'season', 'idol_sung', 'source_url', 'status'],
    plan.themes.map(({ group_slug, row }) => [groupId(group_slug), row.kind, row.number, row.title, row.artist, row.season ?? null, row.idol_sung, row.source_url ?? null, row.status]),
    ['group_id', 'kind', 'number']));

  out.push(...upsert('quizzes',
    ['creator_id', 'group_id', 'title', 'slug', 'quiz_type', 'questions', 'difficulty', 'status', 'question_count', 'site_id', 'spoiler_arc_ord', 'spoiler_scope'],
    plan.quizzes.map((q) => [userId(q.account), groupId(q.group_slug), q.title, q.slug, q.quiz_type, json(q.questions), q.difficulty, 'published', q.question_count,
      FIXTURE_SITE, q.spoiler_arc_ord, q.spoiler_scope]),
    ['slug'], `quizzes.site_id = ${sqlText(FIXTURE_SITE)}`));

  out.push('commit;');
  return out.join('\n') + '\n';
}

/** The read that proves a load: one line of numbers (groups series arcs characters themes quizzes published_quizzes). */
export function countSql(slugs: readonly string[]): string {
  const list = slugs.map(sqlText).join(', ');
  const gid = `(select id from public.groups where site_id = ${sqlText(FIXTURE_SITE)} and slug in (${list}))`;
  return [
    `select (select count(*) from public.groups where site_id = ${sqlText(FIXTURE_SITE)} and slug in (${list})),`,
    `(select count(*) from public.series where group_id in ${gid}),`,
    `(select count(*) from public.arcs where group_id in ${gid}),`,
    `(select count(*) from public.characters where group_id in ${gid}),`,
    `(select count(*) from public.series_themes where group_id in ${gid}),`,
    `(select count(*) from public.quizzes where site_id = ${sqlText(FIXTURE_SITE)} and group_id in ${gid}),`,
    `(select count(*) from public.quizzes where site_id = ${sqlText(FIXTURE_SITE)} and status = 'published' and group_id in ${gid});`,
  ].join('\n');
}
