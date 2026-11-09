// L23-l1-otakudle-first-adaptation.sql and its rollback, derived from spec-l23.mjs and the view body of L18 (node scripts/anime/a2/corrections/gen.mjs).
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { FIRST_STUDIO, READ, WORK_YEAR } from './spec-l23.mjs';
import { LAUNCH, q } from './engine.mjs';

const GAME = 'otakudle';

/** The view of L18, from its create statement to the grant (the text of the file itself, so that the rollback restores exactly L18). */
export function l18View() {
  const t = readFileSync(path.join(LAUNCH, 'L18-l1-otakudle-genres.sql'), 'utf8');
  const a = t.indexOf('create or replace view public.dle_src_anime_character');
  const b = t.indexOf('grant select on table public.dle_src_anime_character to service_role;', a);
  if (a < 0 || b < 0) throw new Error('L23: the view of L18 was not found');
  return t.slice(a, b + 'grant select on table public.dle_src_anime_character to service_role;'.length);
}
export function newView() {
  const v = l18View();
  const from = '    fs.studios\n  from public.characters c';
  if (!v.includes(from)) throw new Error('L23: the studios column of the view of L18 was not found');
  return v.replace(from, '    coalesce(sf.first_studios, fs.studios) as studios\n  from public.characters c');
}

const arr = (xs) => `array[${xs.map(q).join(', ')}]::text[]`;
const srcValues = () => [
  ...WORK_YEAR.map((w) => ({ slug: w.slug, field: 'otakudle.work_year', source: w.source, ref: w.ref, url: w.url })),
  ...FIRST_STUDIO.flatMap((f) => [
    { slug: f.slug, field: 'otakudle.first_studios', source: 'wikipedia', ref: f.ref, url: f.url },
    { slug: f.slug, field: 'otakudle.anime_start_year', source: 'wikipedia', ref: f.ref, url: f.url },
  ]),
];

function afterCheck(tag) {
  return [
    `-- Nobody scheduled in the next 7 days, nor today's answer, may have stopped being a possible answer (the whole file is undone if so).`,
    `do $l23$`,
    `declare r record;`,
    `begin`,
    `  if to_regclass('public.dle_schedule') is not null and to_regclass('public.dle_games') is not null and to_regclass('public.dle_entities') is not null then`,
    `    for r in`,
    `      select s.game_id, s.entity_id, s.bank_day from public.dle_games g join public.dle_schedule s on s.game_id = g.id`,
    `      join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id`,
    `      where g.id = ${q(GAME)} and g.epoch is not null and not (e.can_be_target and e.in_pool)`,
    `        and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(0, 7) as k)`,
    `    loop`,
    `      raise exception '${tag}: entity % of % (bank day %) is scheduled in the next 7 days and is no longer a possible answer', r.entity_id, r.game_id, r.bank_day;`,
    `    end loop;`,
    `    if to_regclass('public.dle_daily_stats') is not null and exists (select 1 from public.dle_daily_stats d join public.dle_entities e on e.game_id = d.game_id and e.entity_id = d.entity_id`,
    `       where d.game_id = ${q(GAME)} and d.play_date >= public.dle_utc_date(now()) and not (e.can_be_target and e.in_pool)) then`,
    `      raise exception '${tag}: the answer served today is no longer a possible answer';`,
    `    end if;`,
    `  end if;`,
    `end $l23$;`,
  ];
}

function upBody() {
  const tag = 'L23';
  const L = [];
  L.push(
    `do $l23$ begin`,
    `  if to_regclass('public.series_facts') is null or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'series_facts' and column_name = 'work_year') then`,
    `    raise exception '${tag}: L18 must be applied first (series_facts.work_year)';`,
    `  end if;`,
    `  if (select count(*) from public.groups g join public.series_facts sf on sf.group_id = g.id where g.site_id = 'anime' and g.slug in (${[...WORK_YEAR, ...FIRST_STUDIO].map((x) => q(x.slug)).join(', ')})) <> ${WORK_YEAR.length + FIRST_STUDIO.length} then`,
    `    raise exception '${tag}: a series_facts row is missing (apply L13 first)';`,
    `  end if;`,
    `end $l23$;`,
    ``,
    `-- 1. The override of the studio: the studios of the first TV adaptation, read before the studios of L04 (which describe the later seasons too).`,
    `alter table public.series_facts add column if not exists first_studios text[] check (first_studios is null or cardinality(first_studios) between 1 and 6);`,
    ``,
    `-- 2. The view of the game: L18's, with coalesce(sf.first_studios, fs.studios).`,
    newView(),
    ``,
    `-- 3. The values, each guarded on the value L04 / L18 hold, with a self-check on the number of rows changed.`,
    `do $l23$`,
    `declare n integer; m integer;`,
    `begin`,
    `  update public.series_facts sf set work_year = v.y::smallint`,
    `  from (values ${WORK_YEAR.map((w) => `(${q(w.slug)}, ${w.year})`).join(', ')}) as v(slug, y), public.groups g`,
    `  where g.site_id = 'anime' and g.slug = v.slug and sf.group_id = g.id and sf.work_year is null;`,
    `  get diagnostics n = row_count;`,
    `  select count(*) into m from public.series_facts sf join public.groups g on g.id = sf.group_id and g.site_id = 'anime'`,
    `    join (values ${WORK_YEAR.map((w) => `(${q(w.slug)}, ${w.year})`).join(', ')}) as v(slug, y) on v.slug = g.slug where sf.work_year = v.y;`,
    `  if n > 0 and m <> ${WORK_YEAR.length} then raise exception '${tag}: work_year: % changed, % at the wanted value, expected ${WORK_YEAR.length}', n, m; end if;`,
    ``,
    `  update public.series_facts sf set first_studios = v.s`,
    `  from (values ${FIRST_STUDIO.map((f) => `(${q(f.slug)}, ${arr(f.studios)})`).join(', ')}) as v(slug, s), public.groups g`,
    `  where g.site_id = 'anime' and g.slug = v.slug and sf.group_id = g.id and sf.first_studios is null;`,
    `  get diagnostics n = row_count;`,
    `  select count(*) into m from public.series_facts sf join public.groups g on g.id = sf.group_id and g.site_id = 'anime'`,
    `    join (values ${FIRST_STUDIO.map((f) => `(${q(f.slug)}, ${arr(f.studios)})`).join(', ')}) as v(slug, s) on v.slug = g.slug where sf.first_studios = v.s;`,
    `  if n > 0 and m <> ${FIRST_STUDIO.length} then raise exception '${tag}: first_studios: % changed, % at the wanted value, expected ${FIRST_STUDIO.length}', n, m; end if;`,
    ``,
    ...FIRST_STUDIO.map((f) => `  update public.series s set anime_start_year = ${f.startNew} from public.groups g where g.id = s.group_id and g.site_id = 'anime' and g.slug = ${q(f.slug)} and s.anime_start_year = ${f.startOld};`),
    `end $l23$;`,
    ``,
    `-- 4. The sources: one row per value (Wikipedia or Fandom page, source_ref = the revision id read on ${READ}).`,
    `insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)`,
    `select 'series', s.slug, s.field, s.source, s.ref, s.url, '${READ}T00:00:00Z'::timestamptz from (values`,
    `    ${srcValues().map((s) => `(${q(s.slug)}, ${q(s.field)}, ${q(s.source)}, ${q(s.ref)}, ${q(s.url)})`).join(',\n    ')}`,
    `) as s(slug, field, source, ref, url)`,
    `on conflict (entity_type, entity_id, field, source) do update set source_ref = excluded.source_ref, source_url = excluded.source_url, fetched_at = excluded.fetched_at`,
    `where (entity_sources.source_ref, entity_sources.source_url, entity_sources.fetched_at) is distinct from (excluded.source_ref, excluded.source_url, excluded.fetched_at);`,
    ``,
    `-- The snapshot the players read.`,
    `do $l23$ begin`,
    `  if exists (select 1 from public.dle_entities where game_id = ${q(GAME)}) then perform public.dle_refresh_entities(${q(GAME)}); end if;`,
    `end $l23$;`,
    ``,
    ...afterCheck(tag),
    ``,
    `notify pgrst, 'reload schema';`,
  );
  return L.join('\n');
}

function downBody() {
  const tag = 'L23 rollback';
  const L = [];
  L.push(
    `do $l23$ begin`,
    `  if to_regclass('public.series_facts') is null then raise exception '${tag}: series_facts is missing'; end if;`,
    `end $l23$;`,
    ``,
    `-- 1. The view of L18 back (it no longer reads first_studios), then the values, then the column.`,
    l18View(),
    ``,
    `do $l23$`,
    `begin`,
    `  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'series_facts' and column_name = 'first_studios') then`,
    `    update public.series_facts sf set first_studios = null from public.groups g where g.site_id = 'anime' and g.id = sf.group_id and (g.slug, sf.first_studios) in (${FIRST_STUDIO.map((f) => `(${q(f.slug)}, ${arr(f.studios)})`).join(', ')});`,
    `  end if;`,
    `  update public.series_facts sf set work_year = null from public.groups g where g.site_id = 'anime' and g.id = sf.group_id and (g.slug, sf.work_year) in (${WORK_YEAR.map((w) => `(${q(w.slug)}, ${w.year}::smallint)`).join(', ')});`,
    ...FIRST_STUDIO.map((f) => `  update public.series s set anime_start_year = ${f.startOld} from public.groups g where g.id = s.group_id and g.site_id = 'anime' and g.slug = ${q(f.slug)} and s.anime_start_year = ${f.startNew};`),
    `end $l23$;`,
    ``,
    `delete from public.entity_sources where entity_type = 'series' and (entity_id, field, source, source_ref) in (`,
    `    ${srcValues().map((s) => `(${q(s.slug)}, ${q(s.field)}, ${q(s.source)}, ${q(s.ref)})`).join(',\n    ')});`,
    ``,
    `alter table public.series_facts drop column if exists first_studios;`,
    ``,
    `do $l23$ begin`,
    `  if exists (select 1 from public.dle_entities where game_id = ${q(GAME)}) then perform public.dle_refresh_entities(${q(GAME)}); end if;`,
    `end $l23$;`,
    ``,
    ...afterCheck(tag),
    ``,
    `notify pgrst, 'reload schema';`,
  );
  return L.join('\n');
}

export function writeL23() {
  const checked = 'Apothecary Diaries, Slime, Solo Leveling and Omniscient Reader move to the web novel; the other 46 series were checked against the same rule and keep their year: manga and light-novel series start with the serialisation or the first volume, the original anime (Code Geass, Cowboy Bebop, Evangelion) with the broadcast, and Re:Zero 2012, Sword Art Online 2002, Mob Psycho 100 2012, Steins;Gate 2009, One-Punch Man 2009 are L18\'s';
  const head = (name, what, undo) => [
    `-- ${name} (lane otkdata, run O1, audit 06 of 2026-11-08 validated by the owner on 2026-11-09; generated by scripts/anime/a2/corrections/gen.mjs from spec-l23.mjs, do not edit by hand)`,
    `--`,
    ...what,
    `-- Needs:  019, 023, L04, L13, L18 (series_facts.work_year and the view it replaced; this file replaces the view again starting from L18's text). Apply after L22 (any order works).`,
    `-- WHEN:   apply by the owner after a backup, just after 00:30 UTC, never between 23:50 and 00:30 UTC, never during a build. The file refreshes the snapshot and then reads dle_schedule for today and the next 7 days:`,
    `--         if a scheduled answer (or the answer served today) stopped being a possible answer, the file aborts and nothing is written (none is expected: only studio and year values move).`,
    undo,
    `-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing; a row that already moved to another value is left alone.`,
    ``,
    `set lock_timeout = '5s';`,
    `set client_min_messages = warning;`,
    ``,
  ];
  const what = [
    `-- What:   Otakudle studio = the studio of the first TV adaptation (D-5), year = first publication of the original work, in any form (D-6).`,
    `--         1. series_facts.first_studios text[] (nullable, additive); the view dle_src_anime_character (L18's text) reads coalesce(sf.first_studios, fs.studios), so L04's studios, which describe later seasons too, stay untouched.`,
    `--            Hunter x Hunter {Nippon Animation} (the 1999 series; the five featured characters Gon, Killua, Kurapika, Chrollo and Hisoka were Madhouse), Fruits Basket {Studio Deen} (the 2001 series; Tohru Honda was TMS Entertainment).`,
    `--         2. series.anime_start_year (L04): Hunter x Hunter 2011 -> 1999, Fruits Basket 2019 -> 2001 (guarded on the old value).`,
    `--         3. series_facts.work_year (the override L18 added): Apothecary Diaries 2011, Slime 2013, Solo Leveling 2016, Omniscient Reader 2018.`,
    `--            ${checked}.`,
    `--         4. entity_sources: one row per value (field otakudle.work_year, otakudle.first_studios, otakudle.anime_start_year), source_ref = the revision id read on ${READ}. The English Wikipedia page of The Apothecary Diaries`,
    `--            does not date the web novel, so its year rests on the Fandom page (revision 17930: since 2011 on Shosetsuka ni Naro).`,
    `--         Nothing else: no other series, no kpop row.`,
  ];
  const up = [...head('L23-l1-otakudle-first-adaptation.sql', what, `-- Undo:   L23-l1-otakudle-first-adaptation.rollback.sql (the view of L18, the old values, the sources, the column).`), upBody(), ''].join('\n');
  const down = [...head('L23-l1-otakudle-first-adaptation.rollback.sql', [`-- What:   undoes L23: the view of L18 again, the values back to null / the L04 years, the sources deleted, series_facts.first_studios dropped.`], `-- Undo:   L23-l1-otakudle-first-adaptation.sql.`), downBody(), ''].join('\n');
  return { up, down };
}
