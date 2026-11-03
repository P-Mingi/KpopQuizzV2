import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { adminNotFound, isListedAdminId } from '@/lib/admin/guard';
import { isCronAuthorized } from '@/lib/cron-auth';
import { runPublisher } from '@/lib/editorial/pipeline';
import { publishQuizLane } from '@/lib/editorial/quiz/cron';
import { editorialQuizOn } from '@/lib/editorial/quiz/flag';
import { editorialLive, supabaseStore } from '@/lib/editorial/store';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// GET /api/cron/editorial-publish (V12 G9, SYSTEM.md 5.6). Every 15 minutes
// (vercel.json line requested from ORCH: run/requests/G9.md R1). Auth: Bearer
// CRON_SECRET, like every cron of this app.
//
// Publishes at most ONE approved draft whose time has come, under the rules of
// lib/editorial/rules.ts: reviewed by an admin, at most 3 items a UTC day, never
// two in a row from one account. The write is the fan-debate insert
// (community_debates) or editorial_posts; it grants no XP, badge, streak, activity
// event, notification or ticker line, and calls no fan route.
//
// Quiz lane (run O1, lot E1b): with EDITORIAL_QUIZ on and SQL 012 applied, the same run also publishes at most ONE approved quiz
// whose time has come (lib/editorial/quiz/): at most 10 quizzes a UTC day and 1 per group a day, on top of the 3 items above, which
// it never counts. The answer then carries a `quiz` key. With the flag off nothing of it runs and the answer is the one above.
//
// Does nothing, in this order:
//   v12 flag off                 404 (the route does not exist in a v11 build)
//   wrong or missing secret      404 (ADMIN-1: the admin 404, never a 401)
//   SQL not applied              200 { ok: true, published: null, reason: 'not_live' }, no write
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isCronAuthorized(req)) return adminNotFound();
  try {
    if (!(await editorialLive())) return NextResponse.json({ ok: true, published: null, reason: 'not_live' });
    // ADMIN-1: the stored reviewer must be a listed admin (requireAdmin recorded it at approval, aal2); grants nothing to this request.
    const now = Date.now();
    let run: Awaited<ReturnType<typeof runPublisher>> | null = null;
    let failure: unknown = null;
    try {
      run = await runPublisher(supabaseStore(), { now, isAdmin: isListedAdminId, runId: randomUUID() });
    } catch (err) {
      failure = err; // the quiz lane below still runs: the two lanes do not depend on each other
    }
    const quiz = editorialQuizOn() ? await publishQuizLane({ now, isAdmin: isListedAdminId, runId: randomUUID() }) : null;
    if (failure || !run) throw failure ?? new Error('no run');
    return NextResponse.json({ ok: true, published: run.published, reason: run.reason, skipped: run.skipped.length, ...(quiz ? { quiz } : {}) });
  } catch (err) {
    console.error('[cron/editorial-publish] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'publish_failed' }, { status: 500 });
  }
}
