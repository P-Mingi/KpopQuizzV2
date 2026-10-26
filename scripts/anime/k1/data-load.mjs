// Run O1, lane K1: the pure half of `load-fixtures.mjs --data <dir>`. It reads the series data files of
// docs/anime/data (series/<slug>.json with group, series, arcs, characters, themes; facts/<slug>.json with the facts
// of E1's store) and renders one idempotent SQL transaction for an o1 branch: the anime group rows (and the
// `anime-mix` group when missing), series, arcs, characters, series_themes, then the facts (`trivia` rows for the
// facts that carry a `text`, `entity_sources` rows for every source). No I/O except reading the data directory.
//
// Idempotence: every statement is an upsert on a natural key (groups.slug, series.group_id, arcs (group_id, ord),
// characters (group_id, slug), series_themes (group_id, kind, number), entity_sources (entity_type, entity_id, field,
// source), trivia (entity_kind, entity_id, normalised fact)), and rows of a series that are no longer in its files
// are removed (arcs, characters, themes, still-draft trivia), so a second run changes nothing.
// A group's colour pair (the file's, else the placeholder below) is written only when the group row is created. Trivia status follows the fact only upward: a still-draft row of a verified fact becomes published and one of a rejected fact becomes hidden; a published or hidden row is never moved back by a reload.
//
// Lane K2 extension (optional files of the same directory): creators.json (the 30 Team creators and the OtakuQuiz Team
// account, creator-profile.schema.json) and quizzes/<series>/*.json (quiz drafts, quiz-draft.schema.json). With
// them the plan also holds `creators` and `quizzes`: the accounts must already exist as profiles of the branch (the owner
// fixtures command creates them); the load sets their display name and avatar, their editorial_accounts row (the Team
// badge, off every board: rule 7) and their anime membership (bio, header), and publishes the quizzes on the anime site
// with the spoiler level computed from the question tags, never copied from a file. Without those files nothing changes.
//
// Lane K3 extension (optional folder of the same directory): daily/<batch>.json (daily bank rows, daily-bank-row.schema.json). With
// it the plan also holds `daily`: each row is loaded into `quiz_bank` for site anime as a draft with no scheduled_date (the daily
// cron's auto-scheduler sets dates, never this loader). Idempotent on the normalised title: a row already scheduled or published is
// never touched, a second run changes nothing, and a still-draft unscheduled anime row that is no longer in the files is removed.
//
// Lane PERS extension (optional folder of the same directory): personality/<series>.json (the Which character are you quiz of a series,
// personality.schema.json; the rules and the SQL are in personality-data.mjs). With it the plan also holds `personality`: the eight
// questions of the series (personality_questions of site anime, in the band of the group) and one personality_profiles row per
// character (character_id from the slug). A second run changes nothing; rows no longer in the file are removed.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPersonality, countPersonality, personalityCountColumns, readPersonality, renderPersonalitySql } from './personality-data.mjs';

export const SITE = 'anime';
export const MIX_SLUG = 'anime-mix';
export const MIX_NAME = 'Anime Mix';
export const PLACEHOLDER_COLORS = { display: '#1A1A1A', text: '#FFFFFF' };

const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const ENTITY_TYPE = { series: 'series', character: 'character', arc: 'arc', theme: 'series_theme', episode: 'episode' };
// Owner decision (facts re-check): a verified fact is a published trivia row; a rejected one is hidden; a draft one stays draft.
const TRIVIA_STATUS = { draft: 'draft', verified: 'published', rejected: 'hidden' };

/** Reads every series file of the directory (and its facts file). Throws on a missing facts file or a slug mismatch. */
export function readDataDir(dir) {
  const seriesDir = join(dir, 'series');
  if (!existsSync(seriesDir)) throw new Error(`no series directory in ${dir}`);
  const out = [];
  for (const f of readdirSync(seriesDir).filter((x) => x.endsWith('.json')).sort()) {
    const slug = f.slice(0, -5);
    const series = JSON.parse(readFileSync(join(seriesDir, f), 'utf8'));
    const factFile = join(dir, 'facts', f);
    const facts = existsSync(factFile) ? JSON.parse(readFileSync(factFile, 'utf8')) : [];
    if (series.group?.slug !== slug) throw new Error(`${f}: group.slug ${series.group?.slug} differs from the file name`);
    if (!SLUG_RE.test(slug)) throw new Error(`${f}: bad slug`);
    out.push({ slug, ...series, facts });
  }
  if (out.length === 0) throw new Error(`no series file in ${seriesDir}`);
  return out;
}

const SITE_URL = 'https://otakuquiz.org';
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const QUIZ_SLUG_RE = /^[a-z0-9-]{1,80}$/;
const QUIZ_TYPES = ['multiple_choice', 'true_false', 'guess_from_clues', 'intruder'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SCOPES = ['anime', 'manga', 'both'];

/** The spoiler level of a quiz: the same rules as computeSpoilerLevel in apps/quiz/src/lib/anime/spoilers/core.ts
 *  (arc 0 or no tag is spoiler free; scope manga when a tagged question is manga or sits in a manga-only arc, else anime
 *  when every tagged question is anime, else both). Mirrored here because this module is plain JS; a test compares the two. */
export function computeQuizLevel(questions, mangaOnlyArcs = new Set()) {
  let arcOrd = 0; let anyManga = false; let allAnime = true; let tagged = 0;
  for (const q of questions) {
    const tag = q.spoiler;
    if (!tag || !Number.isFinite(tag.arc) || tag.arc <= 0) continue;
    tagged += 1;
    if (tag.arc > arcOrd) arcOrd = tag.arc;
    if (tag.scope === 'manga' || mangaOnlyArcs.has(tag.arc)) anyManga = true;
    if (tag.scope !== 'anime') allAnime = false;
  }
  if (tagged === 0) return { arcOrd: 0, scope: null };
  return { arcOrd, scope: anyManga ? 'manga' : allAnime ? 'anime' : 'both' };
}

/** Reads the optional K2 files of the directory: { creators: [...profiles], quizzes: [...drafts] } (both empty when absent). */
export function readExtras(dir) {
  const creators = []; const quizzes = [];
  const cf = join(dir, 'creators.json');
  if (existsSync(cf)) {
    const doc = JSON.parse(readFileSync(cf, 'utf8'));
    const list = Array.isArray(doc) ? doc : doc.creators;
    if (!Array.isArray(list)) throw new Error('creators.json: expected an array or { creators: [...] }');
    creators.push(...list);
  }
  const qd = join(dir, 'quizzes');
  if (existsSync(qd)) {
    for (const g of readdirSync(qd).sort()) {
      const gd = join(qd, g);
      if (!existsSync(gd) || !readdirSync(gd).some((x) => x.endsWith('.json'))) continue;
      for (const f of readdirSync(gd).filter((x) => x.endsWith('.json')).sort()) {
        const doc = JSON.parse(readFileSync(join(gd, f), 'utf8'));
        const list = Array.isArray(doc) ? doc : Array.isArray(doc.quizzes) ? doc.quizzes : [doc];
        for (const q of list) quizzes.push({ file: `quizzes/${g}/${f}`, dir: g, ...q });
      }
    }
  }
  return { creators, quizzes, daily: readDaily(dir), personality: readPersonality(dir) };
}

const DAILY_CATEGORIES = ['series_specific', 'true_false', 'who_am_i', 'name_the_series', 'music', 'creators_studios', 'odd_one_out', 'crossover'];

/** Reads daily/<batch>.json (an array of rows, one row, or { rows: [...] }); [] when the folder is absent. */
export function readDaily(dir) {
  const dd = join(dir, 'daily');
  const rows = [];
  if (!existsSync(dd)) return rows;
  for (const f of readdirSync(dd).filter((x) => x.endsWith('.json')).sort()) {
    const doc = JSON.parse(readFileSync(join(dd, f), 'utf8'));
    const list = Array.isArray(doc) ? doc : Array.isArray(doc.rows) ? doc.rows : [doc];
    list.forEach((r, i) => rows.push({ file: `daily/${f}#${i + 1}`, ...r }));
  }
  return rows;
}

function buildDaily(list, groups) {
  const slugs = new Set([...groups.map((g) => g.slug), MIX_SLUG]);
  const seen = new Set(); const rows = [];
  for (const r of list) {
    const where = `${r.file ?? 'daily row'} (${String(r.title)})`;
    if (r.site !== 'anime') throw new Error(`${where}: site must be anime`);
    if (typeof r.title !== 'string' || r.title.length < 5 || r.title.length > 100) throw new Error(`${where}: title must be 5 to 100 characters`);
    const key = r.title.trim().toLowerCase();
    if (seen.has(key)) throw new Error(`${where}: duplicate title`);
    seen.add(key);
    const slug = r.group_slug ?? MIX_SLUG;
    if (!slugs.has(slug)) throw new Error(`${where}: no series file for group ${String(r.group_slug)}`);
    if (!QUIZ_TYPES.includes(r.quiz_type)) throw new Error(`${where}: bad quiz_type ${String(r.quiz_type)}`);
    if (!DIFFICULTIES.includes(r.difficulty)) throw new Error(`${where}: bad difficulty ${String(r.difficulty)}`);
    if (!DAILY_CATEGORIES.includes(r.category)) throw new Error(`${where}: bad category ${String(r.category)}`);
    if (r.description !== undefined && (typeof r.description !== 'string' || r.description.length > 300)) throw new Error(`${where}: description must be at most 300 characters`);
    if (!Array.isArray(r.questions) || r.questions.length !== 8) throw new Error(`${where}: exactly 8 questions needed`);
    r.questions.forEach((x, i) => {
      if (!x?.spoiler || x.spoiler.arc !== 0 || !SCOPES.includes(x.spoiler.scope)) throw new Error(`${where}: question ${i + 1} must be tagged at spoiler arc 0`);
    });
    rows.push({ title: r.title.trim(), description: r.description ?? null, group_slug: slug, quiz_type: r.quiz_type, difficulty: r.difficulty, category: r.category, questions: r.questions });
  }
  return rows;
}

function buildCreators(list) {
  const seen = new Set(); const rows = [];
  for (const c of list) {
    const u = c.username;
    if (typeof u !== 'string' || !USERNAME_RE.test(u)) throw new Error(`creator ${String(u)}: bad username`);
    if (seen.has(u)) throw new Error(`creator ${u}: duplicate username`);
    seen.add(u);
    if (c.site !== 'anime') throw new Error(`creator ${u}: site must be anime`);
    if (!['series', 'theme', 'system'].includes(c.kind)) throw new Error(`creator ${u}: bad kind`);
    if (typeof c.display_name !== 'string' || c.display_name.length < 1 || c.display_name.length > 40) throw new Error(`creator ${u}: display_name must be 1 to 40 characters`);
    if (typeof c.bio !== 'string' || c.bio.length > 160) throw new Error(`creator ${u}: bio must be at most 160 characters`);
    if (typeof c.beat !== 'string' || c.beat.length < 1 || c.beat.length > 80) throw new Error(`creator ${u}: beat must be 1 to 80 characters`);
    const url = (p) => {
      const m = /^public(\/brand\/anime\/creators\/[a-z0-9_]{3,20}-(?:avatar|header)\.svg)$/.exec(p ?? '');
      if (!m) throw new Error(`creator ${u}: bad asset path ${String(p)}`);
      return `${SITE_URL}${m[1]}`;
    };
    rows.push({ username: u, kind: c.kind, display_name: c.display_name, bio: c.bio, beat: c.beat, avatar_url: url(c.avatar), header_url: url(c.header) });
  }
  return rows;
}

function buildQuizzes(list, creators, groups, arcsBySlug) {
  const accounts = new Set(creators.map((c) => c.username));
  const slugs = new Set([...groups.map((g) => g.slug), MIX_SLUG]); // the anime-mix group is created by the load (multi-series quizzes)
  const seen = new Set(); const rows = [];
  for (const q of list) {
    const where = `${q.file ?? 'quiz'} (${q.slug})`;
    if (typeof q.slug !== 'string' || !QUIZ_SLUG_RE.test(q.slug)) throw new Error(`${where}: bad quiz slug`);
    if (seen.has(q.slug)) throw new Error(`${where}: duplicate quiz slug`);
    seen.add(q.slug);
    if (q.site !== 'anime') throw new Error(`${where}: site must be anime`);
    if (!slugs.has(q.group_slug)) throw new Error(`${where}: no series file for group ${String(q.group_slug)}`);
    if (q.dir && q.dir !== q.group_slug) throw new Error(`${where}: the file sits in ${q.dir} but the group is ${q.group_slug}`);
    if (!accounts.has(q.account)) throw new Error(`${where}: account ${String(q.account)} is not in creators.json`);
    if (typeof q.title !== 'string' || q.title.length < 5 || q.title.length > 100) throw new Error(`${where}: title must be 5 to 100 characters`);
    if (!QUIZ_TYPES.includes(q.quiz_type)) throw new Error(`${where}: bad quiz_type ${String(q.quiz_type)}`);
    if (!DIFFICULTIES.includes(q.difficulty)) throw new Error(`${where}: bad difficulty ${String(q.difficulty)}`);
    if (!Array.isArray(q.questions) || q.questions.length < 3 || q.questions.length > 20) throw new Error(`${where}: 3 to 20 questions needed`);
    q.questions.forEach((x, i) => {
      if (!x?.spoiler || !Number.isInteger(x.spoiler.arc) || !SCOPES.includes(x.spoiler.scope)) throw new Error(`${where}: question ${i + 1} has no spoiler tag`);
    });
    const mangaOnly = new Set((arcsBySlug.get(q.group_slug) ?? []).filter((a) => a.manga_only === true).map((a) => a.ord));
    const level = computeQuizLevel(q.questions, mangaOnly);
    rows.push({ group_slug: q.group_slug, slug: q.slug, title: q.title, account: q.account, quiz_type: q.quiz_type, difficulty: q.difficulty,
      questions: q.questions, question_count: q.questions.length, spoiler_arc_ord: level.arcOrd, spoiler_scope: level.scope });
  }
  return rows;
}

/** Plan = the rows to write, one object per table. Throws on a duplicate natural key. `extras` is readExtras(dir) (K2). */
export function buildDataPlan(files, extras = { creators: [], quizzes: [], daily: [], personality: [] }) {
  const groups = []; const series = []; const arcs = []; const characters = []; const themes = []; const trivia = []; const sources = [];
  const seenSrc = new Set(); const seenTrivia = new Set();
  for (const f of files) {
    const slug = f.slug;
    groups.push({ slug, name: f.group.name, display_color: f.group.display_color, text_color: f.group.text_color });
    series.push({ slug, row: f.series });
    for (const a of f.arcs ?? []) arcs.push({ slug, row: a });
    for (const c of f.characters ?? []) characters.push({ slug, row: c });
    for (const t of f.themes ?? []) themes.push({ slug, row: t });
    for (const fact of f.facts ?? []) {
      const kind = fact.entity?.kind;
      if (!(kind in ENTITY_TYPE)) throw new Error(`fact ${fact.id}: unknown entity kind ${kind}`);
      if (fact.entity.group_slug !== slug) throw new Error(`fact ${fact.id}: group_slug differs from ${slug}`);
      const entityId = kind === 'series' ? slug : String(fact.entity.ref);
      for (const s of fact.sources) {
        // press (Oricon, Anime News Network) is kept in the files only: entity_sources_source_check does not know it
        if (s.source === 'press') continue;
        const key = `${ENTITY_TYPE[kind]}|${entityId}|${fact.field}|${s.source}`;
        if (seenSrc.has(key)) throw new Error(`fact ${fact.id}: entity_sources slot ${key} is already used`);
        seenSrc.add(key);
        sources.push({ entity_type: ENTITY_TYPE[kind], entity_id: entityId, field: fact.field, source: s.source, source_ref: s.ref ?? null, source_url: s.url, fetched_at: s.fetched_at });
      }
      if (typeof fact.text === 'string' && kind !== 'episode') {
        const key = `${kind}|${entityId}|${fact.text.trim().toLowerCase()}`;
        if (seenTrivia.has(key)) throw new Error(`fact ${fact.id}: duplicate trivia text`);
        seenTrivia.add(key);
        trivia.push({ slug, entity_kind: kind, entity_id: entityId, fact: fact.text.trim(), category: fact.category, source: (fact.sources.find((x) => x.source !== 'press') ?? fact.sources[0]).source, source_url: (fact.sources.find((x) => x.source !== 'press') ?? fact.sources[0]).url, status: TRIVIA_STATUS[fact.status] ?? 'draft' });
      }
    }
  }
  const creators = buildCreators(extras.creators ?? []);
  const arcsBySlug = new Map(files.map((f) => [f.slug, f.arcs ?? []]));
  const quizzes = buildQuizzes(extras.quizzes ?? [], creators, groups, arcsBySlug);
  const daily = buildDaily(extras.daily ?? [], groups);
  const personality = buildPersonality(extras.personality ?? [], files);
  return { groups, series, arcs, characters, themes, trivia, sources, creators, quizzes, daily, personality };
}

export function countDataPlan(plan) {
  const base = { groups: plan.groups.length, series: plan.series.length, arcs: plan.arcs.length, characters: plan.characters.length, themes: plan.themes.length, trivia: plan.trivia.length, entity_sources: plan.sources.length };
  const k2 = plan.creators?.length || plan.quizzes?.length
    ? { creators: plan.creators.length, quizzes: plan.quizzes.length, questions: plan.quizzes.reduce((n, q) => n + q.question_count, 0) } : {};
  const k3 = plan.daily?.length ? { daily: plan.daily.length, daily_questions: plan.daily.reduce((n, r) => n + r.questions.length, 0) } : {};
  const pers = plan.personality?.length ? countPersonality(plan.personality) : {};
  return { ...base, ...k2, ...k3, ...pers };
}

// ---------------------------------------------------------------- SQL
export const sqlText = (s) => {
  if (String(s).includes('\u0000')) throw new Error('a NUL character cannot be loaded');
  return `'${String(s).replace(/'/g, "''")}'`;
};
const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object' && 'raw' in v) return v.raw;
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('non-finite number'); return String(v); }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return sqlText(v);
};
const raw = (sql) => ({ raw: sql });
const json = (v) => raw(`${sqlText(JSON.stringify(v ?? null))}::jsonb`);
const textArray = (v) => (Array.isArray(v) && v.length > 0 ? raw(`array[${v.map(sqlText).join(', ')}]::text[]`) : raw("'{}'::text[]"));
const groupId = (slug) => raw(`(select id from public.groups where slug = ${sqlText(slug)} and site_id = ${sqlText(SITE)})`);
const num = (v) => (typeof v === 'number' ? v : null);
const str = (v) => (typeof v === 'string' ? v : null);

function upsert(table, cols, rows, conflict, setExtra = '') {
  const update = cols.filter((c) => !conflict.includes(c)).map((c) => `${c} = excluded.${c}`).join(', ') + setExtra;
  return rows.map((r) => `insert into public.${table} (${cols.join(', ')}) values (${r.map(lit).join(', ')}) on conflict (${conflict.join(', ')}) do update set ${update};`);
}

const SERIES_COLS = ['group_id', 'type', 'title_en', 'title_native', 'title_romaji', 'aliases', 'studios', 'director', 'authors', 'magazine', 'publisher',
  'anime_start_year', 'anime_end_year', 'manga_start_year', 'manga_end_year', 'status', 'episodes', 'seasons', 'volumes', 'chapters', 'official_url', 'wikidata_qid', 'tier', 'published'];

function seriesCells(slug, s) {
  return [groupId(slug), s.type, s.title_en, str(s.title_native), str(s.title_romaji), textArray(s.aliases), json(s.studios ?? []), str(s.director), json(s.authors ?? []),
    str(s.magazine), str(s.publisher), num(s.anime_start_year), num(s.anime_end_year), num(s.manga_start_year), num(s.manga_end_year), s.status, num(s.episodes), num(s.seasons),
    num(s.volumes), num(s.chapters), str(s.official_url), str(s.wikidata_qid), str(s.tier), s.published === true];
}

function preflight(plan) {
  const slugs = plan.groups.map((g) => sqlText(g.slug)).join(', ');
  return [
    'do $k1$', 'begin',
    "  if to_regclass('public.series') is null or to_regclass('public.arcs') is null or to_regclass('public.characters') is null or to_regclass('public.series_themes') is null then",
    "    raise exception 'load-fixtures: the anime tables are missing (apply SQL 011 first)';", '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then",
    "    raise exception 'load-fixtures: entity_sources.source_url is missing (apply SQL 011 first)';", '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'trivia' and column_name = 'site_id') then",
    "    raise exception 'load-fixtures: trivia.site_id is missing (apply the multisite SQL first)';", '  end if;',
    `  if not exists (select 1 from public.sites where id = ${sqlText(SITE)}) then`, "    raise exception 'load-fixtures: the anime row of sites is missing';", '  end if;',
    `  if exists (select 1 from public.groups where slug in (${slugs}, ${sqlText(MIX_SLUG)}) and site_id <> ${sqlText(SITE)}) then`,
    "    raise exception 'load-fixtures: a series slug is already a group of another site';", '  end if;',
    ...(plan.creators?.length ? [
      "  if to_regclass('public.editorial_accounts') is null or to_regclass('public.world_memberships') is null then",
      "    raise exception 'load-fixtures: editorial_accounts or world_memberships is missing (apply SQL 003 and 012 first)';", '  end if;',
      `  if exists (select 1 from (values ${plan.creators.map((c) => `(${sqlText(c.username)})`).join(', ')}) as a(u) where not exists (select 1 from public.profiles p where p.username = a.u)) then`,
      "    raise exception 'load-fixtures: a creator has no profile (run the owner fixtures command first)';", '  end if;',
    ] : []),
    ...(plan.quizzes?.length ? [
      "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quizzes' and column_name = 'spoiler_arc_ord') then",
      "    raise exception 'load-fixtures: quizzes.spoiler_arc_ord is missing (apply SQL 011 first)';", '  end if;',
    ] : []),
    ...(plan.daily?.length ? [
      "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quiz_bank' and column_name = 'site_id') then",
      "    raise exception 'load-fixtures: quiz_bank.site_id is missing (apply the multisite SQL first)';", '  end if;',
    ] : []),
    'end', '$k1$;',
  ].join('\n');
}

/** One transaction that loads the whole plan. Safe to run again. */
export function renderDataSql(plan) {
  const out = ['\\set ON_ERROR_STOP on', 'begin;', 'set local client_min_messages = warning;', preflight(plan)];
  const guard = ` where groups.site_id = ${sqlText(SITE)}`;
  // groups: a new group gets the placeholder colour pair, an existing one keeps its colours
  const grp = (slug, name, dc, tc) => `insert into public.groups (name, slug, display_color, text_color, site_id) values (${sqlText(name)}, ${sqlText(slug)}, ${sqlText(dc ?? PLACEHOLDER_COLORS.display)}, ${sqlText(tc ?? PLACEHOLDER_COLORS.text)}, ${sqlText(SITE)}) on conflict (slug) do update set name = excluded.name${guard};`;
  out.push(`insert into public.groups (name, slug, display_color, text_color, site_id) values (${sqlText(MIX_NAME)}, ${sqlText(MIX_SLUG)}, ${sqlText(PLACEHOLDER_COLORS.display)}, ${sqlText(PLACEHOLDER_COLORS.text)}, ${sqlText(SITE)}) on conflict (slug) do nothing;`);
  for (const g of plan.groups) out.push(grp(g.slug, g.name, g.display_color, g.text_color));

  out.push(...upsert('series', SERIES_COLS, plan.series.map((s) => seriesCells(s.slug, s.row)), ['group_id'], ', updated_at = now()'));

  out.push(...upsert('arcs', ['group_id', 'ord', 'name', 'kind', 'episode_from', 'episode_to', 'chapter_from', 'chapter_to', 'manga_only', 'anime_only', 'source_url', 'status'],
    plan.arcs.map(({ slug, row: a }) => [groupId(slug), a.ord, a.name, a.kind, num(a.episode_from), num(a.episode_to), num(a.chapter_from), num(a.chapter_to), a.manga_only === true, a.anime_only === true, str(a.source_url), a.status]),
    ['group_id', 'ord']));

  out.push(...upsert('characters',
    ['group_id', 'slug', 'name', 'name_native', 'aliases', 'role', 'affiliation', 'debut_arc_ord', 'debut_medium', 'description', 'source_url', 'spoiler_level', 'identity_spoiler', 'ord', 'status'],
    plan.characters.map(({ slug, row: c }) => [groupId(slug), c.slug, c.name, str(c.name_native), textArray(c.aliases), c.role, str(c.affiliation), num(c.debut_arc_ord), str(c.debut_medium),
      c.description, str(c.source_url), c.spoiler_level, c.identity_spoiler === true, c.ord, c.status]),
    ['group_id', 'slug']));

  out.push(...upsert('series_themes', ['group_id', 'kind', 'number', 'title', 'artist', 'season', 'idol_sung', 'deezer_playable', 'source_url', 'status'],
    plan.themes.map(({ slug, row: t }) => [groupId(slug), t.kind, t.number, t.title, t.artist, num(t.season), t.idol_sung === true, typeof t.deezer_playable === 'boolean' ? t.deezer_playable : null, str(t.source_url), t.status]),
    ['group_id', 'kind', 'number']));

  // stale rows of a series (no longer in its files)
  for (const g of plan.groups) {
    const arcOrds = plan.arcs.filter((a) => a.slug === g.slug).map((a) => a.row.ord);
    const chars = plan.characters.filter((c) => c.slug === g.slug).map((c) => sqlText(c.row.slug));
    const slots = plan.themes.filter((t) => t.slug === g.slug).map((t) => `(${sqlText(t.row.kind)}, ${t.row.number})`);
    out.push(`delete from public.arcs where group_id = ${lit(groupId(g.slug))} and ord not in (${arcOrds.length ? arcOrds.join(', ') : '0'});`);
    out.push(`delete from public.characters where group_id = ${lit(groupId(g.slug))} and slug not in (${chars.length ? chars.join(', ') : "''"});`);
    out.push(`delete from public.series_themes where group_id = ${lit(groupId(g.slug))} and (kind, number) not in (${slots.length ? slots.join(', ') : "('op', 0)"});`);
  }

  // entity_sources: one upsert per source
  out.push(...upsert('entity_sources', ['entity_type', 'entity_id', 'field', 'source', 'source_ref', 'source_url', 'fetched_at'],
    plan.sources.map((s) => [s.entity_type, s.entity_id, s.field, s.source, s.source_ref, s.source_url, raw(`${sqlText(s.fetched_at)}::timestamptz`)]),
    ['entity_type', 'entity_id', 'field', 'source']));

  // trivia: temp table of the wanted rows, then update by key, insert the missing, drop stale drafts
  out.push('create temp table _k1_trivia (group_slug text, entity_kind text, entity_id text, fact text, category text, source text, source_url text, status text) on commit drop;');
  for (let i = 0; i < plan.trivia.length; i += 100) {
    const chunk = plan.trivia.slice(i, i + 100);
    out.push(`insert into _k1_trivia values ${chunk.map((t) => `(${[t.slug, t.entity_kind, t.entity_id, t.fact, t.category, t.source, t.source_url, t.status].map(lit).join(', ')})`).join(', ')};`);
  }
  const key = (a, b) => `${a}.entity_kind = ${b}.entity_kind and ${a}.entity_id = ${b}.entity_id and md5(btrim(lower(${a}.fact))) = md5(btrim(lower(${b}.fact)))`;
  out.push(`update public.trivia t set category = v.category, source = v.source, source_url = v.source_url, updated_at = now() from _k1_trivia v where t.site_id = ${sqlText(SITE)} and ${key('t', 'v')} and (t.category, t.source, t.source_url) is distinct from (v.category, v.source, v.source_url);`);
  out.push(`update public.trivia t set status = v.status, updated_at = now() from _k1_trivia v where t.site_id = ${sqlText(SITE)} and ${key('t', 'v')} and t.status = 'draft' and v.status in ('published', 'hidden');`);
  out.push(`insert into public.trivia (entity_kind, entity_id, group_id, fact, category, source, source_url, lang, status, site_id) select v.entity_kind, v.entity_id, g.id, v.fact, v.category, v.source, v.source_url, 'en', v.status, ${sqlText(SITE)} from _k1_trivia v join public.groups g on g.slug = v.group_slug and g.site_id = ${sqlText(SITE)} where not exists (select 1 from public.trivia t where ${key('t', 'v')});`);
  out.push(`delete from public.trivia t where t.site_id = ${sqlText(SITE)} and t.status = 'draft' and t.created_by is null and t.group_id in (select id from public.groups where site_id = ${sqlText(SITE)} and slug in (${plan.groups.map((g) => sqlText(g.slug)).join(', ')})) and not exists (select 1 from _k1_trivia v where ${key('t', 'v')});`);

  // K2: the Team creators (profiles must exist), then their quizzes
  if (plan.creators?.length) {
    const vals = (f) => plan.creators.map((c) => `(${f(c).map(lit).join(', ')})`).join(', ');
    out.push(`update public.profiles p set display_name = v.display_name, avatar_url = v.avatar_url from (values ${vals((c) => [c.username, c.display_name, c.avatar_url])}) as v(username, display_name, avatar_url) where p.username = v.username and (p.display_name, p.avatar_url) is distinct from (v.display_name, v.avatar_url);`);
    out.push(`insert into public.editorial_accounts (user_id, display_name, beat, active, site_id) select p.id, v.display_name, v.beat, true, ${sqlText(SITE)} from (values ${vals((c) => [c.username, c.display_name, c.beat])}) as v(username, display_name, beat) join public.profiles p on p.username = v.username on conflict (user_id) do update set display_name = excluded.display_name, beat = excluded.beat, active = true, site_id = excluded.site_id;`);
    out.push(`insert into public.world_memberships (user_id, site_id, joined_via, activated_at, bio, header_url) select p.id, ${sqlText(SITE)}, 'seed', now(), v.bio, v.header_url from (values ${vals((c) => [c.username, c.bio, c.header_url])}) as v(username, bio, header_url) join public.profiles p on p.username = v.username on conflict (user_id, site_id) do update set bio = excluded.bio, header_url = excluded.header_url, activated_at = coalesce(public.world_memberships.activated_at, excluded.activated_at);`);
    if (plan.creators.some((c) => c.kind === 'system')) {
      const sys = plan.creators.find((c) => c.kind === 'system').username;
      out.push(`update public.sites set system_user_id = (select id from public.profiles where username = ${sqlText(sys)}) where id = ${sqlText(SITE)} and system_user_id is null;`);
    }
  }
  if (plan.quizzes?.length) {
    out.push(...upsert('quizzes',
      ['creator_id', 'group_id', 'title', 'slug', 'quiz_type', 'questions', 'difficulty', 'status', 'question_count', 'site_id', 'spoiler_arc_ord', 'spoiler_scope'],
      plan.quizzes.map((q) => [raw(`(select id from public.profiles where username = ${sqlText(q.account)})`), groupId(q.group_slug), q.title, q.slug, q.quiz_type, json(q.questions), q.difficulty, 'published', q.question_count, SITE, q.spoiler_arc_ord, q.spoiler_scope]),
      ['slug'], ` where quizzes.site_id = ${sqlText(SITE)}`));
  }

  if (plan.daily?.length) out.push(...renderDailySql(plan.daily));

  // PERS: the characters are final here (upserted and cleaned above), so the profiles can name them
  if (plan.personality?.length) out.push(...renderPersonalitySql(plan.personality));

  out.push('commit;');
  return out.join('\n') + '\n';
}

/** Only the personality rows of a plan (the series, groups and characters must already be on the branch): one transaction, safe to run again. */
export function renderPersonalityOnlySql(plan) {
  if (!plan.personality?.length) throw new Error('no personality file in the data folder');
  return ['\\set ON_ERROR_STOP on', 'begin;', 'set local client_min_messages = warning;', ...renderPersonalitySql(plan.personality), 'commit;'].join('\n') + '\n';
}

const bankKey = (a, b) => `md5(lower(btrim(${a}.title))) = md5(lower(btrim(${b}.title)))`;

/** K3: the daily bank rows. A temp table of the wanted rows, then update the unscheduled drafts by title, insert the missing
 *  (a title already in the bank on any date is left alone), delete the stale unscheduled drafts. Never sets scheduled_date. */
function renderDailySql(daily) {
  const out = ['create temp table _k3_bank (title text, description text, group_slug text, quiz_type text, difficulty text, category text, questions jsonb) on commit drop;'];
  for (let i = 0; i < daily.length; i += 10) {
    const chunk = daily.slice(i, i + 10);
    out.push(`insert into _k3_bank values ${chunk.map((r) => `(${[r.title, r.description, r.group_slug, r.quiz_type, r.difficulty, r.category].map(lit).join(', ')}, ${lit(json(r.questions))})`).join(', ')};`);
  }
  const scope = `b.site_id = ${sqlText(SITE)} and b.scheduled_date is null and b.published_quiz_id is null and b.verified_at is null and b.status = 'draft'`;
  out.push(`update public.quiz_bank b set description = v.description, group_id = g.id, quiz_type = v.quiz_type, difficulty = v.difficulty, category = v.category, questions = v.questions, updated_at = now() from _k3_bank v join public.groups g on g.slug = v.group_slug and g.site_id = ${sqlText(SITE)} where ${scope} and ${bankKey('b', 'v')} and (b.description, b.group_id, b.quiz_type, b.difficulty, b.category, b.questions) is distinct from (v.description, g.id, v.quiz_type, v.difficulty, v.category, v.questions);`);
  out.push(`insert into public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, status, site_id) select v.title, v.description, g.id, v.quiz_type, v.difficulty, v.category, v.questions, 'draft', ${sqlText(SITE)} from _k3_bank v join public.groups g on g.slug = v.group_slug and g.site_id = ${sqlText(SITE)} where not exists (select 1 from public.quiz_bank b where b.site_id = ${sqlText(SITE)} and ${bankKey('b', 'v')});`);
  out.push(`delete from public.quiz_bank b where ${scope} and not exists (select 1 from _k3_bank v where ${bankKey('b', 'v')});`);
  return out;
}

/** The read that proves a load: one line of numbers (groups series arcs characters themes trivia entity_sources), then
 *  with K2 files: creators (Team accounts with an editorial_accounts row), team memberships (anime membership with a bio),
 *  quizzes (published, of the plan) and their questions; with K3 daily rows: the bank rows (site anime, no date) and their questions. */
export function countDataSql(plan) {
  const list = plan.groups.map((g) => sqlText(g.slug)).join(', ');
  const gid = `(select id from public.groups where site_id = ${sqlText(SITE)} and slug in (${list}))`;
  const ids = plan.sources.map((s) => `(${sqlText(s.entity_type)}, ${sqlText(s.entity_id)}, ${sqlText(s.field)}, ${sqlText(s.source)})`);
  const cols = [
    `(select count(*) from public.groups where site_id = ${sqlText(SITE)} and slug in (${list}, ${sqlText(MIX_SLUG)}))`,
    `(select count(*) from public.series where group_id in ${gid})`,
    `(select count(*) from public.arcs where group_id in ${gid})`,
    `(select count(*) from public.characters where group_id in ${gid})`,
    `(select count(*) from public.series_themes where group_id in ${gid})`,
    `(select count(*) from public.trivia where site_id = ${sqlText(SITE)} and group_id in ${gid})`,
    `(select count(*) from public.entity_sources where (entity_type, entity_id, field, source) in (${ids.length ? ids.join(', ') : "('', '', '', '')"}))`,
  ];
  if (plan.creators?.length || plan.quizzes?.length) {
    const users = plan.creators.map((c) => sqlText(c.username)).join(', ') || "''";
    const slugs = plan.quizzes.map((q) => sqlText(q.slug)).join(', ') || "''";
    cols.push(
      `(select count(*) from public.editorial_accounts e join public.profiles p on p.id = e.user_id where e.site_id = ${sqlText(SITE)} and e.active and p.username in (${users}))`,
      `(select count(*) from public.world_memberships m join public.profiles p on p.id = m.user_id where m.site_id = ${sqlText(SITE)} and p.username in (${users}))`,
      `(select count(*) from public.quizzes where site_id = ${sqlText(SITE)} and status = 'published' and slug in (${slugs}))`,
      `(select coalesce(sum(question_count), 0) from public.quizzes where site_id = ${sqlText(SITE)} and slug in (${slugs}))`,
    );
  }
  if (plan.daily?.length) {
    const titles = plan.daily.map((r) => sqlText(r.title.toLowerCase())).join(', ');
    cols.push(
      `(select count(*) from public.quiz_bank where site_id = ${sqlText(SITE)} and scheduled_date is null and lower(btrim(title)) in (${titles}))`,
      `(select coalesce(sum(jsonb_array_length(questions)), 0) from public.quiz_bank where site_id = ${sqlText(SITE)} and scheduled_date is null and lower(btrim(title)) in (${titles}))`,
    );
  }
  if (plan.personality?.length) cols.push(...personalityCountColumns(plan.personality));
  return `select ${cols.join(',\n')};\n`;
}
