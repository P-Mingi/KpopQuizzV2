// Audit 04 P2-1: revising a Team quiz. The rules (an admin approves, only a Team quiz, only its own account, fail closed without the SQL),
// and L26 itself on PGlite: history row, content replaced, the average inputs reset, play_count kept, a fan quiz refused, idempotent file,
// exact rollback.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MIGRATIONS } from '@/lib/dle/pglite-harness';

import { RevisionNotLive, reviseTeamQuiz } from './revise';
import { ADMIN, MINA, JAE, goodPayload, isAdmin } from './test-fixtures';

import type { ReviseStore } from './revise';

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const FAN = '99999999-9999-4999-8999-999999999999';
function store(over: Partial<ReviseStore> & { applied?: unknown[] } = {}): ReviseStore & { applied: unknown[] } {
  const applied: unknown[] = over.applied ?? [];
  return {
    applied,
    quizBySlug: async (slug) => (slug === 'aespa-debut-era-check' ? { id: 'q1', creator_id: MINA, status: 'published', title: 'old' } : slug === 'fan-quiz' ? { id: 'q2', creator_id: FAN, status: 'published', title: 'fan' } : null),
    teamIds: async () => new Set([MINA, JAE]),
    accountId: async (u) => (u === 'mina_team' ? MINA : u === 'jae_team' ? JAE : null),
    apply: async (row) => { applied.push(row); return applied.length; },
    ...over,
  } as ReviseStore & { applied: unknown[] };
}
const input = (over: Record<string, unknown> = {}) => ({ slug: 'aespa-debut-era-check', payload: goodPayload(), approvedBy: ADMIN, isAdmin, ...over });

describe('reviseTeamQuiz', () => {
  it('revises a published Team quiz of its own account, once an admin approves', async () => {
    const s = store();
    const r = await reviseTeamQuiz(s, input());
    expect(r).toEqual({ ok: true, revision: 1 });
    expect(s.applied).toHaveLength(1);
    expect((s.applied[0] as { questions: unknown[] }).questions).toHaveLength(10);
  });
  it.each([
    ['not an admin', { approvedBy: JAE }, 'forbidden'],
    ['a bad payload', { payload: { ...goodPayload(), questions: [] } }, 'bad_question_count'],
    ['another slug', { slug: 'other' }, 'slug_mismatch'],
    ['no such quiz', { slug: 'x', payload: goodPayload({ slug: 'x' }) }, 'not_found'],
    ['a FAN quiz', { slug: 'fan-quiz', payload: goodPayload({ slug: 'fan-quiz' }) }, 'not_team_quiz'],
    ['another Team account', { payload: goodPayload({ account: 'jae_team' }) }, 'wrong_account'],
  ])('refuses %s', async (_n, over, error) => {
    const s = store();
    const r = await reviseTeamQuiz(s, input(over));
    expect(r).toMatchObject({ ok: false, error });
    expect(s.applied).toHaveLength(0);
  });
  it('without the SQL file it answers revision_not_live and changes nothing', async () => {
    const r = await reviseTeamQuiz(store({ apply: async () => { throw new RevisionNotLive(); } }), input());
    expect(r).toMatchObject({ ok: false, error: 'revision_not_live' });
  });
});

describe('L26 on PGlite', () => {
  const launch = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
  let db: PGlite;
  const BASE = `
    create table public.quizzes (id uuid primary key default gen_random_uuid(), creator_id uuid not null, slug text unique not null, title text not null,
      questions jsonb not null, settings jsonb not null default '{}', status text not null default 'published', play_count integer not null default 0,
      total_score_sum integer not null default 0, total_completions integer not null default 0, question_count integer, updated_at timestamptz not null default now());
    create table public.editorial_accounts (user_id uuid primary key, display_name text, beat text, active boolean not null default true);
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    insert into public.editorial_accounts values ('${MINA}', 'Mina', 'x', true), ('${JAE}', 'Jae', 'y', false);
    insert into public.quizzes (creator_id, slug, title, questions, play_count, total_score_sum, total_completions, question_count) values
      ('${MINA}', 'team-quiz', 'Team quiz title', '[{"question":"old"}]', 120, 900, 100, 1),
      ('${FAN}', 'fan-quiz', 'Fan quiz title', '[{"question":"fan"}]', 50, 300, 40, 1),
      ('${JAE}', 'retired-quiz', 'Retired Team quiz', '[{"question":"r"}]', 5, 20, 4, 1);`;
  const state = async (slug: string) => (await db.query(`select title, questions::text q, play_count, total_score_sum, total_completions, question_count from public.quizzes where slug = $1`, [slug])).rows[0];
  const revise = (slug: string, q = '[{"question":"a"},{"question":"b"}]') => db.query(`select public.revise_team_quiz($1, 'New title here', $2::jsonb, null, $3::uuid, 'after the show') n`, [slug, q, ADMIN]);

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
    await db.exec(launch('L26-l1-quiz-revision.sql'));
  });

  it('a Team quiz: history written, content replaced, average inputs reset, play_count kept', async () => {
    const r = await revise('team-quiz');
    expect((r.rows[0] as { n: number }).n).toBe(1);
    expect(await state('team-quiz')).toMatchObject({ title: 'New title here', play_count: 120, total_score_sum: 0, total_completions: 0, question_count: 2 });
    const h = (await db.query(`select revision_no, prev_title, prev_questions::text pq, prev_total_score_sum, prev_total_completions, play_count_kept, note from public.quiz_revision`)).rows;
    expect(h).toEqual([{ revision_no: 1, prev_title: 'Team quiz title', pq: '[{"question": "old"}]', prev_total_score_sum: 900, prev_total_completions: 100, play_count_kept: 120, note: 'after the show' }]);
    expect(((await revise('team-quiz')).rows[0] as { n: number }).n).toBe(2);
  });
  it('a fan quiz, a retired Team account, an unknown slug and a bad payload are refused and nothing changes', async () => {
    const before = [await state('fan-quiz'), await state('retired-quiz')];
    for (const slug of ['fan-quiz', 'retired-quiz', 'nope']) await expect(revise(slug)).rejects.toThrow();
    await expect(revise('team-quiz', '[]')).rejects.toThrow();
    expect([await state('fan-quiz'), await state('retired-quiz')]).toEqual(before);
    expect((await db.query(`select count(*)::int n from public.quiz_revision where quiz_id in (select id from public.quizzes where slug in ('fan-quiz','retired-quiz'))`)).rows[0]).toEqual({ n: 0 });
  });
  it('the file is idempotent', async () => {
    const hist = (await db.query(`select count(*)::int n from public.quiz_revision`)).rows[0];
    await db.exec(launch('L26-l1-quiz-revision.sql'));
    expect((await db.query(`select count(*)::int n from public.quiz_revision`)).rows[0]).toEqual(hist);
    expect(((await revise('team-quiz')).rows[0] as { n: number }).n).toBe(3);
  });
  it('the rollback drops the function and the table, and runs twice', async () => {
    await db.exec(launch('L26-l1-quiz-revision.rollback.sql'));
    expect((await db.query(`select to_regclass('public.quiz_revision') r, to_regprocedure('public.revise_team_quiz(text,text,jsonb,jsonb,uuid,text)') f`)).rows[0]).toEqual({ r: null, f: null });
    await db.exec(launch('L26-l1-quiz-revision.rollback.sql'));
    expect(await state('fan-quiz')).toMatchObject({ title: 'Fan quiz title', play_count: 50, total_score_sum: 300 });
  });
});
