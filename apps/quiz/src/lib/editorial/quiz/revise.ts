// Audit 04 P2-1 (owner 2026-11-09): revising a Team quiz. A Team quiz can get new questions after an event (the winners of a show, a new
// title track); a FAN quiz is never touched. The write is one database function (public.revise_team_quiz, SQL L26-l1-quiz-revision.sql):
// it keeps the history, replaces the content and resets the inputs of the average, but keeps play_count. An admin approves every
// revision (the owner reads it first); nothing here runs by itself.
//
// Fails closed: without the SQL file the answer is revision_not_live and nothing changes; a quiz whose creator is not an active Team
// account, or a draft written for another account, is refused here and again by the function itself.

import { createServiceRoleClient } from '@/lib/supabase/server';

import { checkQuizPayload } from './payload';

import type { QuizDraftPayload } from './payload';

export interface ReviseQuizRow { id: string; creator_id: string; status: string; title: string }

export interface ReviseStore {
  quizBySlug(slug: string): Promise<ReviseQuizRow | null>;
  /** The user ids of the ACTIVE editorial accounts. */
  teamIds(): Promise<ReadonlySet<string>>;
  /** The user id of an editorial account by username (profiles). */
  accountId(username: string): Promise<string | null>;
  /** public.revise_team_quiz: the revision number. Throws RevisionNotLive when L26 is not applied. */
  apply(row: { slug: string; title: string; questions: unknown[]; settings: Record<string, unknown> | null; revisedBy: string; note: string | null }): Promise<number>;
}

export class RevisionNotLive extends Error {
  constructor() { super('quiz_revision SQL (L26) is not applied'); }
}

export type ReviseResult = { ok: true; revision: number } | { ok: false; error: string; detail?: string };
const refuse = (error: string, detail?: string): { ok: false; error: string; detail?: string } => ({ ok: false, error, ...(detail ? { detail } : {}) });

export interface ReviseInput {
  /** The slug of the published Team quiz. */
  slug: string;
  /** The new content, in the form of a quiz draft (formats.md 4): the same checks, the same 10 questions and sources. */
  payload: unknown;
  approvedBy: string;
  isAdmin: (id: string) => boolean;
  note?: string;
}

export async function reviseTeamQuiz(store: ReviseStore, input: ReviseInput): Promise<ReviseResult> {
  if (!input.isAdmin(input.approvedBy)) return refuse('forbidden');
  const parsed = checkQuizPayload(input.payload);
  if (!parsed.ok) return refuse(parsed.error, parsed.detail);
  const p: QuizDraftPayload = parsed.value;
  if (p.slug !== input.slug) return refuse('slug_mismatch', 'The revision is written for another quiz.');
  const quiz = await store.quizBySlug(input.slug);
  if (!quiz) return refuse('not_found');
  if (quiz.status !== 'published') return refuse('not_published');
  const team = await store.teamIds();
  if (!team.has(quiz.creator_id)) return refuse('not_team_quiz', 'Only a quiz made by a Team account can be revised: a fan quiz is the fan\'s.');
  const account = await store.accountId(p.account);
  if (!account || account !== quiz.creator_id) return refuse('wrong_account', 'The revision must come from the Team account that made the quiz.');
  try {
    const revision = await store.apply({
      slug: p.slug, title: p.title,
      questions: p.questions.map((q) => ({ question: q.question, options: [...q.options], correct: q.correct, ...(q.fun_fact ? { fun_fact: q.fun_fact } : {}), source_url: q.source_url })),
      settings: null, revisedBy: input.approvedBy, note: input.note ?? null,
    });
    return { ok: true, revision };
  } catch (err) {
    if (err instanceof RevisionNotLive) return refuse('revision_not_live', 'Apply L26-l1-quiz-revision.sql first.');
    throw err;
  }
}

/** The real store: the service role client and the function of L26. */
export function supabaseReviseStore(): ReviseStore {
  const svc = createServiceRoleClient();
  return {
    async quizBySlug(slug) {
      const { data, error } = await svc.from('quizzes').select('id, creator_id, status, title').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`revise quiz read: ${error.message}`);
      return (data as ReviseQuizRow | null) ?? null;
    },
    async teamIds() {
      const { data, error } = await svc.from('editorial_accounts').select('user_id').eq('active', true).limit(100);
      if (error) throw new Error(`revise accounts read: ${error.message}`);
      return new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    },
    async accountId(username) {
      const { data, error } = await svc.from('profiles').select('id').eq('username', username).maybeSingle();
      if (error) throw new Error(`revise profile read: ${error.message}`);
      return (data as { id: string } | null)?.id ?? null;
    },
    async apply(row) {
      const { data, error } = await svc.rpc('revise_team_quiz', {
        p_slug: row.slug, p_title: row.title, p_questions: row.questions, p_settings: row.settings, p_revised_by: row.revisedBy, p_note: row.note,
      });
      if (error) {
        // PostgREST: 42883 / PGRST202 = the function does not exist (L26 not applied).
        if (error.code === '42883' || error.code === 'PGRST202' || /function .*revise_team_quiz.* does not exist|Could not find the function/i.test(error.message)) throw new RevisionNotLive();
        throw new Error(`revise quiz: ${error.message}`);
      }
      return data as number;
    },
  };
}
