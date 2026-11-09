// node --test apps/quiz/e2e/o1/L1/anime-bank-lot2.test.mjs
// pglite proof of L30 (anime bank lot 2): a stand-in quiz_bank and groups (the base tables are not in the repo), the REAL L08 file, the
// committed L29 (lot 1), then the generated L30: placeholder refusal, apply, values, dates, Verify lines of the header, idempotent,
// changed row refused, taken date refused, exact rollback with its Verify lines, rollback refused once published.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { build, load } from './anime-bank-lot2-sql.mjs';
import { checkSchedule, difficultyMix } from '../../../../../scripts/anime/daily/schedule-rules.mjs';

const REPO = new URL('../../../../../', import.meta.url).pathname;
const LAUNCH = `${REPO}docs/pending-migrations/multisite/launch/`;
const L08 = readFileSync(`${LAUNCH}L08-K3-daily-bank.sql`, 'utf8');
const L29 = readFileSync(`${LAUNCH}L29-l1-anime-bank-lot1.sql`, 'utf8');
const data = load();
const { sql, rollback, N, first, last } = build(data);
const fill = (s) => s.replace("v_reviewer text := '{REVIEWER}';", "v_reviewer text := 'Owner';").replace("v_review_date text := '{REVIEW_DATE}';", "v_review_date text := '2026-11-12';");
const FILLED = fill(sql);
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
  for (const s of [...new Set(data.l08.map((r) => r.group_slug))]) await db.query(`insert into public.groups (site_id, slug, name) values ('anime', $1, $1)`, [s]);
  await db.exec(L08);
  const sched = ['2026-11-08', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  for (let i = 0; i < 12; i++) await db.query(`update public.quiz_bank set status='scheduled', scheduled_date=$1, verified_at=now() where site_id='anime' and title=$2`, [sched[i], TAKEN[i]]);
  await db.query(`insert into public.quiz_bank (title, status, site_id, scheduled_date, published_quiz_id) values ('p1','published','anime','2026-11-07',1),('p2','published','anime','2026-11-09',2)`);
  await db.exec(L29); // lot 1 as applied in production (2026-11-09)
  return db;
}
const dump = async (db) => (await db.query(`select title, description, quiz_type, difficulty, category, group_id, questions, status, scheduled_date::text as d, (verified_at is not null) as v, verification_notes, published_quiz_id from public.quiz_bank where site_id='anime' order by title`)).rows;
const verifyLines = (text) => text.split('\n').filter((l) => l.startsWith('-- Verify: ')).map((l) => {
  const m = l.match(/^-- Verify: (select .*;)\s+expect (\S+)/);
  assert.ok(m, `unparsable Verify line: ${l.slice(0, 80)}`);
  return { q: m[1], expect: m[2] };
});
async function runVerify(db, text) {
  const lines = verifyLines(text);
  assert.ok(lines.length >= 3);
  for (const { q, expect } of lines) {
    const r = await db.query(q);
    assert.equal(String(Object.values(r.rows[0])[0]), expect, `Verify failed: ${q.slice(0, 140)}`);
  }
}

test('the file is one DO block, no temp table, review constants inside it, no dash', () => {
  for (const s of [sql, rollback]) {
    assert.equal((s.match(/^do \$o1l\$/gm) || []).length, 1);
    assert.equal((s.match(/^end \$o1l\$;$/gm) || []).length, 1);
    assert.ok(!/create\s+temp|temporary table/i.test(s));
    assert.ok(!/[—–]/.test(s));
    assert.ok(s.includes("perform set_config('lock_timeout', '5s', true);"));
    const body = s.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim(); // nothing but the one DO block
    assert.ok(body.startsWith('do $o1l$') && body.endsWith('end $o1l$;'));
  }
  assert.ok(sql.includes("v_reviewer text := '{REVIEWER}';") && sql.includes("v_review_date text := '{REVIEW_DATE}';"));
  assert.equal(N, 30);
});

test('the lot: 30 days from 2026-12-19, 8 questions each, schedule rules hold after lot 1, difficulty near the target', () => {
  const qs = data.lot.quizzes;
  assert.equal(qs.length, 30);
  assert.equal(qs[0].date, '2026-12-19'); assert.equal(qs.at(-1).date, '2027-01-17');
  const ctx = data.lot1.quizzes.map((q) => ({ date: q.date, series: q.group_slug, type: q.quiz_type, difficulty: q.difficulty }));
  ctx.push({ date: '2026-12-18', series: 'anime-mix', type: 'guess_from_clues', difficulty: 'hard' });
  const days = qs.map((q) => ({ date: q.date, series: q.group_slug, type: q.quiz_type, difficulty: q.difficulty }));
  assert.deepEqual(checkSchedule([...ctx, ...days]), []);
  const mix = difficultyMix(days);
  assert.ok(Math.abs(mix.easy - 0.4) < 0.1 && Math.abs(mix.medium - 0.45) < 0.1 && Math.abs(mix.hard - 0.15) < 0.1, JSON.stringify(mix));
  for (const q of qs) {
    assert.equal(q.questions.length, 8, q.date);
    for (const x of q.questions) { assert.ok(x.source_url.startsWith('https://en.wikipedia.org/wiki/')); assert.ok(!/[—–]/.test(JSON.stringify(x))); }
    assert.equal(new Set(q.questions.map((x) => x.question)).size, 8);
  }
  // no repeated question text across the lot and against the lot 1 / published question texts
  const seen = new Set(data.lot1.quizzes.flatMap((q) => q.questions.map((x) => x.question)));
  for (const q of qs) for (const x of q.questions) { assert.ok(!seen.has(x.question), `repeated text ${x.question}`); seen.add(x.question); }
});

test('refuses while the review constants are unfilled, changes nothing', async () => {
  const db = await fresh();
  const before = await dump(db);
  await assert.rejects(db.exec(sql), /review not recorded/);
  assert.deepEqual(await dump(db), before);
});

test('apply: 30 rows scheduled one a day, Verify lines pass, idempotent, exact rollback with its Verify lines', async () => {
  const db = await fresh();
  const l08State = await dump(db);
  await db.exec(FILLED);
  await runVerify(db, sql);
  const rows = (await db.query(`select title, status, scheduled_date::text as d, verified_at is not null as v, verification_notes as n, questions, description from public.quiz_bank where site_id='anime' and scheduled_date between '${first}' and '${last}' order by scheduled_date`)).rows;
  assert.equal(rows.length, N);
  rows.forEach((r, i) => {
    const q = data.lot.quizzes[i];
    assert.equal(r.d, q.date); assert.equal(r.title, q.title); assert.equal(r.description, q.description); assert.equal(r.status, 'scheduled'); assert.ok(r.v);
    assert.deepEqual(r.questions, q.questions);
    assert.match(r.n, /checked by Owner on 2026-11-12\.$/); assert.match(r.n, /\(L30\)/); assert.doesNotMatch(r.n, /[{]REVIEW/);
  });
  const afterOnce = await dump(db);
  await db.exec(FILLED); // second run: nothing changes
  assert.deepEqual(await dump(db), afterOnce);
  await db.exec(rollback);
  assert.deepEqual(await dump(db), l08State); // the exact L08 values back
  await runVerify(db, rollback);
  await db.exec(rollback); // idempotent
  assert.deepEqual(await dump(db), l08State);
});

test('a lot row changed since L08 is left alone and the self-check raises, nothing applied', async () => {
  const db = await fresh();
  await db.query(`update public.quiz_bank set questions = jsonb_set(questions, '{0,question}', '"edited"') where site_id='anime' and title = $1`, [data.lot.quizzes[3].l08_title]);
  const before = await dump(db);
  await assert.rejects(db.exec(FILLED), /self-check failed/);
  assert.deepEqual(await dump(db), before);
});

test('an already verified lot row (status scheduled elsewhere) or a taken date refuses the file', async () => {
  const db = await fresh();
  await db.query(`update public.quiz_bank set status='scheduled', scheduled_date='2026-12-31' where site_id='anime' and title = 'Odd One Out: Studios, Seasons and Origins'`);
  const before = await dump(db);
  await assert.rejects(db.exec(FILLED), /already has a scheduled_date/);
  assert.deepEqual(await dump(db), before);
});

test('rollback is refused once a lot row is published', async () => {
  const db = await fresh();
  await db.exec(FILLED);
  await db.query(`update public.quiz_bank set status='published', published_quiz_id=99 where site_id='anime' and scheduled_date='${first}'`);
  const before = await dump(db);
  await assert.rejects(db.exec(rollback), /refused/);
  assert.deepEqual(await dump(db), before);
});

test('the committed L30 files are the generated ones (placeholders still unfilled until the owner review)', () => {
  assert.equal(readFileSync(`${LAUNCH}L30-l1-anime-bank-lot2.sql`, 'utf8'), sql);
  assert.equal(readFileSync(`${LAUNCH}L30-l1-anime-bank-lot2.rollback.sql`, 'utf8'), rollback);
});
