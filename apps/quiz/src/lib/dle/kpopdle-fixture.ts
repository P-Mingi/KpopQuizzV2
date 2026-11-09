// Lane kpopdle: the Kpopdle Idol database as production holds it before L19 and L20 (2026-11-08 read), on PGlite: the real files 011, 018, 019, 020,
// 021a, 021c, 021b, 022, 021d, 021e, the K1 rows of the audit (ids and names), and filler idols so that the game has 212 possible answers like production.
import { afterSessionG } from './otakudle-fixture';
import { one, readMigration } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';


// idol id -> QID, as 021a lists them (so 021a really fills gender and debut for the seeded rows).
export const QID_021A = new Map<number, string>([...readMigration('021a-k1-idol-gender-debut.sql').matchAll(/^\s*\((\d+), '(Q\d+)', '(?:female|male)', (?:\d{4}|null)\)/gm)].map((m) => [Number(m[1]), m[2]!]));
const QID_021D = new Map<number, string>([...readMigration('021d-k2-idols.sql').matchAll(/^\s*\((\d+), '(Q\d+)'\)[,;]?$/gm)].map((m) => [Number(m[1]), m[2]!]));
const ACTIVATION = [82, 89, 133, 143, 144, 145, 148, 151, 152, 153, 163];

// [slug, name, label, generation]: the K1 groups as production holds them on 2026-11-08 (labels read by the audit).
const K1_GROUPS: [string, string, string | null, string][] = [
  ['bts', 'BTS', 'Columbia Records', '3rd Gen'], ['blackpink', 'BLACKPINK', 'YG Entertainment', '3rd Gen'], ['twice', 'TWICE', 'JYP Entertainment', '3rd Gen'],
  ['aespa', 'aespa', 'Capitol Records', '4th Gen'], ['newjeans', 'NewJeans', 'Geffen Records', '4th Gen'], ['seventeen', 'SEVENTEEN', 'Pledis Entertainment', '3rd Gen'],
  ['gidle', '(G)I-DLE', 'Cube Entertainment', '4th Gen'], ['nct', 'NCT', 'SM Entertainment', '3rd Gen'], ['riize', 'RIIZE', 'RCA Records', '5th Gen'],
  ['exo', 'EXO', 'SM Entertainment', '3rd Gen'], ['shinee', 'SHINee', 'SM Entertainment', '2nd Gen'], ['txt', 'TXT', 'Republic Records', '4th Gen'],
  ['ive', 'IVE', 'Columbia Records', '4th Gen'], ['ateez', 'ATEEZ', 'RCA Records', '4th Gen'], ['kep1er', 'Kep1er', 'WakeOne', '4th Gen'],
  ['babymonster', 'BABYMONSTER', 'YG Entertainment', '5th Gen'], ['fifty-fifty', 'FIFTY FIFTY', null, '4th Gen'],
];
// The 18 K2 groups (empty, 021d fills them) and the two other groups of the LOONA members.
const K2_GROUPS: [string, string][] = [
  ['loona', 'LOONA'], ['got7', 'GOT7'], ['monsta-x', 'MONSTA X'], ['girls-generation', 'Girls\' Generation'], ['zerobaseone', 'ZEROBASEONE'], ['mamamoo', 'MAMAMOO'],
  ['bigbang', 'BIGBANG'], ['katseye', 'KATSEYE'], ['illit', 'ILLIT'], ['treasure', 'TREASURE'], ['dreamcatcher', 'Dreamcatcher'], ['tws', 'TWS'], ['p1harmony', 'P1Harmony'],
  ['cortis', 'CORTIS'], ['hearts2hearts', 'Hearts2Hearts'], ['team', '&TEAM'], ['akmu', 'AKMU'], ['astro', 'ASTRO'], ['artms', 'ARTMS'], ['loossemble', 'Loossemble'],
];
// [id, name, group slug, birth date, nationality, positions, active]: the K1 rows of the audit, at the values production holds (positions from the roster seed).
const K1_IDOLS: [number, string, string, string, string, string[], boolean][] = [
  [1, 'RM', 'bts', '1994-09-12', 'South Korea', ['Leader', 'Rapper'], true], [7, 'Jungkook', 'bts', '1997-09-01', 'South Korea', ['Main Vocalist', 'Center'], true],
  [11, 'Lisa', 'blackpink', '1997-03-27', 'Thailand', ['Main Dancer', 'Lead Rapper'], true], [29, 'Tzuyu', 'twice', '1999-06-14', 'Taiwan', ['Lead Dancer'], true],
  [30, 'Karina', 'aespa', '2000-04-11', 'South Korea', ['Leader', 'Dancer'], true], [33, 'Ningning', 'aespa', '2002-10-23', 'People\'s Republic of China', ['Vocalist'], true],
  [34, 'Minji', 'newjeans', '2004-05-07', 'South Korea', ['Leader', 'Vocalist'], true], [40, 'Jeonghan', 'seventeen', '1995-10-04', 'South Korea', ['Vocalist'], true],
  [42, 'Jun', 'seventeen', '1996-06-10', 'People\'s Republic of China', ['Performance Unit Main Dancer'], true],
  [43, 'Hoshi', 'seventeen', '1996-06-15', 'South Korea', ['Performance Unit Leader', 'Main Dancer'], true],
  [45, 'Woozi', 'seventeen', '1996-11-22', 'South Korea', ['Vocal Unit Leader', 'Lead Vocalist'], true],
  [58, 'Yuqi', 'gidle', '1999-09-23', 'People\'s Republic of China', ['Vocalist'], true],
  [61, 'Yujin', 'ive', '2003-09-01', 'South Korea', ['Leader'], true], [74, 'Taeil', 'nct', '1994-06-14', 'South Korea', ['Vocalist'], true],
  [80, 'Mark', 'nct', '1999-08-02', 'Canada', ['Rapper'], true], [107, 'Hongjoong', 'ateez', '1998-11-07', 'South Korea', ['Leader'], true],
  [122, 'Soobin', 'txt', '2000-12-05', 'South Korea', ['Leader'], true], [170, 'Lay', 'exo', '1991-10-07', 'People\'s Republic of China', ['Vocalist'], true],
  [176, 'Sehun', 'exo', '1994-04-12', 'South Korea', ['Rapper'], true], [196, 'Taemin', 'shinee', '1993-07-18', 'South Korea', ['Main Vocalist'], true],
  // The 11 rows 021d activates (inactive, waiting for review).
  [82, 'Ten', 'nct', '1996-02-27', 'Thailand', [], false], [89, 'Qian Kun', 'nct', '1996-01-01', 'People\'s Republic of China', [], false],
  [133, 'Kim Chae-hyun', 'kep1er', '2002-08-13', 'South Korea', [], false], [143, 'Pharita', 'babymonster', '2005-08-26', 'Thailand', [], false],
  [144, 'Asa', 'babymonster', '2006-04-17', 'Japan', [], false], [145, 'Rami', 'babymonster', '2007-10-17', 'South Korea', [], false],
  [148, 'Ahyeon', 'babymonster', '2007-04-29', 'South Korea', [], false], [151, 'Anton Lee', 'riize', '2004-03-21', 'South Korea', [], false],
  [152, 'Song Eun-seok', 'riize', '2001-03-19', 'South Korea', [], false], [153, 'Park Won-bin', 'riize', '2002-03-02', 'South Korea', [], false],
  [163, 'Keena', 'fifty-fifty', '2005-03-27', 'South Korea', [], false],
];
// The four rows 021e dates (no birth date until then).
const K1_UNDATED: [number, string, string, string][] = [[39, 'S.Coups', 'seventeen', 'Q21824968'], [46, 'DK', 'seventeen', 'Q21824862'], [48, 'The8', 'seventeen', 'Q21824868'], [175, 'Kai', 'exo', 'Q10775090']];


/** Production has 212 possible answers before L19. */
export const PROD_TARGETS = 212;

/** The chain, the K1 and K2 rows, filler idols up to 212 possible answers, the game active (epoch today) with its bank of 365 days. */
export async function kpopdleWorld(): Promise<PGlite> {
  const db = await afterSessionG();
  // Production has this key (021d inserts on conflict (group_id, name)).
  await db.exec(`alter table public.idols add constraint idols_group_id_name_key unique (group_id, name)`);
  for (const [slug, name, label, gen] of K1_GROUPS) {
    await db.query(`insert into public.groups (name, slug, record_label, generation, fandom_name, inception_date) values ($1, $2, $3, $4, 'fan', null)`, [name, slug, label, gen]);
  }
  for (const [slug, name] of K2_GROUPS) await db.query(`insert into public.groups (name, slug) values ($1, $2)`, [name, slug]);
  for (const [id, name, slug, birth, nat, positions, active] of K1_IDOLS) {
    const qid = ACTIVATION.includes(id) ? QID_021D.get(id) : QID_021A.get(id);
    await db.query(
      `insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, ord)
       values ($1, (select id from public.groups where slug = $2), $3, $4, $5, $6, $7, $8, $9, $1)`,
      [id, slug, name, birth, nat, positions, qid ?? null, active, !active],
    );
  }
  for (const [id, name, slug, qid] of K1_UNDATED) {
    await db.query(`insert into public.idols (id, group_id, name, wikidata_qid, active, ord) values ($1, (select id from public.groups where slug = $2), $3, $4, true, $1)`, [id, slug, name, qid]);
  }
  await db.exec(`select setval(pg_get_serial_sequence('public.idols', 'id'), (select max(id) from public.idols))`);
  for (const f of ['021a-k1-idol-gender-debut.sql', '021c-k1-idol-corrections.sql', '021b-k1-idol-activate.sql', '022-photos-admin.sql', '021d-k2-idols.sql', '021e-k2-birth-dates.sql']) {
    await db.exec(readMigration(f));
  }
  // The state of the night before the file: a snapshot, an active game, a bank (below, once the filler rows exist).
  await db.exec(`insert into public.groups (name, slug, record_label, generation, fandom_name) values ('Filler Group', 'filler-group', 'Filler Entertainment', '3rd Gen', 'fan')`);
  await db.exec(`select public.dle_refresh_entities('kpopdle-idol')`);
  const have = await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`);
  if (have > PROD_TARGETS) throw new Error(`the fixture already has ${have} possible answers`);
  await db.exec(`insert into public.idols (group_id, name, birth_date, nationality, positions, active, needs_review, gender, debut_year, ord)
    select (select id from public.groups where slug = 'filler-group'), 'Filler ' || n, date '1995-01-01', 'South Korea', '{}', true, false, 'female', 2015, 1000 + n
    from generate_series(1, ${PROD_TARGETS} - ${have}) n`);
  await db.exec(`select public.dle_activate('kpopdle-idol', '${new Date().toISOString().slice(0, 10)}', 0.5)`);
  return db;
}

/** The calendar as production holds it on 2026-11-09: Taeil (74) at today+44 and +260, Mark (80) at +174 and +315, nowhere else (L19 redraws them itself, nothing waits for a date). */
export async function productionCalendar(db: PGlite): Promise<void> {
  const days = `select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from public.dle_games g, unnest(array[44, 260, 174, 315]) k where g.id = 'kpopdle-idol'`;
  await db.exec(`update public.dle_schedule s set entity_id = (select e.entity_id from public.dle_entities e where e.game_id = s.game_id and e.entity_id not in ('74', '80') order by e.entity_id limit 1)
    where s.game_id = 'kpopdle-idol' and s.entity_id in ('74', '80') and s.bank_day not in (${days})`);
  for (const [id, k] of [['74', 44], ['74', 260], ['80', 174], ['80', 315]] as const) {
    await db.exec(`update public.dle_schedule set entity_id = '${id}' where game_id = 'kpopdle-idol' and bank_day = (select public.dle_bank_day(epoch, public.dle_utc_date(now()) + ${k}) from public.dle_games where id = 'kpopdle-idol')`);
  }
}
