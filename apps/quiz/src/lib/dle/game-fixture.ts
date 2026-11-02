// Test code only (nothing in the app imports it): the game kpopdle-idol on PGlite, seeded with a small pool of idols as lot K1's columns will read them, and switched on with its bank. The SQL is the real 018, 019 and 020.
import { freshDb } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

type Row = readonly [name: string, hangul: string, group: string, nationality: string, gender: 'female' | 'male', birth: number, debut: number, positions: readonly string[]];

const GROUPS: readonly (readonly [name: string, slug: string, fandom: string, generation: string, inception: string, label: string])[] = [
  ['TWICE', 'twice', 'ONCE', '3rd generation', '2015-10-20', 'JYP Entertainment'],
  ['BTS', 'bts', 'ARMY', '3rd generation', '2013-06-13', 'BIGHIT MUSIC'],
  ['aespa', 'aespa', 'MY', '4th generation', '2020-11-17', 'SM Entertainment'],
];

const IDOLS: readonly Row[] = [
  ['Nayeon', '나연', 'TWICE', 'South Korea', 'female', 1995, 2015, []], ['Jeongyeon', '정연', 'TWICE', 'South Korea', 'female', 1996, 2015, []],
  ['Momo', '모모', 'TWICE', 'Japan', 'female', 1996, 2015, []], ['Sana', '사나', 'TWICE', 'Japan', 'female', 1996, 2015, []],
  ['Jihyo', '지효', 'TWICE', 'South Korea', 'female', 1997, 2015, ['Leader']], ['Mina', '미나', 'TWICE', 'Japan', 'female', 1997, 2015, []],
  ['Dahyun', '다현', 'TWICE', 'South Korea', 'female', 1998, 2015, []], ['Chaeyoung', '채영', 'TWICE', 'South Korea', 'female', 1999, 2015, []],
  ['Tzuyu', '쯔위', 'TWICE', 'Taiwan', 'female', 1999, 2015, ['Maknae']],
  ['RM', '알엠', 'BTS', 'South Korea', 'male', 1994, 2013, ['Leader']], ['Jin', '진', 'BTS', 'South Korea', 'male', 1992, 2013, []],
  ['Suga', '슈가', 'BTS', 'South Korea', 'male', 1993, 2013, []], ['J-Hope', '제이홉', 'BTS', 'South Korea', 'male', 1994, 2013, []],
  ['Jimin', '지민', 'BTS', 'South Korea', 'male', 1995, 2013, []], ['V', '뷔', 'BTS', 'South Korea', 'male', 1995, 2013, []],
  ['Jungkook', '정국', 'BTS', 'South Korea', 'male', 1997, 2013, ['Maknae']],
  ['Karina', '카리나', 'aespa', 'South Korea', 'female', 2000, 2020, ['Leader']], ['Winter', '윈터', 'aespa', 'South Korea', 'female', 2001, 2020, []],
  ['Ningning', '닝닝', 'aespa', 'China', 'female', 2002, 2020, ['Maknae']], ['Giselle', '지젤', 'aespa', 'South Korea', 'female', 2000, 2020, []],
];

export const FIXTURE_POOL_SIZE = IDOLS.length;

/** The fixture's groups and idols into a database that already has the dle tables (the local preview of lot P5: the groups of KpopQuiz are the ones named in the pool). */
export async function seedFixtureIdols(db: PGlite): Promise<void> {
  await db.exec(`alter table public.idols add column if not exists gender text, add column if not exists debut_year integer`);
  for (const [name, slug, fandom, generation, inception, label] of GROUPS) {
    await db.query('insert into public.groups (name, slug, fandom_name, generation, inception_date, record_label) values ($1, $2, $3, $4, $5, $6) on conflict (slug) do nothing', [name, slug, fandom, generation, inception, label]);
  }
  for (const [name, hangul, group, nationality, gender, birth, debut, positions] of IDOLS) {
    await db.query(
      `insert into public.idols (group_id, name, name_romanized, name_hangul, birth_date, nationality, positions, gender, debut_year)
       values ((select id from public.groups where name = $1 and site_id = 'kpop'), $2, $2, $3, make_date($4::int, 3, 1), $5, $6, $7, $8)`,
      [group, name, hangul, birth, nationality, positions, gender, debut],
    );
  }
}

/** A database with the fixture's idols and kpopdle-idol active since `epoch`. */
export async function kpopdleDb(epoch: string, seed = 0.5): Promise<PGlite> {
  const db = await freshDb();
  await db.exec(`
    alter table public.groups add column site_id text not null default 'kpop';
    alter table public.idols add column gender text, add column debut_year integer;
    update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'kpopdle-idol';
    grant select on public.groups to anon, authenticated;
  `);
  for (const [name, slug, fandom, generation, inception, label] of GROUPS) {
    await db.query('insert into public.groups (name, slug, fandom_name, generation, inception_date, record_label) values ($1, $2, $3, $4, $5, $6)', [name, slug, fandom, generation, inception, label]);
  }
  for (const [name, hangul, group, nationality, gender, birth, debut, positions] of IDOLS) {
    await db.query(
      `insert into public.idols (group_id, name, name_romanized, name_hangul, birth_date, nationality, positions, gender, debut_year)
       values ((select id from public.groups where name = $1), $2, $2, $3, make_date($4::int, 3, 1), $5, $6, $7, $8)`,
      [group, name, hangul, birth, nationality, positions, gender, debut],
    );
  }
  await db.query(`select public.dle_activate('kpopdle-idol', '${epoch}', ${seed})`);
  return db;
}

/** A call as PostgREST makes it: one transaction, the role and the request settings of the caller; its result or its error, as supabase-js returns them. */
export async function rpcAs(db: PGlite, fn: string, args: Record<string, unknown>, opts: { readonly sub?: string; readonly ip?: string } = {}): Promise<{ data: unknown; error: { message: string } | null }> {
  const names = Object.keys(args);
  const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as out`;
  await db.exec('begin');
  try {
    if (opts.sub) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [opts.sub]);
    await db.query(`select set_config('request.headers', $1, true)`, [JSON.stringify(opts.ip ? { 'x-forwarded-for': opts.ip } : {})]);
    await db.exec(`set local role ${opts.sub ? 'authenticated' : 'anon'}`);
    const r = await db.query<{ out: unknown }>(sql, names.map((n) => args[n] ?? null));
    await db.exec('commit');
    return { data: r.rows[0]?.out ?? null, error: null };
  } catch (e) {
    await db.exec('rollback');
    return { data: null, error: { message: (e as Error).message } };
  }
}
