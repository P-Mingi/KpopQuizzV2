import { NextResponse } from 'next/server';

import { approveQuizDrafts, closeReviewBatch, importQuizDrafts, rejectQuizDraft, scheduleApprovedQuizzes } from './pipeline';
import { editorialQuizOn } from './flag';
import { quizLaneLive, supabaseQuizStore } from './store';

import type { QuizResult, QuizStore } from './pipeline';

// Run O1, lot E1b: the quiz actions of the admin routes /api/admin/editorial (POST) and /api/admin/editorial/<id> (PATCH).
// Called by those routes AFTER their own gate (v12 flag, admin, editorial tables live). Each function answers null when the lane
// is off, so the route falls through to the answer it gave before the lane existed (bad_action, or the generic draft path).
// Past the flag: 503 quiz_not_live until SQL 012 is applied, BEFORE any write.

export const QUIZ_POST_ACTIONS = ['import_quizzes', 'approve_quizzes', 'schedule_quizzes', 'close_review_batch'] as const;

const json = (body: unknown, status = 200): NextResponse => NextResponse.json(body, { status });
const refused = <T>(r: Extract<QuizResult<T>, { ok: false }>): NextResponse => json({ error: r.error, ...(r.detail ? { detail: r.detail } : {}) }, r.status);

async function liveStore(): Promise<QuizStore | NextResponse> {
  try {
    if (!(await quizLaneLive())) return json({ error: 'quiz_not_live' }, 503);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
  return supabaseQuizStore();
}

function idList(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 200) return null;
  return v.every((x) => Number.isSafeInteger(x) && (x as number) > 0) ? (v as number[]) : null;
}
const daysOf = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** POST /api/admin/editorial: the four quiz actions. */
export async function quizPostAction(b: Record<string, unknown>, adminId: string): Promise<NextResponse | null> {
  if (!editorialQuizOn() || !(QUIZ_POST_ACTIONS as readonly string[]).includes(String(b.action))) return null;
  const store = await liveStore();
  if (store instanceof NextResponse) return store;
  const by = { adminId, isAdmin: (uid: string): boolean => uid === adminId, now: Date.now(), days: daysOf(b.days) };
  if (b.action === 'import_quizzes') {
    const r = await importQuizDrafts(store, b.drafts, { adminId, label: typeof b.label === 'string' ? b.label : '', now: by.now });
    return r.ok ? json({ ok: true, ...r.value }) : refused(r);
  }
  if (b.action === 'approve_quizzes') {
    const ids = idList(b.ids);
    if (!ids) return json({ error: 'bad_ids' }, 400);
    const r = await approveQuizDrafts(store, ids, by);
    return r.ok ? json({ ok: true, ...r.value }) : refused(r);
  }
  if (b.action === 'schedule_quizzes') {
    const r = await scheduleApprovedQuizzes(store, by);
    return r.ok ? json({ ok: true, ...r.value }) : refused(r);
  }
  const id = Number(b.id);
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: 'bad_id' }, 400);
  const r = await closeReviewBatch(store, id, b.errors, by);
  return r.ok ? json({ ok: true, ...r.value }) : refused(r);
}

/** PATCH /api/admin/editorial/<id> for a quiz draft: approve (a random time in the coming days) or reject. Null = not a quiz draft here. */
export async function quizPatchAction(id: number, b: Record<string, unknown>, adminId: string): Promise<NextResponse | null> {
  if (!editorialQuizOn()) return null;
  const store = await liveStore();
  if (store instanceof NextResponse) return null; // the generic path answers (not_found: a quiz draft is invisible to it)
  if ((await store.getQuizDrafts([id])).length === 0) return null;
  const by = { adminId, isAdmin: (uid: string): boolean => uid === adminId, now: Date.now(), days: daysOf(b.days) };
  if (b.action === 'approve') {
    const r = await approveQuizDrafts(store, [id], by);
    if (!r.ok) return refused(r);
    const blocked = r.value.blocked[0];
    if (blocked) return json({ error: blocked.error, ...(blocked.detail ? { detail: blocked.detail } : {}) }, blocked.error === 'not_editable' ? 409 : 422);
    if (r.value.unplaced[0]) return json({ error: 'no_room' }, 409);
    return json({ ok: true, approved: r.value.approved });
  }
  if (b.action === 'reject') {
    const r = await rejectQuizDraft(store, id, by);
    return r.ok ? json({ ok: true, draft: r.value }) : refused(r);
  }
  return json({ error: 'quiz_not_editable' }, 400);
}
