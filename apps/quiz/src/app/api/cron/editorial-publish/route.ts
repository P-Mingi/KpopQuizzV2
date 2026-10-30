import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { adminNotFound, isListedAdminId } from '@/lib/admin/guard';
import { isCronAuthorized } from '@/lib/cron-auth';
import { runPublisher } from '@/lib/editorial/pipeline';
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
    const run = await runPublisher(supabaseStore(), { now: Date.now(), isAdmin: isListedAdminId, runId: randomUUID() });
    return NextResponse.json({ ok: true, published: run.published, reason: run.reason, skipped: run.skipped.length });
  } catch (err) {
    console.error('[cron/editorial-publish] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'publish_failed' }, { status: 500 });
  }
}
