// The production CorrectionStore (run.ts): the service-role client on
// public.quiz_correction_requests (docs/pending-migrations/quiz-corrections-schema.sql),
// public.creator_notifications and public.quizzes. Server only (the cron route is its one
// caller). Every write is conditional on the state it leaves, so a replay changes nothing.

import { onQuizChanged } from '@/lib/seo/quiz-freshness';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';

import { CORRECTION_STATUSES } from './rules';

import type { CorrectionStore, NoticeResult } from './run';
import type { CorrectionNotice, CorrectionQuiz, CorrectionRequest, CorrectionStatus } from './rules';

type Svc = ReturnType<typeof createServiceRoleClient>;

const TABLE = 'quiz_correction_requests';
const REQUEST_COLS = 'id, quiz_id, q_index, question, marked_answer, correction, source_url, status, notified_at, deadline_at';

function asStatus(v: unknown): CorrectionStatus {
  return (CORRECTION_STATUSES as readonly string[]).includes(v as string) ? (v as CorrectionStatus) : 'cancelled';
}

function toRequest(r: Record<string, unknown>): CorrectionRequest {
  return {
    id: String(r.id),
    quiz_id: String(r.quiz_id),
    q_index: Number(r.q_index),
    question: String(r.question ?? ''),
    marked_answer: String(r.marked_answer ?? ''),
    correction: String(r.correction ?? ''),
    source_url: String(r.source_url ?? ''),
    status: asStatus(r.status),
    notified_at: typeof r.notified_at === 'string' ? r.notified_at : null,
    deadline_at: typeof r.deadline_at === 'string' ? r.deadline_at : null,
  };
}

function groupSlugOf(groups: unknown): string | null {
  const g = Array.isArray(groups) ? groups[0] : groups;
  return g && typeof g === 'object' && typeof (g as { slug?: unknown }).slug === 'string' ? (g as { slug: string }).slug : null;
}

function changed(r: { data: unknown; error: { message: string } | null }, what: string): boolean {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return Array.isArray(r.data) && r.data.length > 0;
}

export function supabaseCorrectionStore(svc: Svc = createServiceRoleClient()): CorrectionStore {
  return {
    async openRequests(limit) {
      // A GET (never HEAD): a HEAD on a missing table answers 204 with no error.
      const pending = await svc.from(TABLE).select(REQUEST_COLS).eq('status', 'pending')
        .order('created_at', { ascending: true }).order('id', { ascending: true }).limit(limit);
      if (pending.error) {
        if (isMissingTable(pending.error, pending.status)) return null;
        throw new Error(`read pending requests: ${pending.error.message}`);
      }
      const rows = ((pending.data ?? []) as Record<string, unknown>[]).map(toRequest);
      const room = limit - rows.length;
      if (room <= 0) return rows;
      const notified = await svc.from(TABLE).select(REQUEST_COLS).eq('status', 'notified')
        .order('deadline_at', { ascending: true }).order('id', { ascending: true }).limit(room);
      if (notified.error) throw new Error(`read notified requests: ${notified.error.message}`);
      return rows.concat(((notified.data ?? []) as Record<string, unknown>[]).map(toRequest));
    },

    async quizzes(ids) {
      const out = new Map<string, CorrectionQuiz>();
      if (ids.length === 0) return out;
      const { data, error } = await svc.from('quizzes')
        .select('id, title, slug, status, creator_id, questions, groups(slug)')
        .in('id', [...ids]);
      if (error) throw new Error(`read quizzes: ${error.message}`);
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        out.set(String(r.id), {
          id: String(r.id),
          title: String(r.title ?? ''),
          slug: String(r.slug ?? ''),
          status: String(r.status ?? ''),
          creator_id: typeof r.creator_id === 'string' ? r.creator_id : null,
          questions: r.questions,
          group_slug: groupSlugOf(r.groups),
        });
      }
      return out;
    },

    async insertNotice(notice: CorrectionNotice): Promise<NoticeResult> {
      const { data, error } = await svc.from('creator_notifications').insert(notice).select('id');
      if (error) {
        if (error.code === '23505') return 'duplicate'; // creator_notifications_dedup_idx
        throw new Error(`insert notice: ${error.message}`);
      }
      // A BEFORE INSERT trigger that returns NULL inserts nothing and raises nothing.
      return Array.isArray(data) && data.length > 0 ? 'inserted' : 'suppressed';
    },

    async markNotified(id, notifiedAt, deadlineAt) {
      return changed(await svc.from(TABLE).update({ status: 'notified', notified_at: notifiedAt, deadline_at: deadlineAt })
        .eq('id', id).eq('status', 'pending').select('id'), 'mark notified');
    },

    async close(id, status, at) {
      return changed(await svc.from(TABLE).update({ status, resolved_at: at })
        .eq('id', id).in('status', ['pending', 'notified']).select('id'), `mark ${status}`);
    },

    async draftQuiz(quizId) {
      // Status only: the creator's title, questions and dates stay as they are.
      return changed(await svc.from('quizzes').update({ status: 'draft' })
        .eq('id', quizId).eq('status', 'published').select('id'), 'draft quiz');
    },

    async markDrafted(id, at) {
      return changed(await svc.from(TABLE).update({ status: 'drafted', drafted_at: at })
        .eq('id', id).eq('status', 'notified').select('id'), 'mark drafted');
    },

    quizUnpublished(quiz) {
      // The quiz page 404s at once, its hub, /new and the sitemap drop it, IndexNow hears of it
      // (the same call the admin route makes when a quiz leaves 'published').
      onQuizChanged('removed', quiz.slug, [quiz.group_slug]);
    },
  };
}
