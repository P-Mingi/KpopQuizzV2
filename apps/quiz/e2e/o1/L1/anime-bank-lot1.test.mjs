// node --test apps/quiz/e2e/o1/L1/anime-bank-lot1.test.mjs
// pglite proof of L29 (anime bank lot 1): a stand-in quiz_bank and groups (the base tables are not in the repo), the REAL L08 file, then
// the generated L29: apply, values, dates, idempotent, placeholder refusal, changed row refused, window clash refused, exact rollback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { build, load } from './anime-bank-lot1-sql.mjs';

const REPO = new URL('../../../../../', import.meta.url).pathname;
const L08 = readFileSync(`${REPO}docs/pending-migrations/multisite/launch/L08-K3-daily-bank.sql`, 'utf8');
const data = load();
const { sql, rollback, N } = build(data);
const FILLED = sql.replace("('{REVIEWER}', '{REVIEW_DATE}')", "('Owner', '2026-11-12')");
const TAKEN = ['Name That Series: Deep Cuts', 'Sessions in the Solar System: True or False', 'Stand Proud: Facts From the Joestar Archive', 'Naruto Endings: Roll the Credits', 'Directors, Awards and Theme Songs', 'Rank E True or False', 'Dragon Ball Jukebox: Openings and Endings', 'One Punch Statements: True or False', 'Closing Credits: Ending Song Quiz', 'Soul Reaper Statements: True or False', 'From Web Novel to Webtoon to Film', 'Name That Series: Studios, Songs and Staff', 'From 1984 to Daima: Dragon Ball by the Calendar', 'Rank E and the Web Novel Behind It'];

async function fresh() {
  const db = new PGlite();
  await db.exec(`
    create table public.groups (id serial primary key, site_id text not null default 'kpop', slug text not null, name text);
    create table public.quiz_bank (id serial primary key, title text not null, description text, group_id int, quiz_type text, difficulty text, category text,
      questions jsonb, status text not null default 'draft', site_id text not null default 'kpop', scheduled_date date, verified_at timestamptz,
      verification_notes text, published_quiz_id int, created_at timestamptz default now(), updated_at timestamptz default now());
    create unique index quiz_bank_site_date on public.quiz_bank (site_id, scheduled_date);
  `);
  const slugs = [...new Set(data.l08.map((r) => r.group_slug))];
  for (const s of slugs) await db.query(`insert into public.groups (site_id, slug, name) values ('anime', $1, $1)`, [s]);
  await db.exec(L08);
  // production state of 2026-11-09: 12 taken rows scheduled (2026-11-08, 2026-11-10 to 2026-11-20), 2 published (2026-11-07, 2026-11-09)
  const sched = ['2026-11-08', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  for (let i = 0; i < 12; i++) await db.query(`update public.quiz_bank set status='scheduled', scheduled_date=$1, verified_at=now() where site_id='anime' and title=$2`, [sched[i], TAKEN[i]]);
  await db.query(`insert into public.quiz_bank (title, status, site_id, scheduled_date, published_quiz_id) values ('p1','published','anime','2026-11-07',1),('p2','published','anime','2026-11-09',2)`);
  return db;
}
const dump = async (db) => (await db.query(`select title, description, quiz_type, difficulty, category, group_id, questions, status, scheduled_date::text as d, (verified_at is not null) as v, verification_notes, published_quiz_id from public.quiz_bank where site_id='anime' order by title`)).rows;

test('the rows are built from L08 values and the verified lot', () => {
  assert.equal(N, 27);
  assert.ok(sql.includes('{REVIEWER}') && sql.includes('{REVIEW_DATE}'));
  assert.ok(!/[—–]/.test(sql + rollback));
});

test('refuses while the review placeholders are unfilled, changes nothing', async () => {
  const db = await fresh();
  const before = await dump(db);
  await assert.rejects(db.exec(sql), /review not recorded/);
  assert.deepEqual(await dump(db), before);
});

test('apply: 27 rows scheduled one a day, the stuck row moved, idempotent, exact rollback', async () => {
  const db = await fresh();
  const l08State = await dump(db);
  await db.exec(FILLED);
  const rows = (await db.query(`select title, status, scheduled_date::text as d, verified_at is not null as v, verification_notes as n, questions from public.quiz_bank where site_id='anime' and scheduled_date >= '2026-11-21' order by scheduled_date`)).rows;
  assert.equal(rows.length, N + 1);
  const lot = rows.filter((r) => r.d !== '2026-12-18');
  assert.deepEqual(lot.map((r) => r.d), data.lot.quizzes.map((q) => q.date));
  lot.forEach((r, i) => {
    const q = data.lot.quizzes[i];
    assert.equal(r.title, q.title); assert.equal(r.status, 'scheduled'); assert.ok(r.v);
    assert.deepEqual(r.questions, q.questions);
    assert.match(r.n, /checked by Owner on 2026-11-12\.$/); assert.doesNotMatch(r.n, /[{]REVIEW/);
    assert.equal(r.questions.length, 8);
  });
  assert.equal(rows.find((r) => r.d === '2026-12-18').title, 'Name That Series: Deep Cuts');
  assert.equal((await db.query(`select count(*)::int c from public.quiz_bank where site_id='anime' and status='draft'`)).rows[0].c, 99 - 12 - N); // 99 L08 rows, 12 scheduled before, the lot filed
  const afterOnce = await dump(db);
  await db.exec(FILLED); // second run: nothing changes
  assert.deepEqual(await dump(db), afterOnce);
  await db.exec(rollback);
  assert.deepEqual(await dump(db), l08State); // the exact L08 values and the 2026-11-08 date back
  await db.exec(rollback); // idempotent
  assert.deepEqual(await dump(db), l08State);
});

test('a lot row changed since L08 is left alone and the self-check raises, nothing applied', async () => {
  const db = await fresh();
  await db.query(`update public.quiz_bank set questions = questions || '[]'::jsonb, description = description where site_id='anime' and title = $1`, [data.lot.quizzes[3].l08_title]);
  await db.query(`update public.quiz_bank set questions = jsonb_set(questions, '{0,question}', '"edited"') where site_id='anime' and title = $1`, [data.lot.quizzes[3].l08_title]);
  const before = await dump(db);
  await assert.rejects(db.exec(FILLED), /self-check failed/);
  assert.deepEqual(await dump(db), before);
});

test('another anime row scheduled inside the window refuses the file', async () => {
  const db = await fresh();
  await db.query(`update public.quiz_bank set status='scheduled', scheduled_date='2026-12-02' where site_id='anime' and title = 'Pen Names: Who Created These Manga?'`);
  await db.query(`update public.quiz_bank set status='draft', scheduled_date=null where site_id='anime' and title = 'Pen Names: Who Created These Manga?'`);
  await db.query(`update public.quiz_bank set status='scheduled', scheduled_date='2026-12-02' where site_id='anime' and title = 'Which Studio Made It? True or False'`);
  await assert.rejects(db.exec(FILLED), /already scheduled between/);
});

test('rollback is refused once a lot row is published', async () => {
  const db = await fresh();
  await db.exec(FILLED);
  await db.query(`update public.quiz_bank set status='published', published_quiz_id=99 where site_id='anime' and scheduled_date='2026-11-21'`);
  const before = await dump(db);
  await assert.rejects(db.exec(rollback), /refused/);
  assert.deepEqual(await dump(db), before);
});
