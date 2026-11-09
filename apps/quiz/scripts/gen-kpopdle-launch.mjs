// Run O1, lane kpopdle (owner rules of 2026-11-09): writes the four launch files of audit 05 as ONE DO block each, with no temp table,
// no date guard and no 7-day precheck:
//   docs/pending-migrations/multisite/launch/L19-l1-kpopdle-data-fixes.sql        (+ .rollback.sql)
//   docs/pending-migrations/multisite/launch/L20-l1-kpopdle-view.sql              (+ .rollback.sql)
// node apps/quiz/scripts/gen-kpopdle-launch.mjs
//
// L19 removes Taeil (74) and Mark (80) from the answers NOW. The redraw of the coming days is the shared machinery of the reschedule
// helper (scripts/anime/sql/dle-reschedule.mjs, built for L21 to L23, imported here and never forked): dle_reschedule('L19', game) saves the
// whole bank and its pool_hash into dle_schedule_backup, then gives every coming day (never today, never a served date) whose entity is no
// longer a valid target another one; the rollback calls dle_reschedule_undo('L19', game) and puts the exact calendar back. L20 changes
// no target (it changes the role of unit leaders and adds the mother company of the agency), so it does not reschedule anything.
//
// The data rows (labels, positions, years, nationalities, parents) are jsonb constants declared at the top of the block and read with
// jsonb_to_recordset, so that the file needs no temp table (the Supabase SQL Editor does not always keep one from one Run to the next).
// The Verify lines of the headers are run by apps/quiz/src/lib/dle/verify-lines.test.ts on the real chain.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VIEW_020, VIEW_L20 } from './kpopdle-views.mjs';
import { rescheduleSetup } from '../../../scripts/anime/sql/dle-reschedule.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LAUNCH = path.join(ROOT, 'docs/pending-migrations/multisite/launch');
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const json = (rows) => lit(`[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]`);
const GAME = 'kpopdle-idol';

// ------------------------------------------------------------------------------------------------------------------------------------
// The data of L19 (read in production on 2026-11-08 by the audit; sources read on English Wikipedia on 2026-11-09).
// ------------------------------------------------------------------------------------------------------------------------------------
const LABELS = [
  { group_name: 'BTS', wrong: 'Columbia Records', fixed: 'BigHit Music', url: 'https://en.wikipedia.org/wiki/BTS', rev: '1383773245' },
  { group_name: 'TXT', wrong: 'Republic Records', fixed: 'BigHit Music', url: 'https://en.wikipedia.org/wiki/Tomorrow_X_Together', rev: '1383806528' },
  { group_name: 'IVE', wrong: 'Columbia Records', fixed: 'Starship Entertainment', url: 'https://en.wikipedia.org/wiki/Ive_(group)', rev: '1383782272' },
  { group_name: 'ATEEZ', wrong: 'RCA Records', fixed: 'KQ Entertainment', url: 'https://en.wikipedia.org/wiki/Ateez', rev: '1384518183' },
  { group_name: 'RIIZE', wrong: 'RCA Records', fixed: 'SM Entertainment', url: 'https://en.wikipedia.org/wiki/Riize', rev: '1383796393' },
  { group_name: 'NewJeans', wrong: 'Geffen Records', fixed: 'ADOR', url: 'https://en.wikipedia.org/wiki/NewJeans', rev: '1384548282' },
  { group_name: 'aespa', wrong: 'Capitol Records', fixed: 'SM Entertainment', url: 'https://en.wikipedia.org/wiki/Aespa', rev: '1384261942' },
];
const POS = [
  { idol_id: 7, qid: null, name: 'Jungkook', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Jung_Kook', rev: '1383784665', note: 'youngest of the 7 members by birth date (1997-09-01)' },
  { idol_id: 11, qid: null, name: 'Lisa', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Lisa_(rapper)', rev: '1384421258', note: 'youngest of BLACKPINK by birth date (1997-03-27)' },
  { idol_id: 29, qid: null, name: 'Tzuyu', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Tzuyu', rev: '1383802214', note: 'youngest of TWICE by birth date (1999-06-14)' },
  { idol_id: 33, qid: null, name: 'Ningning', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Ningning', rev: '1383794016', note: 'youngest of aespa by birth date (2002-10-23)' },
  { idol_id: 151, qid: null, name: 'Anton Lee', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Riize', rev: '1383796393', note: 'youngest of the 6 current members (birth date 2004-03-21 held in entity_sources)' },
  { idol_id: 176, qid: null, name: 'Sehun', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Sehun', rev: '1383797221', note: 'youngest of EXO by birth date (1994-04-12)' },
  { idol_id: 196, qid: null, name: 'Taemin', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Taemin', rev: '1384572525', note: 'youngest of SHINee by birth date (1993-07-18)' },
  { idol_id: null, qid: 'Q97352009', name: 'So Jung-hwan', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Treasure_(band)', rev: '1383801988', note: 'youngest of the 10 current members (birth date 2005-02-18 held in entity_sources)' },
  { idol_id: null, qid: 'Q30006465', name: 'Jongseob', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/P1Harmony', rev: '1384253679', note: 'youngest of the 6 current members (birth date 2005-11-19 held in entity_sources)' },
  { idol_id: null, qid: 'Q117818064', name: 'Park Gun-wook', tag: 'Maknae', url: 'https://en.wikipedia.org/wiki/Zerobaseone', rev: '1383804268', note: 'youngest of the current 5 (birth date 2005-01-10 held in entity_sources)' },
  { idol_id: null, qid: 'Q233371', name: 'Taeyeon', tag: 'Leader', url: 'https://en.wikipedia.org/wiki/Girls%27_Generation', rev: '1383778535', note: "the group's leader" },
  { idol_id: null, qid: 'Q97319986', name: 'Junkyu', tag: 'Leader', url: 'https://en.wikipedia.org/wiki/Treasure_(band)', rev: '1383801988', note: 'Junkyu and Asahi succeeded the leadership in 2025' },
];
const JJ = { old_wd: 'Q23772001', old_mb: '506745bd-d3e9-4844-a274-99974bef21b2', url: 'https://en.wikipedia.org/wiki/JJ_Project', rev: '1375298827', note: 'JJ Project debut single "Bounce", May 2012' };
const MINX = { old_wd: null, old_mb: '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', url: 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', rev: '1383776611', note: 'debuted as MINX in 2014' };
const YEARS = [
  { qid: 'Q491048', name: 'Jay B', old_year: 2014, new_year: 2012, ...JJ },
  { qid: 'Q492313', name: 'Jinyoung', old_year: 2014, new_year: 2012, ...JJ },
  { qid: 'Q59313184', name: 'JiU', old_year: 2017, new_year: 2014, ...MINX },
  { qid: 'Q59313270', name: 'SuA', old_year: 2017, new_year: 2014, ...MINX },
  { qid: 'Q59313326', name: 'Siyeon', old_year: 2017, new_year: 2014, ...MINX },
  { qid: 'Q59313479', name: 'Yoohyeon', old_year: 2017, new_year: 2014, ...MINX },
  { qid: 'Q59313527', name: 'Dami', old_year: 2017, new_year: 2014, ...MINX },
];
const PRC = "People's Republic of China";
const NAT = [
  { id: 33, name: 'Ningning', wrong: PRC, fixed: 'China' }, { id: 42, name: 'Jun', wrong: PRC, fixed: 'China' }, { id: 58, name: 'Yuqi', wrong: PRC, fixed: 'China' },
  { id: 89, name: 'Qian Kun', wrong: PRC, fixed: 'China' }, { id: 170, name: 'Lay', wrong: PRC, fixed: 'China' },
];
// L20: the six agencies put under HYBE.
const PARENTS = [
  { child: 'BigHit Music', url: 'https://en.wikipedia.org/wiki/BigHit_Music', rev: '1383772709', note: 'infobox parent: Hybe Corporation' },
  { child: 'Pledis Entertainment', url: 'https://en.wikipedia.org/wiki/Pledis_Entertainment', rev: '1383795753', note: 'infobox parent: Hybe Corporation, since May 2020' },
  { child: 'Source Music', url: 'https://en.wikipedia.org/wiki/Source_Music', rev: '1384475287', note: 'infobox parent: Hybe Corporation, since 2019' },
  { child: 'Belift Lab', url: 'https://en.wikipedia.org/wiki/Hybe', rev: '1384548971', note: 'wholly owned subsidiary of Hybe since 2023-09-01' },
  { child: 'ADOR', url: 'https://en.wikipedia.org/wiki/Hybe', rev: '1384548971', note: '"ADOR, Hybe\'s label for NewJeans"' },
  { child: 'YX LABELS', url: 'https://en.wikipedia.org/wiki/Hybe', rev: '1384548971', note: 'a label of Hybe Japan' },
];

const REC = {
  labels: 'jsonb_to_recordset(v_labels) as l(group_name text, wrong text, fixed text, url text, rev text)',
  pos: 'jsonb_to_recordset(v_pos) as p(idol_id integer, qid text, name text, tag text, url text, rev text, note text)',
  years: 'jsonb_to_recordset(v_years) as y(qid text, name text, old_year integer, new_year integer, old_wd text, old_mb text, url text, rev text, note text)',
  nat: 'jsonb_to_recordset(v_nat) as x(id integer, name text, wrong text, fixed text)',
  parents: 'jsonb_to_recordset(v_parents) as p(child text, url text, rev text, note text)',
};

// ------------------------------------------------------------------------------------------------------------------------------------
// Verify lines (read-only queries, run by verify-lines.test.ts on the PGlite chain; the values are true in production too).
// ------------------------------------------------------------------------------------------------------------------------------------
const HELD = `select count(*) from public.dle_schedule where game_id = '${GAME}' and entity_id in ('74', '80');`;
const FUTURE_BAD = `select count(*) from public.dle_schedule s join public.dle_games g on g.id = s.game_id join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = '${GAME}' and not (e.can_be_target and e.in_pool) and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(1, 364) as k);`;
const SAVED = `select count(*) from public.dle_schedule_backup where file = 'L19' and game_id = '${GAME}';`;
const VERIFY = {
  L19: [
    [`select count(*) from public.groups where site_id = 'kpop' and (name, record_label) in (('BTS', 'BigHit Music'), ('TXT', 'BigHit Music'), ('IVE', 'Starship Entertainment'), ('ATEEZ', 'KQ Entertainment'), ('RIIZE', 'SM Entertainment'), ('NewJeans', 'ADOR'), ('aespa', 'SM Entertainment'));`, 7, 0],
    [`select record_label from public.groups where site_id = 'kpop' and name = 'aespa';`, 'SM Entertainment', 'Capitol Records'],
    [`select count(*) from public.idols where id in (33, 42, 58, 89, 170) and nationality = 'China';`, 5, 0],
    [`select count(*) from public.idols where id in (7, 11, 29, 33, 151, 176, 196) and 'Maknae' = any(positions);`, 7, 0],
    [`select array_to_string(positions, ',') from public.idols where id = 34;`, 'Vocalist', 'Leader,Vocalist'],
    [`select string_agg(debut_year::text, ',' order by wikidata_qid) from public.idols where wikidata_qid in ('Q491048', 'Q492313', 'Q59313184', 'Q59313270', 'Q59313326', 'Q59313479', 'Q59313527');`, '2012,2012,2014,2014,2014,2014,2014', '2014,2014,2017,2017,2017,2017,2017'],
    [`select count(*) from public.dle_entities where game_id = '${GAME}' and can_be_target;`, 210, 212],
    [`select count(*) from public.dle_entities where game_id = '${GAME}' and entity_id in ('74', '80') and can_be_target;`, 0, 2],
    [HELD, 0, 4],
    [FUTURE_BAD, 0, 0],
    [SAVED, 365, 0],
  ],
  L20: [
    [`select attrs -> 'role' ->> 'v' from public.dle_src_kpop_idol where entity_id in ('43');`, 'none', 'leader'],
    [`select attrs -> 'role' ->> 'v' from public.dle_src_kpop_idol where entity_id in ('45');`, 'none', 'leader'],
    [`select attrs -> 'role' ->> 'v' from public.dle_src_kpop_idol where entity_id in ('61');`, 'leader', 'leader'],
    [`select attrs -> 'agency' ->> 'p' from public.dle_src_kpop_idol where entity_id in ('40');`, '["HYBE"]', 'NULL'],
    [`select attrs -> 'agency' ->> 'p' from public.dle_src_kpop_idol where entity_id in ('30');`, '["SM Entertainment"]', 'NULL'],
    [`select count(*) from public.agencies a join public.agencies p on p.id = a.parent_id where p.name = 'HYBE' and a.name = 'Pledis Entertainment';`, 1, 0],
    [`select count(*) from public.agencies where name = 'HYBE';`, 1, 0],
    [`select count(*) from public.dle_entities where game_id = '${GAME}' and can_be_target;`, 210, 210],
    [FUTURE_BAD, 0, 0],
  ],
};
const verifyLines = (file, dir) => VERIFY[file].map(([qy, up, down]) => `-- Verify: ${qy}   expect ${dir === 'up' ? up : down}`);

// ------------------------------------------------------------------------------------------------------------------------------------
// L19
// ------------------------------------------------------------------------------------------------------------------------------------
const l19Header = () => `-- L19-l1-kpopdle-data-fixes.sql (lane kpopdle, run O1, owner 2026-11-09; audit 05 section 5, Part A items 0 to 8 and Part B as commented blocks; generated by apps/quiz/scripts/gen-kpopdle-launch.mjs, do not edit by hand)
--
-- What:   the data corrections of the audit of Kpopdle Idol, each keyed by id and name (K1) or Wikidata QID and name (K2) AND by the exact wrong value
--         the audit read in production on 2026-11-08, so a row that holds anything else is left alone and named in a notice:
--         1. status: dle_curation excluded for Taeil (74) and Mark (80), who left NCT (they stay in idols, active, for the public pages: Part B1 decides that);
--            they leave the answers NOW (owner decision B1, 2026-11-09): the file redraws the coming days that held them, see WHEN;
--         2. agency (groups.record_label, the Korean company that formed and manages the group, never a US distribution label): BTS and TXT to BigHit Music,
--            IVE to Starship Entertainment, ATEEZ to KQ Entertainment, RIIZE and aespa to SM Entertainment, NewJeans to ADOR; the names go into public.agencies
--            (022) with the same strings so the slug matches (only the missing ones, stamped created_at 2026-11-09 00:00 UTC so the rollback deletes exactly those).
--            TWICE, Stray Kids, ITZY, (G)I-DLE, SEVENTEEN, KATSEYE and CORTIS were read in production on 2026-11-08 and are right: not in this file;
--         3. positions: Maknae added to 10 idols, Leader added to Taeyeon and Junkyu, Leader taken off Minji (NewJeans has no leader on Wikipedia). Hoshi and Woozi
--            are fixed by the view of L20, not here;
--         4. group cell: Go Won (Q58825794) gets Loossemble in idol_other_groups, like Hyunjin, Yeojin and Hyeju (Part B4 is the alternative);
--         5. debut year (the 021c rule: first official release as a member of a debuted group): Jay B and Jinyoung 2014 to 2012 (JJ Project), JiU, SuA, Siyeon,
--            Yoohyeon and Dami 2017 to 2014 (MINX);
--         6. nationality spelling: "People's Republic of China" to "China" on Ningning (33), Jun (42), Yuqi (58), Lay (170) and Qian Kun (89), the label the K2 rows
--            and the French words already use. Same fact, other spelling: their wikidata source rows stay valid and no row is added;
--         7. ASTRO groups.inception_date 2016-01-01 to 2016-02-23 (not shown by the game);
--         8. dle_refresh_entities('${GAME}') when the game has a snapshot (never dle_build_bank), then dle_reschedule('L19', '${GAME}').
--         One entity_sources row (source wikipedia, source_ref "rev <id>", source_url, fetched_at 2026-11-09 00:00 UTC) per corrected value: the revision of the
--         English Wikipedia page read on 2026-11-09. The debut-year rows of wikidata and musicbrainz that named the old year are replaced (one source per stored
--         year, as 021c does; the rollback puts them back). The old wikidata "record_label" rows of the seven groups stay.
--         Not touched: any other column, any other idol, idols.active, needs_review, dle_daily_stats.
--         Sources read on 2026-11-09 (revision ids in the rows below): https://en.wikipedia.org/wiki/ pages BTS, Ive_(group), Ateez, Riize, Tomorrow_X_Together,
--         NewJeans, Aespa, NCT_(group), Hybe, Loossemble, JJ_Project, Dreamcatcher_(group), Astro_(South_Korean_band), Girls'_Generation, Treasure_(band),
--         Zerobaseone, P1Harmony, Jung_Kook, Lisa_(rapper), Tzuyu, Ningning, Sehun, Taemin.
-- Needs:  019, 020, 021a, 021c, 021d (the K2 rows), 022 (public.agencies), 011 (entity_sources.source_url and source wikipedia).
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. Nothing waits for a date: the file
--         redraws itself the coming days (tomorrow to today + 364; never today, never a served date) whose answer it removes (Taeil and Mark), after saving the whole bank of the game in
--         dle_schedule_backup; the rollback puts that bank and the pool_hash back. Every guess is stored as an entity id and its colours are computed on read: a corrected value re-colours
--         the past days (R12 of the audit), which is wanted because the old value was wrong. The snapshot dle_entities is refreshed in the same transaction.
-- Effect: kpopquiz.org (data only, no template change): the Label line of the Verse fact rail, the about page, the group hub and the answer-first text of BTS, TXT,
--         IVE, ATEEZ, RIIZE, NewJeans and aespa; the position tags of the idols in item 3 and the nationality of the five in item 6 on their member pages; the debut
--         year of the seven in item 5 where it is read; the ASTRO debut date. Taeil and Mark stay on the member counts until Part B1.
${verifyLines('L19', 'up').join('\n')}
-- Undo:   L19-l1-kpopdle-data-fixes.rollback.sql (puts back the exact previous values, only where a row still holds the value this file wrote, and the saved calendar).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.`;

const partB = `
-- ---------------------------------------------------------------------------------------------------------------------------
-- Part B: owner decisions. Commented and guarded; nothing below runs. Each block has the recommendation of the audit.
-- ---------------------------------------------------------------------------------------------------------------------------
--
-- B1. Taeil (74) and Mark (80) inactive (as seo-m2-idols-former-members.sql did for Heeseung and Danielle). RECOMMENDED (audit): yes.
--     It also removes them from the member counts of the NCT pages and the name-all games of kpopquiz.org (public, parity). Wikipedia: Taeil departed 2024-08-28,
--     Mark departed 2026-04-08 (https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664). Same page lists WinWin (departed 2026-07-09) and Lucas (2023-05-10): the
--     read-only check docs/launch/o1/checks/V-kpopdle-members.sql tells whether they are active in the pool.
--     update public.idols set active = false, updated_at = now()
--     where ((id = 74 and name = 'Taeil') or (id = 80 and name = 'Mark')) and active;
--     insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
--     select 'idol', i.id::text, 'active', 'wikipedia', 'rev 1383941664; departed from NCT', 'https://en.wikipedia.org/wiki/NCT_(group)', timestamptz '2026-11-09 00:00:00+00'
--     from public.idols i where i.id in (74, 80) and not i.active on conflict (entity_type, entity_id, field, source) do nothing;
--
-- B2. AKMU agency (R3: current agency or the agency that formed the group). Wikipedia: AKMU left YG Entertainment in November 2025 and plans an independent label
--     (https://en.wikipedia.org/wiki/AKMU rev 1383771025, infobox label still "YG"); the new label's name is not given there, so no value is written.
--     RECOMMENDED: keep YG Entertainment with the rule "the company that formed the group" (GOT7 JYP, LOONA Blockberry Creative, BIGBANG YG stay), and state the rule in the help text.
--
-- B3. Dual nationality for the K1 idols whose group row holds one arbitrary Wikidata value (R6, S3 of the audit). RECOMMENDED: one rule, every citizenship in the English
--     Wikipedia lead or infobox, normalized labels, the pairs below only after the owner has read each page (the audit appendix lists them, this file did not verify them):
--     update public.idols set nationality = v.fixed from (values
--       (10, 'Rosé', 'New Zealand, South Korea'), (35, 'Hanni', 'Australia, Vietnam'), (50, 'Vernon', 'United States, South Korea'),
--       (69, 'Yunjin', 'United States, South Korea'), (126, 'Huening Kai', 'United States, South Korea'), (117, 'Jake', 'South Korea, Australia')
--     ) as v(id, name, fixed) where idols.id = v.id and idols.name = v.name and idols.nationality is not null and idols.nationality !~ '[,;/]' and idols.nationality <> v.fixed;
--     (Bang Chan 12, Felix 17, Joshua 41, Johnny 75 and Anton 151 also hold one value; the audit gives no second country for them.)
--
-- B4. Loossemble links (its CTDENM contract ended 2024-11-29; Wikipedia writes "was a South Korean girl group", https://en.wikipedia.org/wiki/Loossemble rev 1383791853).
--     Either keep the links and add Go Won (item 4 above, applied by default) or drop all of them. RECOMMENDED: drop, because the game compares current groups:
--     delete from public.idol_other_groups og using public.groups g where g.id = og.group_id and g.slug = 'loossemble';
--     (then run the rollback of item 4 first or in the same transaction; the rollback file restores nothing for links 021d wrote.)
--
-- B5. &TEAM generation: 089 maps "&TEAM" to 5th Gen, 021d writes 4th only when the column is empty, the published rule on the group's 2022 debut gives 4th.
--     RECOMMENDED: 4th. First read the value (select name, generation from public.groups where slug = 'team'), then:
--     update public.groups set generation = '4th generation' where slug = 'team' and generation = '5th Gen';
--
-- B6. TREASURE leaders. The audit (R-13, R-14) wants Leader off Yoon Jae-hyuk (Q98136886) and Haruto (Q97352003), because the prose says Junkyu and Asahi succeeded the
--     leadership in 2025. But the current-members list of the same page (rev 1383801988) still writes "leader" after Yoon Jae-hyuk and Haruto: Wikipedia contradicts itself,
--     so this file does not remove them (and adds Leader to Junkyu from the prose only). RECOMMENDED: keep them as they are until the page agrees, then:
--     update public.idols set positions = array_remove(positions, 'Leader') where name in ('Yoon Jae-hyuk', 'Haruto') and wikidata_qid in ('Q98136886', 'Q97352003') and 'Leader' = any(positions);
--
-- B7. The empty nationalities (6 rows in production; the audit lists Wendy 104 and Jay 116, the others are named by V-kpopdle-members.sql). Filling one can make an idol
--     complete and so a new possible answer (pool and bank change): the owner decides. Wikipedia: Wendy, "South Korean singer" born in Seoul
--     (https://en.wikipedia.org/wiki/Wendy_(singer) rev 1384573967; she grew up partly in Canada, the page names no citizenship other than South Korean). Jay (ENHYPEN):
--     no individual English Wikipedia page was reached, nothing is written. RECOMMENDED for Wendy only:
--     update public.idols set nationality = 'South Korea' where id = 104 and name = 'Wendy' and nationality is null;
`;

const refresh = `  if exists (select 1 from public.dle_entities where game_id = '${GAME}') then
    perform public.dle_refresh_entities('${GAME}');
  end if;`;

function l19() {
  return `${l19Header()}

do $o1l19$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

${rescheduleSetup()}

declare
  v_labels jsonb := ${json(LABELS)};
  v_pos jsonb := ${json(POS)};
  v_years jsonb := ${json(YEARS)};
  v_nat jsonb := ${json(NAT)};
  v_n integer;
  v_n2 integer;
  v_skipped text;
  v_raw text;
  v_ok integer;
  v_who text;
  v_under18 integer;
  c_status integer := 0;
  c_agency integer := 0;
  c_positions integer := 0;
  c_group integer := 0;
  c_debut integer := 0;
  c_nat integer := 0;
  c_astro integer := 0;
begin

  -- 0. Needs: the structure this file writes to (nothing is read from the calendar here: the file redraws it itself, at the end).
  if to_regclass('public.idols') is null or to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null
     or to_regclass('public.agencies') is null or to_regclass('public.idol_other_groups') is null or to_regclass('public.dle_curation') is null then
    raise exception 'L19: public.idols, groups, entity_sources, agencies (022), idol_other_groups (020) and dle_curation (019) must all exist';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) <> 2 then
    raise exception 'L19: idols.gender or idols.debut_year is missing (apply 021a first)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then
    raise exception 'L19: entity_sources.source_url is missing (apply 011 first)';
  end if;
  if not exists (select 1 from public.dle_games where id = '${GAME}') then
    raise exception 'L19: the game ${GAME} is missing (apply 020 first)';
  end if;

  -- 1. Status. The curation row is created, or flipped from excluded false; its weight is never touched. The note is the source.
  insert into public.dle_curation as c (game_id, entity_id, excluded, note)
  select '${GAME}', v.id::text, true, v.note
  from (values
    (74, 'Taeil', 'L19: left NCT on 2024-08-28. https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664 (read 2026-11-09)'),
    (80, 'Mark', 'L19: left NCT on 2026-04-08. https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664 (read 2026-11-09)')
  ) as v(id, name, note)
  join public.idols i on i.id = v.id and i.name = v.name
  on conflict (game_id, entity_id) do update
    set excluded = true, note = coalesce(c.note, excluded.note), updated_at = now()
    where not c.excluded;
  get diagnostics c_status = row_count;

  -- 2. Agency. The new names go into public.agencies first (the slug rule of 022, the same strings as groups.record_label).
  -- A row this file creates carries created_at 2026-11-09 00:00 UTC and the Wikipedia page of the group that names it in \`sources\`: the rollback deletes exactly those.
  insert into public.agencies (slug, name, sources, created_at)
  select distinct on (s.slug) s.slug, s.name, array[s.url], timestamptz '2026-11-09 00:00:00+00'
  from (select distinct on (l.fixed) l.fixed as name, l.url, left(btrim(regexp_replace(lower(btrim(l.fixed)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug
        from ${REC.labels} order by l.fixed, l.group_name) s
  where exists (select 1 from ${REC.labels} join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong and l.fixed = s.name)
  order by s.slug, s.name
  on conflict do nothing;
  select string_agg(distinct l.fixed, ', ') into v_skipped from ${REC.labels}
  where not exists (select 1 from public.agencies a where a.name = l.fixed)
    and exists (select 1 from public.groups g where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong);
  if v_skipped is not null then
    raise notice 'L19: agency name(s) not added (their slug is taken by another name): %', v_skipped;
  end if;

  update public.groups g set record_label = l.fixed
  from ${REC.labels}
  where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong;
  get diagnostics c_agency = row_count;

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'record_label', 'wikipedia', 'rev ' || l.rev, l.url, timestamptz '2026-11-09 00:00:00+00'
  from ${REC.labels} join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- 3. Positions. An element counts as the tag only when it is the whole element ("Performance Unit Leader" is not a leader).
  update public.idols i set positions = array_append(i.positions, p.tag)
  from ${REC.pos}
  where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
    and not exists (select 1 from unnest(i.positions) as e where e ~* ('^\\s*' || p.tag || '\\s*$'));
  get diagnostics v_n = row_count;
  -- Minji (34): NewJeans has no leader on Wikipedia. Guarded on the exact array of the roster seed, so the rollback restores it byte for byte.
  update public.idols i set positions = array['Vocalist']::text[]
  where i.id = 34 and i.name = 'Minji' and i.positions = array['Leader', 'Vocalist']::text[];
  get diagnostics v_n2 = row_count;
  c_positions := v_n + v_n2;

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', i.id::text, 'positions', 'wikipedia', 'rev ' || p.rev || '; ' || p.tag || ': ' || p.note, p.url, timestamptz '2026-11-09 00:00:00+00'
  from ${REC.pos} join public.idols i on i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
  where exists (select 1 from unnest(i.positions) as e where e ~* ('^\\s*' || p.tag || '\\s*$'))
  on conflict (entity_type, entity_id, field, source) do nothing;

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', '34', 'positions', 'wikipedia', 'rev 1384548282; NewJeans has no leader (the member list names none)', 'https://en.wikipedia.org/wiki/NewJeans', timestamptz '2026-11-09 00:00:00+00'
  from public.idols i where i.id = 34 and i.name = 'Minji' and i.positions = array['Vocalist']::text[]
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- 4. Group cell: Go Won is in Loossemble as well (Part B4 is the alternative: drop the Loossemble links). The source row is written only when this run adds the link,
  --    so the rollback removes the link only when it is this file's.
  with ins as (
    insert into public.idol_other_groups (idol_id, group_id)
    select i.id, g2.id
    from public.idols i join public.groups g2 on g2.slug = 'loossemble'
    where i.wikidata_qid = 'Q58825794' and i.name = 'Go Won'
    on conflict do nothing
    returning idol_id
  ), src as (
    insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
    select 'idol', ins.idol_id::text, 'group', 'wikipedia', 'rev 1383791853; Loossemble lists Go Won as a member', 'https://en.wikipedia.org/wiki/Loossemble', timestamptz '2026-11-09 00:00:00+00'
    from ins
    on conflict (entity_type, entity_id, field, source) do nothing
    returning 1
  )
  select count(*) into c_group from ins;

  -- 5. Debut years. The rows of the old year in entity_sources (refs known from 021d) are replaced by the wikipedia row.
  update public.idols i set debut_year = y.new_year
  from ${REC.years}
  where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.old_year;
  get diagnostics c_debut = row_count;

  -- One source row per stored year: the rows 021d wrote for the old year (the exact refs) go, the wikipedia row comes.
  delete from public.entity_sources e
  using ${REC.years}, public.idols i
  where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
    and e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year'
    and ((e.source = 'wikidata' and e.source_ref = y.old_wd) or (e.source = 'musicbrainz' and e.source_ref = y.old_mb));

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'idol', i.id::text, 'debut_year', 'wikipedia', 'rev ' || y.rev || '; ' || y.note, y.url, timestamptz '2026-11-09 00:00:00+00'
  from ${REC.years} join public.idols i on i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- 6. Nationality spelling. Same fact, the label the K2 rows and COUNTRY_FR use.
  update public.idols i set nationality = x.fixed
  from ${REC.nat}
  where i.id = x.id and i.name = x.name and i.nationality = x.wrong;
  get diagnostics c_nat = row_count;
  -- Raw Wikidata labels left on an active idol are named, not guessed.
  select string_agg(i.id::text || ' ' || i.name || ' (' || i.nationality || ')', ', ' order by i.id) into v_raw
  from public.idols i
  where i.active and i.nationality ~ '(People''s Republic of China|United States of America|Republic of Korea)';
  if v_raw is not null then
    raise notice 'L19: active idol(s) still on a raw Wikidata country label, left as they are: %', v_raw;
  end if;

  -- 7. ASTRO inception_date (not read by the game; the Verse debut line of /verse/astro).
  update public.groups set inception_date = date '2016-02-23'
  where name = 'ASTRO' and site_id = 'kpop' and inception_date = date '2016-01-01';
  get diagnostics c_astro = row_count;

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'inception_date', 'wikipedia', 'rev 1382319710; debut EP "Spring Up" released 2016-02-23', 'https://en.wikipedia.org/wiki/Astro_(South_Korean_band)', timestamptz '2026-11-09 00:00:00+00'
  from public.groups g where g.name = 'ASTRO' and g.site_id = 'kpop' and g.inception_date = date '2016-02-23'
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- 8. The snapshot the players read, when the game already has one (otherwise the activation takes it). Never dle_build_bank here.
${refresh}

  -- 9. Redraw the coming days that hold an entity the data change removed from the answers (Taeil, Mark): never today, never a served date; the bank is saved first.
  perform public.dle_reschedule('L19', '${GAME}');

  -- Self-check. Every item is either in its fixed state or named in a notice (its guard did not match: another value, another name, a row gone).
  if c_status > 2 then raise exception 'L19: status changed % row(s), at most 2 expected', c_status; end if;
  if c_agency > ${LABELS.length} then raise exception 'L19: agency changed % row(s), at most ${LABELS.length} expected', c_agency; end if;
  if c_positions > ${POS.length + 1} then raise exception 'L19: positions changed % row(s), at most ${POS.length + 1} expected', c_positions; end if;
  if c_group > 1 then raise exception 'L19: group-cell changed % row(s), at most 1 expected', c_group; end if;
  if c_debut > ${YEARS.length} then raise exception 'L19: debut changed % row(s), at most ${YEARS.length} expected', c_debut; end if;
  if c_nat > ${NAT.length} then raise exception 'L19: nationality changed % row(s), at most ${NAT.length} expected', c_nat; end if;
  if c_astro > 1 then raise exception 'L19: astro changed % row(s), at most 1 expected', c_astro; end if;

  select count(*) into v_ok from public.dle_curation where game_id = '${GAME}' and entity_id in ('74', '80') and excluded;
  if v_ok = 0 then raise exception 'L19: neither Taeil (74) nor Mark (80) is excluded (rows missing or renamed?)'; end if;
  select string_agg(v.id::text, ', ') into v_who from (values ('74'), ('80')) as v(id)
    where not exists (select 1 from public.dle_curation where game_id = '${GAME}' and entity_id = v.id and excluded);
  if v_who is not null then raise notice 'L19 status: id(s) % not excluded (row gone or renamed)', v_who; end if;
  if exists (select 1 from public.dle_entities where game_id = '${GAME}' and entity_id in ('74', '80') and can_be_target) then
    raise exception 'L19: Taeil or Mark is still a target after the refresh';
  end if;
  if exists (select 1 from public.dle_schedule s join public.dle_games g on g.id = s.game_id
             where s.game_id = '${GAME}' and s.entity_id in ('74', '80') and s.bank_day <> public.dle_bank_day(g.epoch, public.dle_utc_date(now()))
               and not exists (select 1 from public.dle_daily_stats d where d.game_id = s.game_id and public.dle_bank_day(g.epoch, d.play_date) = s.bank_day and d.play_date >= public.dle_utc_date(now()))) then
    raise exception 'L19: Taeil or Mark is still scheduled on a coming day after the redraw';
  end if;

  select count(*) into v_ok from ${REC.labels} join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed;
  if v_ok = 0 then raise exception 'L19: no agency holds a corrected label (wrong database?)'; end if;
  select string_agg(l.group_name, ', ') into v_who from ${REC.labels}
    where not exists (select 1 from public.groups g where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed);
  if v_who is not null then raise notice 'L19 agency: group(s) % not corrected (they hold another label than the audited one, or are gone)', v_who; end if;
  if exists (select 1 from ${REC.labels} join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed
             where not exists (select 1 from public.agencies a where a.name = l.fixed)) then
    raise notice 'L19 agency: a corrected label has no public.agencies row (slug taken)';
  end if;

  select count(*) into v_ok from ${REC.pos} join public.idols i on i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
    where exists (select 1 from unnest(i.positions) as e where e ~* ('^\\s*' || p.tag || '\\s*$'));
  if v_ok = 0 then raise exception 'L19: no position tag was written or found (wrong database?)'; end if;
  select string_agg(p.name, ', ') into v_who from ${REC.pos}
    where not exists (select 1 from public.idols i where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
      and exists (select 1 from unnest(i.positions) as e where e ~* ('^\\s*' || p.tag || '\\s*$')));
  if v_who is not null then raise notice 'L19 positions: % not set (row gone or renamed)', v_who; end if;
  if exists (select 1 from public.idols where id = 34 and name = 'Minji' and positions <> array['Vocalist']::text[]) then
    raise notice 'L19 positions: Minji (34) keeps her roster positions (not the audited array)';
  end if;

  select string_agg(y.name, ', ') into v_who from ${REC.years}
    where not exists (select 1 from public.idols i where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year);
  if v_who is not null then raise notice 'L19 debut: % not corrected (another year, another name, or a row gone)', v_who; end if;
  if (select count(*) from ${REC.years} join public.idols i on i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
        where (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year') <> 1) > 0 then
    raise exception 'L19: a corrected debut year does not keep exactly one entity_sources row';
  end if;

  select string_agg(x.name, ', ') into v_who from ${REC.nat} where not exists (select 1 from public.idols i where i.id = x.id and i.name = x.name and i.nationality = x.fixed);
  if v_who is not null then raise notice 'L19 nationality: % not normalized (another value, or renamed)', v_who; end if;

  select count(*) into v_under18 from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if v_under18 > 0 then
    raise exception 'L19: % active idol(s) are under 18', v_under18;
  end if;

  notify pgrst, 'reload schema';
end;
end $o1l19$;
${partB}`;
}

function l19Rollback() {
  return `-- L19-l1-kpopdle-data-fixes.rollback.sql (lane kpopdle, run O1): undoes L19-l1-kpopdle-data-fixes.sql (generated by apps/quiz/scripts/gen-kpopdle-launch.mjs, do not edit by hand).
--
-- What:   puts back the exact previous values of the audit, each only where the row still holds the value L19 wrote (a row changed since is left alone):
--         the curation of Taeil (74) and Mark (80), the seven groups.record_label, the position tags, Minji's roster positions, the Go Won link to Loossemble, the seven
--         debut years and their wikidata / musicbrainz source rows (fetched_at 2026-11-02 12:00 UTC like 021d), the five nationality labels, the ASTRO inception_date;
--         deletes the entity_sources rows of source wikipedia stamped 2026-11-09 00:00 UTC for those values; refreshes the snapshot of ${GAME}.
--         Deletes the public.agencies rows L19 created (stamped created_at 2026-11-09 00:00 UTC: BigHit Music, Starship Entertainment, KQ Entertainment, ADOR,
--         SM Entertainment, whichever were missing); a row that existed before L19 stays. Removes the Go Won link only when L19 added it.
--         Then dle_reschedule_undo('L19', '${GAME}') puts the saved bank (365 days) and the pool_hash back, except today and the served dates, and deletes the saved rows.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. Nothing waits for a date.
--         Taeil and Mark are answers again, on the days they held before L19.
${verifyLines('L19', 'down').join('\n')}
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent.

do $o1l19r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

${rescheduleSetup()}

  -- 1. Curation: our own row (marker note, default weight) goes; a row that was there before keeps its weight and gets its flag back.
  delete from public.dle_curation
  where game_id = '${GAME}' and entity_id in ('74', '80') and excluded and weight = 1 and note like 'L19: left NCT%';
  update public.dle_curation set excluded = false, note = null, updated_at = now()
  where game_id = '${GAME}' and entity_id in ('74', '80') and excluded and note like 'L19: left NCT%';

  -- 2. Agency.
  update public.groups g set record_label = v.wrong
  from (values
    ('BTS', 'Columbia Records', 'BigHit Music'), ('TXT', 'Republic Records', 'BigHit Music'), ('IVE', 'Columbia Records', 'Starship Entertainment'),
    ('ATEEZ', 'RCA Records', 'KQ Entertainment'), ('RIIZE', 'RCA Records', 'SM Entertainment'), ('NewJeans', 'Geffen Records', 'ADOR'),
    ('aespa', 'Capitol Records', 'SM Entertainment')
  ) as v(name, wrong, fixed)
  where g.name = v.name and g.site_id = 'kpop' and g.record_label = v.fixed;

  -- 3. Positions.
  update public.idols i set positions = array_remove(i.positions, p.tag)
  from (values
    (7, null, 'Jungkook', 'Maknae'), (11, null, 'Lisa', 'Maknae'), (29, null, 'Tzuyu', 'Maknae'), (33, null, 'Ningning', 'Maknae'),
    (151, null, 'Anton Lee', 'Maknae'), (176, null, 'Sehun', 'Maknae'), (196, null, 'Taemin', 'Maknae'),
    (null, 'Q97352009', 'So Jung-hwan', 'Maknae'), (null, 'Q30006465', 'Jongseob', 'Maknae'), (null, 'Q117818064', 'Park Gun-wook', 'Maknae'),
    (null, 'Q233371', 'Taeyeon', 'Leader'), (null, 'Q97319986', 'Junkyu', 'Leader')
  ) as p(idol_id, qid, name, tag)
  where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid)) and p.tag = any(i.positions);
  update public.idols set positions = array['Leader', 'Vocalist']::text[]
  where id = 34 and name = 'Minji' and positions = array['Vocalist']::text[];

  -- 4. Go Won leaves Loossemble again, only when L19 added that link (its wikipedia source row exists; a link that was there before has none).
  delete from public.idol_other_groups og
  using public.idols i, public.groups g2
  where i.wikidata_qid = 'Q58825794' and i.name = 'Go Won' and g2.slug = 'loossemble' and og.idol_id = i.id and og.group_id = g2.id
    and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'group' and e.source = 'wikipedia'
      and e.fetched_at = timestamptz '2026-11-09 00:00:00+00');

  -- 5. Debut years, then the source rows of the old years (the refs 021d wrote).
  update public.idols i set debut_year = y.old_year
  from (values
    ('Q491048', 'Jay B', 2014, 2012), ('Q492313', 'Jinyoung', 2014, 2012), ('Q59313184', 'JiU', 2017, 2014), ('Q59313270', 'SuA', 2017, 2014),
    ('Q59313326', 'Siyeon', 2017, 2014), ('Q59313479', 'Yoohyeon', 2017, 2014), ('Q59313527', 'Dami', 2017, 2014)
  ) as y(qid, name, old_year, new_year)
  where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year;

  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
  select 'idol', i.id::text, 'debut_year', s.source, s.source_ref, timestamptz '2026-11-02 12:00:00+00'
  from (values
    ('Q491048', 'wikidata', 'Q23772001'), ('Q491048', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
    ('Q492313', 'wikidata', 'Q23772001'), ('Q492313', 'musicbrainz', '506745bd-d3e9-4844-a274-99974bef21b2'),
    ('Q59313184', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'), ('Q59313270', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
    ('Q59313326', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'), ('Q59313479', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de'),
    ('Q59313527', 'musicbrainz', '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de')
  ) as s(qid, source, source_ref)
  join public.idols i on i.wikidata_qid = s.qid
  where i.debut_year in (2014, 2017) and exists (
      select 1 from public.entity_sources w where w.entity_type = 'idol' and w.entity_id = i.id::text and w.field = 'debut_year' and w.source = 'wikipedia'
        and w.fetched_at = timestamptz '2026-11-09 00:00:00+00')
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- 6. Nationality labels.
  update public.idols i set nationality = w.wrong
  from (values
    (33, 'Ningning'), (42, 'Jun'), (58, 'Yuqi'), (89, 'Qian Kun'), (170, 'Lay')
  ) as x(id, name)
  cross join (select 'People''s Republic of China'::text as wrong) w
  where i.id = x.id and i.name = x.name and i.nationality = 'China';

  -- 7. ASTRO.
  update public.groups set inception_date = date '2016-01-01'
  where name = 'ASTRO' and site_id = 'kpop' and inception_date = date '2016-02-23';

  -- 8. The wikipedia source rows of L19 (the stamp tells which are ours).
  delete from public.entity_sources e
  where e.source = 'wikipedia' and e.fetched_at = timestamptz '2026-11-09 00:00:00+00' and (
       (e.entity_type = 'group' and e.field in ('record_label', 'inception_date'))
    or (e.entity_type = 'idol' and e.field in ('positions', 'group', 'debut_year')));

  -- 9. The agency rows L19 created (stamped), unless one has a child. A row that existed before has another created_at and stays.
  delete from public.agencies a
  where a.created_at = timestamptz '2026-11-09 00:00:00+00' and a.name in ('BigHit Music', 'Starship Entertainment', 'KQ Entertainment', 'ADOR', 'SM Entertainment')
    and not exists (select 1 from public.agencies c where c.parent_id = a.id);

  -- 10. The snapshot, then the calendar as it was saved (the pool_hash with it), then the snapshot again now that the calendar is back.
${refresh}
  perform public.dle_reschedule_undo('L19', '${GAME}');
${refresh}

  notify pgrst, 'reload schema';
end $o1l19r$;
`;
}

// ------------------------------------------------------------------------------------------------------------------------------------
// L20
// ------------------------------------------------------------------------------------------------------------------------------------
const oldFile = (name) => readFileSync(path.join(LAUNCH, name), 'utf8');

const l20Header = () => `-- L20-l1-kpopdle-view.sql (lane kpopdle, run O1, owner 2026-11-09; audit 05 Part C items 1 and 2, rules R1, R4 and R13; generated by apps/quiz/scripts/gen-kpopdle-launch.mjs, do not edit by hand)
--
-- What:   (1) leader and maknae are read as WHOLE elements of idols.positions (R4): "Performance Unit Leader" and "Vocal Unit Leader" (Hoshi, Woozi) are no longer
--             leaders; "Leader" and "Maknae" still are. \`create or replace view public.dle_src_kpop_idol\`, 020's body with three changes, same columns, same grants;
--         (2) the agency column gets a mother company \`p\` (R1): the name of the parent in public.agencies (022), or the agency's own name when it has none, so two labels
--             of one group (BigHit Music and Pledis Entertainment, both HYBE) are Close and HYBE against SM Entertainment is Wrong. The 6 parent rows are set here (below),
--             each with its Wikipedia URL in agencies.sources (entity_sources does not accept the type agency);
--         (3) public.agencies: the parent HYBE (slug hybe) and the 6 children BigHit Music, Pledis Entertainment, Source Music, Belift Lab, ADOR and YX LABELS get their
--             parent_id, only where it is null today. Names are the strings of groups.record_label so the join and the slug match.
--         Sources read on 2026-11-09 (English Wikipedia, revision ids): Hybe 1384548971 (Pledis since 2020, Belift Lab since 2023-09-01, ADOR "Hybe's label for NewJeans", Hybe Japan
--         with YX Labels), BigHit_Music 1383772709 (parent Hybe Corporation), Pledis_Entertainment 1383795753 ("parent = Hybe Corporation, since May 2020"), Source_Music
--         1384475287 ("parent = Hybe Corporation, since 2019"). Not mapped, no source read: KATSEYE's "Hybe UMG", Starship (Kakao), WakeOne (CJ ENM): left without parent, so
--         their agency is Close to nothing but itself.
--         The agency help in copy.ts ("Close if same parent company") is true only once this file is applied: it ships in the same PR and the owner applies it right after the merge.
--         The role cell has no Close (R13): its \`near\` text is removed from copy.ts.
--         The game stays complete for every idol: no value of any column is added or removed, only \`p\` on agency and the role of unit leaders, so no entity enters or
--         leaves the targets and no scheduled answer changes: the file redraws nothing (the Verify lines below prove that no coming day holds a non-valid target).
--         Past days' colours are recomputed on read: a guess of the agency of one HYBE label against another turns from Wrong to Close, a unit leader's Leader cell from Right to Wrong.
-- Needs:  019, 020, 022 (public.agencies). Independent of L19, in any order.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it (a game in progress shows the new colours at once).
-- Effect: kpopquiz.org: nothing (the view is closed to the browser roles and read by the dle functions only). public.agencies is read by no public page.
${verifyLines('L20', 'up').join('\n')}
-- Undo:   L20-l1-kpopdle-view.rollback.sql (020's view body byte for byte; the parent rows back to null).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.`;

function l20(view) {
  return `${l20Header()}

do $o1l20$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

declare
  v_parents jsonb := ${json(PARENTS)};
  v_hybe bigint;
  v_n integer;
  v_missing text;
  v_def text;
begin
  if to_regclass('public.agencies') is null or to_regclass('public.dle_src_kpop_idol') is null or to_regclass('public.entity_sources') is null then
    raise exception 'L20: public.agencies (022) and public.dle_src_kpop_idol (020) must exist';
  end if;

  -- The parent and the children, by the name written in groups.record_label (the slug rule of 022). A name already there is kept as it is.
  insert into public.agencies (slug, name, sources, created_at) values ('hybe', 'HYBE', array['https://en.wikipedia.org/wiki/Hybe'], timestamptz '2026-11-09 00:00:01+00')
  on conflict do nothing;
  select id into v_hybe from public.agencies where name = 'HYBE';
  if v_hybe is null then
    raise exception 'L20: the slug hybe is taken by another agency name; nothing was changed';
  end if;

  insert into public.agencies (slug, name, created_at)
  select distinct on (s.slug) s.slug, s.name, timestamptz '2026-11-09 00:00:01+00'
  from (select p.child as name, left(btrim(regexp_replace(lower(btrim(p.child)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug from ${REC.parents}
        where exists (select 1 from public.groups g where btrim(g.record_label) = p.child)) s
  order by s.slug, s.name
  on conflict do nothing;

  update public.agencies a set parent_id = v_hybe,
    sources = case when cardinality(a.sources) = 0 then array[p.url] else a.sources end
  from ${REC.parents}
  where a.name = p.child and a.parent_id is null and a.id <> v_hybe;
  get diagnostics v_n = row_count;

  select string_agg(p.child, ', ') into v_missing from ${REC.parents}
  where exists (select 1 from public.groups g where btrim(g.record_label) = p.child)
    and not exists (select 1 from public.agencies a where a.name = p.child and a.parent_id = v_hybe);
  if v_missing is not null then
    raise notice 'L20: agency(ies) % not under HYBE (slug taken by another name, or another parent already set)', v_missing;
  end if;
  raise notice 'L20: % agency row(s) put under HYBE', v_n;

${view}

  revoke all on table public.dle_src_kpop_idol from public, anon, authenticated;
  grant select on table public.dle_src_kpop_idol to service_role;

  -- The snapshot the players read, when the game already has one (otherwise the activation takes it). Never dle_build_bank here.
${refresh}

  -- Self-check: the view keeps the 020 contract and holds the three changes.
  v_def := pg_get_viewdef('public.dle_src_kpop_idol'::regclass);
  if has_table_privilege('anon', 'public.dle_src_kpop_idol', 'select') or has_table_privilege('authenticated', 'public.dle_src_kpop_idol', 'select') then
    raise exception 'L20: dle_src_kpop_idol is readable by a browser role';
  end if;
  if v_def ~ '(height_cm|mbti|blood_type)' then
    raise exception 'L20: dle_src_kpop_idol names a private column';
  end if;
  if v_def !~ 'ap\\.name' or v_def ~ 'mleader' then
    raise exception 'L20: the view does not hold the new agency parent or still matches a leader inside a word';
  end if;
  if exists (select 1 from public.agencies a join public.agencies p on p.id = a.parent_id where p.parent_id is not null) then
    raise exception 'L20: an agency parent has a parent itself (only one level is read)';
  end if;

  notify pgrst, 'reload schema';
end;
end $o1l20$;
`;
}

function l20Rollback(view020, oldRollbackTail) {
  return `-- L20-l1-kpopdle-view.rollback.sql (lane kpopdle, run O1): undoes L20-l1-kpopdle-view.sql (generated by apps/quiz/scripts/gen-kpopdle-launch.mjs, do not edit by hand).
--
-- What:   puts 020's view body back byte for byte (the \`\\mleader\\M\` roles, the agency without \`p\`), takes the 6 agencies out from under HYBE (only where the parent is
--         HYBE), resets their \`sources\` where they hold exactly the URL L20 wrote, deletes the HYBE row when it has no child left and still holds its own source, refreshes the snapshot. Deletes the agency rows L20 created (stamped created_at 2026-11-09 00:00:01 UTC) that have no child. No calendar change: L20 redraws nothing.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. After this rollback the agency help of copy.ts ("Close if same parent company") is no longer true.
${verifyLines('L20', 'down').join('\n')}
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent.

do $o1l20r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

${view020}

  revoke all on table public.dle_src_kpop_idol from public, anon, authenticated;
  grant select on table public.dle_src_kpop_idol to service_role;

${oldRollbackTail}

  notify pgrst, 'reload schema';
end $o1l20r$;
`;
}

// ------------------------------------------------------------------------------------------------------------------------------------
const ROLLBACK_TAIL = `  update public.agencies a set parent_id = null,
    sources = case when a.sources = array[p.url] then '{}'::text[] else a.sources end
  from (values
    ('BigHit Music', 'https://en.wikipedia.org/wiki/BigHit_Music'), ('Pledis Entertainment', 'https://en.wikipedia.org/wiki/Pledis_Entertainment'),
    ('Source Music', 'https://en.wikipedia.org/wiki/Source_Music'), ('Belift Lab', 'https://en.wikipedia.org/wiki/Hybe'),
    ('ADOR', 'https://en.wikipedia.org/wiki/Hybe'), ('YX LABELS', 'https://en.wikipedia.org/wiki/Hybe')
  ) as p(name, url)
  where a.name = p.name and a.parent_id = (select h.id from public.agencies h where h.name = 'HYBE');

  delete from public.agencies a
  where a.created_at = timestamptz '2026-11-09 00:00:01+00'
    and a.name in ('HYBE', 'BigHit Music', 'Pledis Entertainment', 'Source Music', 'Belift Lab', 'ADOR', 'YX LABELS')
    and not exists (select 1 from public.agencies c where c.parent_id = a.id);

${refresh}`;

const write = (name, text) => writeFileSync(path.join(LAUNCH, name), text);
write('L19-l1-kpopdle-data-fixes.sql', l19());
write('L19-l1-kpopdle-data-fixes.rollback.sql', l19Rollback());
write('L20-l1-kpopdle-view.sql', l20(VIEW_L20));
write('L20-l1-kpopdle-view.rollback.sql', l20Rollback(VIEW_020, ROLLBACK_TAIL));
