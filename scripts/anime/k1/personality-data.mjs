// Run O1, lane PERS: the personality quiz of a series (Which character are you), the pure half. A data file
// docs/anime/data/personality/<series-slug>.json holds the eight questions the engine asks and one profile per character
// (personality.schema.json, next to this file). This module reads those files, checks them (the editorial check C1, C3, C5, C7 to C9
// and C12 call the same functions, the loader calls them too, so the two can never differ), builds the rows and renders the SQL of
// the loader. No I/O except reading the data directory.
//
// The engine is the one of kpopquiz.org (apps/quiz/src/lib/personality/engine.ts: six axes, an answer is a position 0 to 5 on one to
// three axes, an axis is the mean of the positions picked, the result is the profile nearest to the player). It is mirrored here
// because this module is plain JS; personality.test.mjs compares the two on the Death Note file.
//
// Where the rows go (nothing in docs/o1/contracts changes):
//   personality_profiles   one row per character: group_id of the series, member_name = the character's name, member_slug = its slug,
//                          axes = traits, trait_lines = the profile lines, character_id from the slug, site_id anime.
//   personality_questions  the table has no group column and a unique index on ord, so the eight questions of a series sit at
//                          ord = group_id * 12 + 1 to group_id * 12 + 8 (site_id anime). A band of 12 never meets another band,
//                          and never the ten kpop questions (ord 1 to 10, group ids start well above 0). The page reads the band of its group.
//                          docs/o1/requests/PERS.md asks for a group_id column; the day it exists the band becomes a plain value.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, validate } from '../editorial/lib/schema.mjs';
import { THRESHOLDS } from '../editorial/lib/thresholds.mjs';
import { mentions, normalize } from '../editorial/lib/text.mjs';

export const SITE = 'anime';
export const SCHEMA_ID = 'personality.schema.json';
export const AXES = ['energy', 'chaos', 'care', 'craft', 'heart', 'spotlight'];
export const QUESTION_COUNT = 8;
export const MIN_PROFILES = 6;
/** Question ord of group g, n = 1 to 8: g * ORD_BAND + n. */
export const ORD_BAND = 12;
/** personality_questions.ord is a smallint. */
export const ORD_MAX = 32767;
export const WEIGHT_SCALE = 5;
export const AXIS_NEUTRAL = 50;
/** Most answer sheets the reach test walks (4 answers, 8 questions = 65536). */
const MAX_SHEETS = 1_000_000;

const sqlStr = (s) => {
  if (String(s).includes('\u0000')) throw new Error('a NUL character cannot be loaded');
  return `'${String(s).replace(/'/g, "''")}'`;
};

/** Reads docs/anime/data/personality/<slug>.json files: [{ file, slug, ...doc }] sorted by slug; [] when the folder is absent. */
export function readPersonality(dir) {
  const pd = join(dir, 'personality');
  const out = [];
  if (!existsSync(pd)) return out;
  for (const f of readdirSync(pd).filter((x) => x.endsWith('.json')).sort()) {
    const slug = f.slice(0, -5);
    const doc = JSON.parse(readFileSync(join(pd, f), 'utf8'));
    if (doc?.group_slug !== slug) throw new Error(`personality/${f}: group_slug ${String(doc?.group_slug)} differs from the file name`);
    out.push({ file: `personality/${f}`, slug, ...doc });
  }
  return out;
}

// ------------------------------------------------------------------ the engine, mirrored

/** The player's point on the six axes, 0 to 100 (engine.ts scorePlayer): the mean of the positions of the picked answers that name the axis. */
export function scorePlayer(questions, picks) {
  const out = {};
  for (const k of AXES) {
    let sum = 0; let votes = 0;
    questions.forEach((q, i) => {
      const w = q.options[picks[i]]?.weights?.[k];
      if (typeof w !== 'number' || !Number.isFinite(w)) return;
      sum += (Math.min(WEIGHT_SCALE, Math.max(0, w)) / WEIGHT_SCALE) * 100;
      votes += 1;
    });
    out[k] = votes > 0 ? sum / votes : AXIS_NEUTRAL;
  }
  return out;
}

export function distance(a, b) {
  let s = 0;
  for (const k of AXES) { const d = a[k] - b[k]; s += d * d; }
  return Math.sqrt(s);
}

/** The id of the nearest profile; equal distances keep the order of the list (engine.ts rankProfiles). */
export function nearestProfile(questions, picks, profiles) {
  const player = scorePlayer(questions, picks);
  let best = null; let bd = Infinity;
  for (const p of profiles) { const d = distance(player, p.axes); if (d < bd) { bd = d; best = p.id; } }
  return best;
}

/**
 * The share of all the answer sheets each profile wins: { id: share 0 to 1 }. `profiles` is [{ id, axes }].
 * Walks every sheet (4 answers and 8 questions: 65536), so "reachable" is measured, not hoped for.
 */
export function sheetShares(questions, profiles) {
  const sheets = questions.reduce((n, q) => n * q.options.length, 1);
  if (sheets > MAX_SHEETS) throw new Error(`${sheets} answer sheets is more than the reach test walks`);
  const wins = Object.fromEntries(profiles.map((p) => [p.id, 0]));
  const picks = new Array(questions.length).fill(0);
  const walk = (i) => {
    if (i === questions.length) { wins[nearestProfile(questions, picks, profiles)] += 1; return; }
    for (let j = 0; j < questions[i].options.length; j += 1) { picks[i] = j; walk(i + 1); }
  };
  walk(0);
  return Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v / sheets]));
}

// ------------------------------------------------------------------ checks shared by the loader and the editorial check

/** Schema errors of one file: [{ path, message }]. */
export function schemaErrors(doc, registry = loadRegistry()) {
  return validate(SCHEMA_ID, doc, registry).errors;
}

/** Every text a reader sees in a personality file, with its JSON pointer and role. */
export function textsOf(doc) {
  const out = [];
  (Array.isArray(doc?.questions) ? doc.questions : []).forEach((q, i) => {
    if (typeof q?.question === 'string') out.push({ path: `/questions/${i}/question`, text: q.question, role: 'question' });
    (Array.isArray(q?.options) ? q.options : []).forEach((o, j) => typeof o?.text === 'string' && out.push({ path: `/questions/${i}/options/${j}/text`, text: o.text, role: 'option' }));
  });
  (Array.isArray(doc?.profiles) ? doc.profiles : []).forEach((p, i) => {
    (Array.isArray(p?.profile) ? p.profile : []).forEach((l, j) => typeof l === 'string' && out.push({ path: `/profiles/${i}/profile/${j}`, text: l, role: 'profile' }));
  });
  return out;
}

/**
 * The shape rules a schema cannot state (check C1): questions in order 1 to 8, distinct answers, distinct profiles, and the reach
 * of the engine: every profile is the nearest result for at least `min` of the answer sheets and none for more than `max`.
 * Returns { fails, warns } of [{ path, message }]. Needs a valid file (run the schema first).
 */
export function shapeProblems(doc, T = THRESHOLDS) {
  const fails = []; const warns = [];
  const fail = (path, message) => fails.push({ path, message });
  const qs = doc.questions;
  qs.forEach((q, i) => {
    if (q.ord !== i + 1) fail(`/questions/${i}/ord`, `ord must run 1 to ${QUESTION_COUNT} in order, this is question ${i + 1} with ord ${q.ord}`);
    const norm = q.options.map((o) => normalize(o.text));
    if (new Set(norm).size !== norm.length) fail(`/questions/${i}/options`, 'the answers are not distinct once case, accents and punctuation are ignored');
    q.options.forEach((o, j) => { if (Object.keys(o.weights).length > 3) fail(`/questions/${i}/options/${j}/weights`, 'an answer names at most three axes'); });
  });
  const qn = qs.map((q) => normalize(q.question));
  qn.forEach((t, i) => { if (qn.indexOf(t) !== i) fail(`/questions/${i}/question`, `repeats question ${qn.indexOf(t) + 1}`); });
  const named = Object.fromEntries(AXES.map((k) => [k, 0]));
  for (const q of qs) for (const o of q.options) for (const k of Object.keys(o.weights)) named[k] += 1;
  for (const k of AXES) if (named[k] < 2) warns.push({ path: '/questions', message: `the axis ${k} is named by ${named[k]} answer(s): at least 2 are needed for it to tell profiles apart` });

  const ps = doc.profiles;
  const slugs = new Set(); const ords = new Set();
  ps.forEach((p, i) => {
    if (slugs.has(p.character_slug)) fail(`/profiles/${i}/character_slug`, `${p.character_slug} appears twice`);
    slugs.add(p.character_slug);
    if (ords.has(p.ord)) fail(`/profiles/${i}/ord`, `ord ${p.ord} appears twice`);
    ords.add(p.ord);
  });
  for (let i = 0; i < ps.length; i += 1) for (let j = i + 1; j < ps.length; j += 1) {
    const d = distance(ps[i].traits, ps[j].traits);
    if (d < T.personality_min_distance) fail(`/profiles/${j}/traits`, `${ps[j].character_slug} is only ${Math.round(d)} from ${ps[i].character_slug} on the six axes (at least ${T.personality_min_distance}): one of them would almost never win`);
  }
  if (fails.length === 0) {
    const shares = sheetShares(qs, ps.map((p) => ({ id: p.character_slug, axes: p.traits })));
    for (const [id, s] of Object.entries(shares)) {
      const at = `/profiles/${ps.findIndex((p) => p.character_slug === id)}/traits`;
      const pct = `${(s * 100).toFixed(1)}%`;
      if (s < T.personality_min_share) fail(at, `${id} is the result of ${pct} of the answer sheets, at least ${(T.personality_min_share * 100).toFixed(0)}% is needed: the quiz would almost never give it`);
      else if (s > T.personality_max_share) fail(at, `${id} is the result of ${pct} of the answer sheets, at most ${(T.personality_max_share * 100).toFixed(0)}% is allowed: the quiz would give it too often`);
    }
  }
  return { fails, warns };
}

/**
 * Voice (check C12, next to the emoji rule): every profile speaks to the reader. The first line starts with "You", and no line
 * starts with the character's own name (the result describes the player, never the character).
 */
export function voiceProblems(doc, series) {
  const fails = [];
  const chars = new Map((series?.characters ?? []).map((c) => [c.slug, c]));
  (doc.profiles ?? []).forEach((p, i) => {
    const lines = Array.isArray(p.profile) ? p.profile : [];
    if (lines.length > 0 && !/^You\b/.test(lines[0])) fails.push({ path: `/profiles/${i}/profile/0`, message: 'the first line of a profile speaks to the reader: it starts with "You"' });
    const c = chars.get(p.character_slug);
    lines.forEach((l, j) => {
      if (c && [c.name, ...(c.aliases ?? [])].some((n) => typeof n === 'string' && n.length >= 3 && l.trimStart().startsWith(n))) {
        fails.push({ path: `/profiles/${i}/profile/${j}`, message: `a line starts with the name of ${c.name}: the profile describes the reader, not the character` });
      }
    });
  });
  return fails;
}

/**
 * Spoilers (check C5). The page of a personality quiz has no spoiler shield (TWINS row 14), so the quiz's arc is 0: every character
 * of it has spoiler level 0 and is no identity spoiler, and no text of the file names a character of a higher level (against the
 * arc, as C5 reads a quiz question). A quiz with an arc above 0 would show spoilers to readers who asked for none.
 * `series` is the series data file (characters, arcs). Returns [{ path, message }].
 */
export function spoilerProblems(doc, series) {
  const fails = [];
  const arc = doc.spoiler?.arc ?? 0;
  const top = Math.max(0, ...(series?.arcs ?? []).map((a) => a?.ord ?? 0));
  if (arc > top) fails.push({ path: '/spoiler/arc', message: `arc ${arc} is beyond the last arc of the series (${top})` });
  if (arc > 0) fails.push({ path: '/spoiler/arc', message: `arc ${arc}: this page has no spoiler shield, so the arc of a personality quiz is 0` });
  const chars = series?.characters ?? [];
  const bySlug = new Map(chars.map((c) => [c.slug, c]));
  (doc.profiles ?? []).forEach((p, i) => {
    const c = bySlug.get(p.character_slug);
    if (!c) return;
    if ((c.spoiler_level ?? 0) > arc) fails.push({ path: `/profiles/${i}/character_slug`, message: `${c.slug} has spoiler level ${c.spoiler_level}, above the arc ${arc} of the quiz` });
    if (c.identity_spoiler === true) fails.push({ path: `/profiles/${i}/character_slug`, message: `${c.slug} is an identity spoiler: it cannot be a result of a page with no spoiler shield` });
  });
  const seen = new Set();
  for (const { path, text } of textsOf(doc)) {
    for (const c of chars) {
      if ((c.spoiler_level ?? 0) <= arc && c.identity_spoiler !== true) continue;
      for (const n of [c.name, ...(c.aliases ?? [])]) {
        if (mentions(text, n) && !seen.has(`${path}|${c.slug}`)) { seen.add(`${path}|${c.slug}`); fails.push({ path, message: `names ${n} (spoiler level ${c.spoiler_level ?? 0}${c.identity_spoiler ? ', identity spoiler' : ''}) in a quiz of arc ${arc}` }); }
      }
    }
  }
  return fails;
}

/** Characters (check C3): the series exists, every profile is a character of it, enough profiles. [{ path, message }]. */
export function characterProblems(doc, series, { requirePublished = true } = {}) {
  const fails = [];
  if (!series) return [{ path: '/group_slug', message: `no series file for ${doc.group_slug}` }];
  const bySlug = new Map((series.characters ?? []).map((c) => [c.slug, c]));
  (doc.profiles ?? []).forEach((p, i) => {
    const c = bySlug.get(p.character_slug);
    if (!c) fails.push({ path: `/profiles/${i}/character_slug`, message: `no character ${p.character_slug} in the series file of ${doc.group_slug}` });
    else if (requirePublished && c.status !== 'published') fails.push({ path: `/profiles/${i}/character_slug`, message: `${p.character_slug} is ${c.status}: a profile needs a published character` });
  });
  return fails;
}

// ------------------------------------------------------------------ the plan

/**
 * The rows of the sets: [{ slug, spoiler, questions: [{ n, question, options }], profiles: [{ character_slug, name, axes, lines, ord }] }].
 * `files` is the list of series data files ({ slug, characters, arcs }). Throws on any problem a check would fail, so a file that
 * the editorial check refuses is never loaded.
 */
export function buildPersonality(list, files, registryIn = null) {
  if (list.length === 0) return [];
  const registry = registryIn ?? loadRegistry();
  const bySlug = new Map(files.map((f) => [f.slug, f]));
  const seen = new Set();
  const rows = [];
  for (const doc of list) {
    const where = doc.file ?? `personality/${doc.group_slug}.json`;
    const clean = { ...doc }; delete clean.file; delete clean.slug;
    if (seen.has(doc.group_slug)) throw new Error(`${where}: the series ${doc.group_slug} has two personality files`);
    seen.add(doc.group_slug);
    const errs = schemaErrors(clean, registry);
    if (errs.length > 0) throw new Error(`${where}: ${errs.slice(0, 3).map((e) => `${e.path || '/'} ${e.message}`).join('; ')}${errs.length > 3 ? `; and ${errs.length - 3} more` : ''}`);
    const series = bySlug.get(doc.group_slug);
    const problems = [
      ...characterProblems(clean, series, { requirePublished: false }),
      ...(series ? spoilerProblems(clean, series) : []),
      ...shapeProblems(clean).fails,
      ...voiceProblems(clean, series),
    ];
    if (problems.length > 0) throw new Error(`${where}: ${problems.slice(0, 3).map((e) => `${e.path || '/'} ${e.message}`).join('; ')}${problems.length > 3 ? `; and ${problems.length - 3} more` : ''}`);
    const chars = new Map(series.characters.map((c) => [c.slug, c]));
    rows.push({
      slug: doc.group_slug,
      status: doc.status,
      spoiler: doc.spoiler,
      questions: clean.questions.map((q) => ({ n: q.ord, question: q.question, options: q.options.map((o) => ({ text: o.text, weights: o.weights })) })),
      profiles: clean.profiles.map((p) => ({ character_slug: p.character_slug, name: chars.get(p.character_slug).name, axes: p.traits, lines: p.profile, ord: p.ord })),
    });
  }
  return rows;
}

export function countPersonality(rows) {
  return { personality: rows.length, personality_questions: rows.reduce((n, r) => n + r.questions.length, 0), personality_profiles: rows.reduce((n, r) => n + r.profiles.length, 0) };
}

// ------------------------------------------------------------------ SQL

const groupId = (slug) => `(select id from public.groups where slug = ${sqlStr(slug)} and site_id = ${sqlStr(SITE)})`;
const ordOf = (slug, n) => `(${groupId(slug)} * ${ORD_BAND} + ${n})`;
const jsonb = (v) => `${sqlStr(JSON.stringify(v))}::jsonb`;

/** The preflight of a plan with sets: the columns exist (SQL 002a and 013). One `do` block. */
export function personalityPreflight() {
  return [
    'do $k1p$', 'begin',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'personality_profiles' and column_name = 'character_id') then",
    "    raise exception 'personality: personality_profiles.character_id is missing (apply SQL 013 first)';", '  end if;',
    "  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'personality_questions' and column_name = 'site_id') then",
    "    raise exception 'personality: personality_questions.site_id is missing (apply SQL 002a first)';", '  end if;',
    'end', '$k1p$;',
  ].join('\n');
}

/**
 * The statements of the sets (one per line group, no blank lines): after the characters of the series exist. Idempotent: an upsert on
 * ord for a question (only a row of site anime is ever updated), an upsert on (group_id, member_slug) for a profile, and the rows of
 * the series that are no longer in its file are removed (the questions above the eighth of the band, the profiles of other characters).
 */
export function renderPersonalitySql(rows) {
  if (rows.length === 0) return [];
  const out = [personalityPreflight()];
  for (const r of rows) {
    const g = groupId(r.slug);
    const active = r.status === 'published' ? 'true' : 'false';
    // a question of another site in the band of this group stops the load, never gets overwritten
    out.push([
      'do $k1p$', 'begin',
      `  if ${g} is null then raise exception 'personality: no group ${r.slug} on the anime site (load the series first)'; end if;`,
      `  if ${g} * ${ORD_BAND} + ${ORD_BAND} > ${ORD_MAX} then raise exception 'personality: group id of ${r.slug} is too large for the question band (ord is a smallint)'; end if;`,
      `  if exists (select 1 from public.personality_questions where ord between ${g} * ${ORD_BAND} + 1 and ${g} * ${ORD_BAND} + ${ORD_BAND} and site_id <> ${sqlStr(SITE)}) then raise exception 'personality: a question of another site sits in the band of ${r.slug}'; end if;`,
      'end', '$k1p$;',
    ].join('\n'));
    for (const q of r.questions) {
      out.push(`insert into public.personality_questions (ord, question, options, active, site_id) values (${ordOf(r.slug, q.n)}, ${sqlStr(q.question)}, ${jsonb(q.options)}, ${active}, ${sqlStr(SITE)}) on conflict (ord) do update set question = excluded.question, options = excluded.options, active = excluded.active where personality_questions.site_id = ${sqlStr(SITE)};`);
    }
    out.push(`delete from public.personality_questions where site_id = ${sqlStr(SITE)} and ord between ${g} * ${ORD_BAND} + ${QUESTION_COUNT + 1} and ${g} * ${ORD_BAND} + ${ORD_BAND};`);
    for (const p of r.profiles) {
      const lines = `array[${p.lines.map(sqlStr).join(', ')}]::text[]`;
      const cid = `(select id from public.characters where group_id = ${g} and slug = ${sqlStr(p.character_slug)})`;
      out.push(`insert into public.personality_profiles (group_id, member_name, member_slug, photo_url, axes, trait_lines, ord, active, site_id, character_id) values (${g}, ${sqlStr(p.name)}, ${sqlStr(p.character_slug)}, null, ${jsonb(p.axes)}, ${lines}, ${p.ord}, ${active}, ${sqlStr(SITE)}, ${cid}) on conflict (group_id, member_slug) do update set member_name = excluded.member_name, photo_url = null, axes = excluded.axes, trait_lines = excluded.trait_lines, ord = excluded.ord, active = excluded.active, site_id = excluded.site_id, character_id = excluded.character_id where personality_profiles.site_id = ${sqlStr(SITE)};`);
    }
    out.push(`delete from public.personality_profiles where site_id = ${sqlStr(SITE)} and group_id = ${g} and member_slug not in (${r.profiles.map((p) => sqlStr(p.character_slug)).join(', ')});`);
  }
  return out;
}

/** The two numbers that prove a load: the question rows of the bands and the profile rows of the series of the plan. */
export function personalityCountColumns(rows) {
  const list = rows.map((r) => sqlStr(r.slug)).join(', ');
  const gid = `(select id from public.groups where site_id = ${sqlStr(SITE)} and slug in (${list}))`;
  return [
    `(select count(*) from public.personality_questions q join public.groups g on g.site_id = ${sqlStr(SITE)} and g.slug in (${list}) where q.site_id = ${sqlStr(SITE)} and q.ord between g.id * ${ORD_BAND} + 1 and g.id * ${ORD_BAND} + ${QUESTION_COUNT})`,
    `(select count(*) from public.personality_profiles where site_id = ${sqlStr(SITE)} and group_id in ${gid})`,
  ];
}

/** The undo of a plan: the rows of its series (the launch rollback file). */
export function personalityUndoSql(rows) {
  return rows.flatMap((r) => [
    `delete from public.personality_questions where site_id = ${sqlStr(SITE)} and ord between ${groupId(r.slug)} * ${ORD_BAND} + 1 and ${groupId(r.slug)} * ${ORD_BAND} + ${ORD_BAND};`,
    `delete from public.personality_profiles where site_id = ${sqlStr(SITE)} and group_id = ${groupId(r.slug)};`,
  ]);
}
