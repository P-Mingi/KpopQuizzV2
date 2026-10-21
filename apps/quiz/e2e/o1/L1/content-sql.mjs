// Run O1, lane L1: the launch SQL of the content, generated from docs/anime/data. Never applied by an agent: the owner
// applies the files on launch day (docs/launch/o1/RUNBOOK.md).
//
//   node apps/quiz/e2e/o1/L1/content-sql.mjs [--data docs/anime/data] [--out docs/launch/o1/sql] [--drafts] [--team-email-domain otakuquiz.org]
//
// Writes, in --out (default docs/launch/o1/sql, or docs/launch/o1/sql-drafts with --drafts):
//   L02-K2-team-accounts   the 31 Team accounts (needs their auth users first: team-auth.mjs, same folder)
//   L04-K1-series          anime-mix and the series groups, series, arcs, characters, openings and endings
//   L05-K1-facts           entity_sources and trivia
//   L07-K2-catalogue       the quizzes (published, signed by the Team creators)
//   L08-K3-daily-bank      the daily quiz bank (drafts with no date)
//   L12-L1-sites-live      sites.status = 'live' for anime and hub (the last launch file)
// each with its .rollback.sql, plus expected-counts.json, content-verify.sql and MANIFEST.json (sha256 of every output and of the input).
//
// Which rows (default): only what the owner marked verified.
//   - facts: status 'verified' (a 'rejected' fact is never loaded, a 'draft' one only with --drafts);
//   - series, arcs, characters, openings: the rows the files mark published (series.published, row status);
//   - quizzes and daily rows: every question cites at least one fact and every cited fact is loaded.
// --drafts loads every draft fact and every row of the files, for a rehearsal on o1-dev or o1-scratch: its files say DRAFTS on
// their first line and go to sql-drafts by default. Never apply them to production.
//
// The SQL is the one of scripts/anime/k1/data-load.mjs (the loader the branches use), cut into the launch files by statement
// kind, so the production load and the branch load can never differ. A verified fact is loaded as a published trivia row
// (the loader files every fact as a draft; here the owner's verification is the approval). Idempotent upserts: a second run
// of a file changes nothing. No timestamp in the output, so the same data gives the same bytes.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MIX_SLUG, SITE, buildDataPlan, countDataPlan, countDataSql, readDataDir, readExtras, renderDataSql, sqlText,
} from '../../../../../scripts/anime/k1/data-load.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../../../../..');
export const DEFAULT_TEAM_DOMAIN = 'otakuquiz.org';
const AVATAR = { bg: '#1A1A1A', text: '#FFFFFF' };

/** The address of a Team auth user. One place, shared by this script and team-auth.mjs. */
export const teamEmail = (username, domain = DEFAULT_TEAM_DOMAIN) => `${username}@team.${domain}`;

// ------------------------------------------------------------------ selection

const isPublishedRow = (r) => r?.status === 'published';

/** Keeps what the owner verified (default) or every draft (drafts). Pure. Returns { files, extras, report }. */
export function selectData(files, extras, { drafts = false } = {}) {
  const factOk = (f) => f.status === 'verified' || (drafts && f.status === 'draft');
  const loaded = files.filter((f) => drafts || f.series?.published === true);
  const loadedSlugs = new Set(loaded.map((f) => f.slug));
  const outFiles = loaded.map((f) => ({
    ...f,
    arcs: (f.arcs ?? []).filter((r) => drafts || isPublishedRow(r)),
    characters: (f.characters ?? []).filter((r) => drafts || isPublishedRow(r)),
    themes: (f.themes ?? []).filter((r) => drafts || isPublishedRow(r)),
    facts: (f.facts ?? []).filter(factOk),
  }));
  const factIds = new Set(outFiles.flatMap((f) => f.facts.map((x) => x.id)));
  const cited = (q) => Array.isArray(q.fact_ids) && q.fact_ids.length > 0 && q.fact_ids.every((id) => factIds.has(id));
  const backed = (row) => drafts || (Array.isArray(row.questions) && row.questions.length > 0 && row.questions.every(cited));
  const quizzes = (extras.quizzes ?? []).filter((q) => loadedSlugs.has(q.group_slug) && backed(q));
  const daily = (extras.daily ?? []).filter((r) => (r.group_slug === undefined || r.group_slug === MIX_SLUG || loadedSlugs.has(r.group_slug)) && backed(r));
  const count = (list) => list.reduce((n, f) => n + f.length, 0);
  const report = {
    mode: drafts ? 'drafts' : 'verified',
    series: { total: files.length, loaded: outFiles.length },
    facts: { total: count(files.map((f) => f.facts ?? [])), loaded: count(outFiles.map((f) => f.facts)) },
    quizzes: { total: (extras.quizzes ?? []).length, loaded: quizzes.length },
    daily: { total: (extras.daily ?? []).length, loaded: daily.length },
    creators: { total: (extras.creators ?? []).length, loaded: (extras.creators ?? []).length },
  };
  return { files: outFiles, extras: { creators: extras.creators ?? [], quizzes, daily }, report };
}

// ------------------------------------------------------------------ SQL cutting

/** Splits generated SQL into statements: a newline ends one only outside a quoted string and a dollar-quoted block. */
export function splitStatements(sql) {
  const out = []; let cur = ''; let inStr = false; let tag = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (tag) {
      if (sql.startsWith(tag, i)) { cur += tag; i += tag.length - 1; tag = null; } else cur += c;
      continue;
    }
    if (inStr) { cur += c; if (c === "'") inStr = false; continue; }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) { tag = m[0]; cur += tag; i += tag.length - 1; continue; }
    }
    if (c === '\n') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const KINDS = [
  ['drop', /^(\\set |begin;$|commit;$|set local |do \$k1\$)/],
  ['groups', /^insert into public\.groups /],
  ['series', /^insert into public\.series \(/],
  ['arcs', /^(insert into|delete from) public\.arcs /],
  ['characters', /^(insert into|delete from) public\.characters /],
  ['themes', /^(insert into|delete from) public\.series_themes /],
  ['sources', /^insert into public\.entity_sources /],
  ['trivia', /^(create temp table _k1_trivia|insert into _k1_trivia |update public\.trivia t |insert into public\.trivia \(|delete from public\.trivia t )/],
  ['creators', /^(update public\.profiles p |insert into public\.editorial_accounts |insert into public\.world_memberships |update public\.sites set system_user_id)/],
  ['quizzes', /^insert into public\.quizzes /],
  ['daily', /^(create temp table _k3_bank|insert into _k3_bank |update public\.quiz_bank b |insert into public\.quiz_bank |delete from public\.quiz_bank b )/],
];

/** Groups the statements of the loader's SQL by kind, in their order. Throws on a statement it does not know (a loader change). */
export function cutByKind(sql) {
  const by = Object.fromEntries(KINDS.map(([k]) => [k, []]));
  for (const st of splitStatements(sql)) {
    const hit = KINDS.find(([, re]) => re.test(st));
    if (!hit) throw new Error(`content-sql: unknown statement from the loader: ${st.slice(0, 80)}`);
    by[hit[0]].push(st);
  }
  return by;
}

const guard = (name, cond, msg) => `do $o1l$ begin\n  if ${cond} then\n    raise exception '${name}: ${msg.replace(/'/g, "''")}';\n  end if;\nend $o1l$;`;
const siteRow = (id) => `not exists (select 1 from public.sites where id = ${sqlText(id)})`;
const noTable = (t) => `to_regclass(${sqlText(`public.${t}`)}) is null`;

const header = (name, drafts, lines) => [
  ...(drafts ? ['-- DRAFTS: a rehearsal file (every draft fact and row). Never apply it to production.'] : []),
  `-- ${name}.sql (run O1, lane L1; generated by apps/quiz/e2e/o1/L1/content-sql.mjs, do not edit by hand)`,
  '--',
  ...lines.map((l) => `-- ${l}`),
  '-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.',
  '',
  "set lock_timeout = '5s';",
  'set client_min_messages = warning;',
  '',
].join('\n');

const body = (parts) => parts.filter(Boolean).join('\n\n') + '\n';

// ------------------------------------------------------------------ the files

/** Builds every launch file from a selection. Pure: returns [{ name, sql, rollback }] and the counts. */
export function buildLaunchFiles(sel, { drafts = false, teamDomain = DEFAULT_TEAM_DOMAIN } = {}) {
  const plan = buildDataPlan(sel.files, sel.extras);
  applyTriviaStatus(plan, sel.files);
  const by = cutByKind(renderDataSql(plan));
  const slugs = plan.groups.map((g) => g.slug);
  const slugList = [...slugs, MIX_SLUG].map(sqlText).join(', ');
  const A = sqlText(SITE);
  const files = [];

  // L02 -----------------------------------------------------------------------------------------------------------
  if (plan.creators.length > 0) {
    const rows = plan.creators.map((c) => `(${sqlText(c.username)}, ${sqlText(teamEmail(c.username, teamDomain))})`).join(',\n  ');
    const t = `(values\n  ${rows}\n) as t(username, email)`;
    files.push({
      name: 'L02-K2-team-accounts',
      sql: header('L02-K2-team-accounts', drafts, [
        `What:   creates the ${plan.creators.length} Team accounts of OtakuQuiz on the anime site: a profile through create_profile_for_site (joined_via seed),`,
        '        the display name and avatar, the editorial_accounts row (the Team badge, off every board), the anime membership with its bio and',
        '        header, and sites.system_user_id (the daily quiz author) and sites.fallback_group_slug (anime-mix) of anime.',
        'Needs:  L01, 003, 009; the auth users must exist first (node apps/quiz/e2e/o1/L1/team-auth.mjs, run by the owner); the file stops with a',
        '        clear message when they do not.',
        `Rows:   ${plan.creators.length} profiles, ${plan.creators.length} editorial_accounts, ${plan.creators.length} anime memberships, 1 sites row updated.`,
        `Verify: select count(*) from public.editorial_accounts where site_id = 'anime' and active;   expect ${plan.creators.length}`,
        `Undo:   L02-K2-team-accounts.rollback.sql (refused while a Team account has a quiz).`,
      ]) + body([
        guard('L02', `${siteRow(SITE)} or ${noTable('editorial_accounts')} or ${noTable('world_memberships')}`, 'apply L01, 003 and 012 first'),
        guard('L02', "not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sites' and column_name = 'system_user_id')", 'sites.system_user_id is missing (apply 009 first)'),
        `${guard('L02', `(select count(*) from auth.users u join ${t} on u.email = t.email) <> ${plan.creators.length}`, 'the Team auth users are missing (run team-auth.mjs first)')}`,
        `select count(*) as profiles_created from (\n  select public.create_profile_for_site(t.username, ${A}, ${sqlText(AVATAR.bg)}, ${sqlText(AVATAR.text)}, 'seed', null, u.id)\n  from ${t}\n  join auth.users u on u.email = t.email\n  where not exists (select 1 from public.profiles p where p.id = u.id)\n) s;`,
        ...by.creators,
        `update public.sites set fallback_group_slug = ${sqlText(MIX_SLUG)} where id = ${A} and fallback_group_slug is null;`,
      ]),
      rollback: header('L02-K2-team-accounts.rollback', drafts, ['What:   undoes L02. Refused while a Team account has a quiz (deleting the profile would delete its quizzes).', `Note:   the auth users stay. To remove them too (owner, SQL editor): delete from auth.users where email like '%@team.${teamDomain}';`])
        + body([
          `do $o1l$ begin\n  if exists (select 1 from public.quizzes q join public.profiles p on p.id = q.creator_id where p.username in (${plan.creators.map((c) => sqlText(c.username)).join(', ')})) then\n    raise exception 'L02 rollback refused: a Team account still has quizzes; roll back L07 first';\n  end if;\nend $o1l$;`,
          `update public.sites set system_user_id = null, fallback_group_slug = null where id = ${A};`,
          `delete from public.editorial_accounts where site_id = ${A} and user_id in (select id from public.profiles where username in (${plan.creators.map((c) => sqlText(c.username)).join(', ')}));`,
          `delete from public.world_memberships where site_id = ${A} and user_id in (select id from public.profiles where username in (${plan.creators.map((c) => sqlText(c.username)).join(', ')}));`,
          `delete from public.profiles where username in (${plan.creators.map((c) => sqlText(c.username)).join(', ')});`,
        ]),
    });
  }

  // L04 -----------------------------------------------------------------------------------------------------------
  const l04 = [...by.groups, ...by.series, ...by.arcs, ...by.characters, ...by.themes];
  files.push({
    name: 'L04-K1-series',
    sql: header('L04-K1-series', drafts, [
      `What:   the anime-mix group, ${plan.groups.length} series groups, their series rows, ${plan.arcs.length} arcs, ${plan.characters.length} characters and ${plan.themes.length} openings and endings.`,
      'Needs:  L01, 011.',
      `Verify: select count(*) from public.series where group_id in (select id from public.groups where site_id = 'anime');   expect ${plan.series.length}`,
      'Undo:   L04-K1-series.rollback.sql (refused while a quiz or a reader row uses these groups).',
    ]) + body([
      guard('L04', `${siteRow(SITE)} or ${noTable('series')} or ${noTable('arcs')} or ${noTable('characters')} or ${noTable('series_themes')}`, 'apply L01 and 011 first'),
      guard('L04', `exists (select 1 from public.groups where slug in (${slugList}) and site_id <> ${A})`, 'a series slug is already a group of another site'),
      ...l04,
    ]),
    rollback: header('L04-K1-series.rollback', drafts, ['What:   undoes L04. Refused while a quiz, a bank row or a reader row uses one of the groups (roll back L08, L07 and L05 first).'])
      + body([
        `do $o1l$ begin\n  if exists (select 1 from public.quizzes where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList})))\n     or exists (select 1 from public.quiz_bank where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList})))\n     or exists (select 1 from public.trivia where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}))) then\n    raise exception 'L04 rollback refused: quizzes, bank rows or trivia still use these groups; roll back L08, L07 and L05 first';\n  end if;\nend $o1l$;`,
        `delete from public.arcs where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}));`,
        `delete from public.characters where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}));`,
        `delete from public.series_themes where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}));`,
        `delete from public.series where group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}));`,
        `delete from public.groups where site_id = ${A} and slug in (${slugList});`,
      ]),
  });

  // L05 -----------------------------------------------------------------------------------------------------------
  const srcKeys = plan.sources.map((s) => `(${sqlText(s.entity_type)}, ${sqlText(s.entity_id)}, ${sqlText(s.field)}, ${sqlText(s.source)})`);
  files.push({
    name: 'L05-K1-facts',
    sql: header('L05-K1-facts', drafts, [
      `What:   ${plan.sources.length} entity_sources rows and ${plan.trivia.length} trivia rows (${plan.trivia.filter((t) => t.status === 'published').length} published, the rest draft).`,
      'Needs:  L04.',
      `Verify: select count(*) from public.trivia where site_id = 'anime';   expect ${plan.trivia.length}`,
      'Undo:   L05-K1-facts.rollback.sql.',
    ]) + body([
      guard('L05', `(select count(*) from public.groups where site_id = ${A} and slug in (${slugList})) <> ${slugs.length + 1}`, 'the series groups are missing (apply L04 first)'),
      guard('L05', "not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'trivia' and column_name = 'site_id') or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url')", 'trivia.site_id or entity_sources.source_url is missing (apply 002a and 011 first)'),
      ...by.sources, ...by.trivia,
    ]),
    rollback: header('L05-K1-facts.rollback', drafts, ['What:   undoes L05: deletes the anime trivia of these groups and the entity_sources rows of the load.'])
      + body([
        `delete from public.trivia where site_id = ${A} and group_id in (select id from public.groups where site_id = ${A} and slug in (${slugList}));`,
        ...(srcKeys.length ? [`delete from public.entity_sources where (entity_type, entity_id, field, source) in (\n  ${srcKeys.join(',\n  ')}\n);`] : []),
      ]),
  });

  // L07 -----------------------------------------------------------------------------------------------------------
  if (plan.quizzes.length > 0) {
    const qs = plan.quizzes.map((q) => sqlText(q.slug)).join(', ');
    files.push({
      name: 'L07-K2-catalogue',
      sql: header('L07-K2-catalogue', drafts, [
        `What:   ${plan.quizzes.length} published quizzes (${plan.quizzes.reduce((n, q) => n + q.question_count, 0)} questions) on the anime site, signed by the Team creators; the spoiler level is computed from the question tags.`,
        'Needs:  L02, L04, 002d, 011.',
        `Verify: select count(*) from public.quizzes where site_id = 'anime' and status = 'published';   expect ${plan.quizzes.length}`,
        'Undo:   L07-K2-catalogue.rollback.sql (refused once a quiz has been played).',
      ]) + body([
        guard('L07', "not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quizzes' and column_name = 'spoiler_arc_ord')", 'quizzes.spoiler_arc_ord is missing (apply 011 first)'),
        guard('L07', `(select count(*) from public.profiles where username in (${[...new Set(plan.quizzes.map((q) => q.account))].map(sqlText).join(', ')})) <> ${new Set(plan.quizzes.map((q) => q.account)).size}`, 'a Team creator has no profile (apply L02 first)'),
        guard('L07', `(select count(*) from public.groups where site_id = ${A} and slug in (${slugList})) <> ${slugs.length + 1}`, 'the series groups are missing (apply L04 first)'),
        ...by.quizzes,
      ]),
      rollback: header('L07-K2-catalogue.rollback', drafts, ['What:   undoes L07. Refused while any of these quizzes has been played (that would delete readers\' data).'])
        + body([
          `do $o1l$ begin\n  if exists (select 1 from public.quizzes where site_id = ${A} and slug in (${qs}) and play_count > 0) then\n    raise exception 'L07 rollback refused: a launch quiz has been played; unpublish instead of deleting';\n  end if;\nend $o1l$;`,
          `delete from public.quizzes where site_id = ${A} and slug in (${qs});`,
        ]),
    });
  }

  // L08 -----------------------------------------------------------------------------------------------------------
  if (plan.daily.length > 0) {
    const titles = plan.daily.map((r) => sqlText(r.title.toLowerCase())).join(', ');
    files.push({
      name: 'L08-K3-daily-bank',
      sql: header('L08-K3-daily-bank', drafts, [
        `What:   ${plan.daily.length} rows of the anime daily quiz bank (${plan.daily.reduce((n, r) => n + r.questions.length, 0)} questions), status draft, no date. The owner verifies them, then the daily cron files them.`,
        'Needs:  L04, 009.',
        `Verify: select count(*) from public.quiz_bank where site_id = 'anime';   expect ${plan.daily.length}`,
        'Undo:   L08-K3-daily-bank.rollback.sql (refused once a row is scheduled or published).',
      ]) + body([
        guard('L08', "not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'quiz_bank' and column_name = 'site_id')", 'quiz_bank.site_id is missing (apply 002a first)'),
        guard('L08', `not exists (select 1 from public.groups where site_id = ${A} and slug = ${sqlText(MIX_SLUG)})`, 'the anime-mix group is missing (apply L04 first)'),
        ...by.daily,
      ]),
      rollback: header('L08-K3-daily-bank.rollback', drafts, ['What:   undoes L08. Refused while one of these rows is scheduled or already published.'])
        + body([
          `do $o1l$ begin\n  if exists (select 1 from public.quiz_bank where site_id = ${A} and lower(btrim(title)) in (${titles}) and (scheduled_date is not null or published_quiz_id is not null)) then\n    raise exception 'L08 rollback refused: a bank row is scheduled or published';\n  end if;\nend $o1l$;`,
          `delete from public.quiz_bank where site_id = ${A} and lower(btrim(title)) in (${titles});`,
        ]),
    });
  }

  // L12 -----------------------------------------------------------------------------------------------------------
  files.push({
    name: 'L12-L1-sites-live',
    sql: header('L12-L1-sites-live', drafts, [
      "What:   sets sites.status to 'live' for anime and hub. The last launch file: apply it after every other L file and the go check.",
      'Needs:  L01 to L11.',
      "Verify: select id, status from public.sites order by sort;   expect kpop live, anime live, hub live",
      'Undo:   L12-L1-sites-live.rollback.sql (back to building; no data is written by this file).',
    ]) + body([
      guard('L12', `(select count(*) from public.sites where id in ('anime', 'hub')) <> 2`, 'the anime and hub rows are missing (apply L01 first)'),
      "update public.sites set status = 'live' where id in ('anime', 'hub') and status <> 'live';",
    ]),
    rollback: header('L12-L1-sites-live.rollback', drafts, ["What:   puts anime and hub back to 'building'."])
      + body(["update public.sites set status = 'building' where id in ('anime', 'hub') and status <> 'building';"]),
  });

  return { files, counts: countDataPlan(plan), verifySql: countDataSql(plan), plan };
}

/** A verified fact is loaded as a published trivia row; a draft stays draft. The loader maps both to draft. */
function applyTriviaStatus(plan, files) {
  const want = new Map();
  for (const f of files) {
    for (const x of f.facts ?? []) {
      if (typeof x.text !== 'string' || x.entity?.kind === 'episode') continue;
      const id = x.entity.kind === 'series' ? f.slug : String(x.entity.ref);
      want.set(`${f.slug}|${x.entity.kind}|${id}|${x.text.trim().toLowerCase()}`, x.status === 'verified' ? 'published' : x.status === 'rejected' ? 'hidden' : 'draft');
    }
  }
  for (const t of plan.trivia) t.status = want.get(`${t.slug}|${t.entity_kind}|${t.entity_id}|${t.fact.trim().toLowerCase()}`) ?? t.status;
}

// ------------------------------------------------------------------ I/O

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p)); else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}

/** sha256 over the names and bytes of every json file of the data folder, in name order. */
export function hashData(dataDir) {
  const h = createHash('sha256');
  for (const p of walk(dataDir)) { h.update(relative(dataDir, p)); h.update('\0'); h.update(readFileSync(p)); h.update('\0'); }
  return h.digest('hex');
}

export function parseArgs(argv) {
  const o = { data: 'docs/anime/data', out: null, drafts: false, teamDomain: DEFAULT_TEAM_DOMAIN };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--drafts') o.drafts = true;
    else if (a === '--data') o.data = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--team-email-domain') o.teamDomain = argv[++i];
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!o.out) o.out = o.drafts ? 'docs/launch/o1/sql-drafts' : 'docs/launch/o1/sql';
  return o;
}

export function generate({ data, out, drafts, teamDomain }) {
  const dataDir = resolve(REPO, data);
  const outDir = resolve(REPO, out);
  const files = readDataDir(dataDir);
  const sel = selectData(files, readExtras(dataDir), { drafts });
  const built = buildLaunchFiles(sel, { drafts, teamDomain });
  mkdirSync(outDir, { recursive: true });
  const sha = (s) => createHash('sha256').update(s).digest('hex');
  const manifest = { mode: sel.report.mode, input_sha256: hashData(dataDir), files: [] };
  for (const f of built.files) {
    writeFileSync(join(outDir, `${f.name}.sql`), f.sql);
    writeFileSync(join(outDir, `${f.name}.rollback.sql`), f.rollback);
    manifest.files.push({ name: `${f.name}.sql`, sha256: sha(f.sql) }, { name: `${f.name}.rollback.sql`, sha256: sha(f.rollback) });
  }
  writeFileSync(join(outDir, 'content-verify.sql'), built.verifySql);
  writeFileSync(join(outDir, 'expected-counts.json'), JSON.stringify({ mode: sel.report.mode, selection: sel.report, counts: built.counts }, null, 2) + '\n');
  writeFileSync(join(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { outDir, report: sel.report, counts: built.counts, files: built.files.map((f) => f.name) };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('usage: node apps/quiz/e2e/o1/L1/content-sql.mjs [--data dir] [--out dir] [--drafts] [--team-email-domain domain]'); process.exit(0); }
    const r = generate(args);
    const shown = relative(REPO, r.outDir);
    console.log(`content-sql: mode ${r.report.mode}, wrote ${r.files.length} launch files to ${shown.startsWith('..') ? r.outDir : shown}`);
    console.log(`selection ${JSON.stringify(r.report)}`);
    console.log(`counts ${JSON.stringify(r.counts)}`);
  } catch (e) {
    console.error(`content-sql: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
