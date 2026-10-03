import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { adminGate } from '@/lib/editorial/admin-api';
import { checkDraftInput, checkSchedule } from '@/lib/editorial/drafts';
import { approveDraft, editDraft, rejectDraft } from '@/lib/editorial/pipeline';

import type { NextRequest } from 'next/server';

// PATCH /api/admin/editorial/<id> (V12 G9). Admin only, behind the v12 flag.
//   { action: 'edit', draft }               save changes. An approved draft goes back
//                                           to review: what is published is always
//                                           what an admin approved.
//   { action: 'approve', scheduled_at }     approve with a date (reviewed_by = this admin)
//   { action: 'reject' }
// Nothing is published here. The cron publishes approved drafts that are due.
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const g = await adminGate();
  if (!g.ok) return g.res;
  const { id: raw } = await params;
  const id = /^\d{1,12}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const b = (body ?? {}) as { action?: unknown; draft?: unknown; scheduled_at?: unknown };
  const now = Date.now();
  try {
    if (b.action === 'edit') {
      const c = checkDraftInput(b.draft);
      if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
      const r = await editDraft(g.store, id, c.value);
      return r.ok ? NextResponse.json({ ok: true, draft: r.value }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    if (b.action === 'approve') {
      const when = checkSchedule(b.scheduled_at);
      if (!when.ok) return NextResponse.json({ error: when.error }, { status: 400 });
      const r = await approveDraft(g.store, id, { adminId: g.adminId, isAdmin, scheduledAt: when.value, now });
      return r.ok ? NextResponse.json({ ok: true, draft: r.value }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    if (b.action === 'reject') {
      const r = await rejectDraft(g.store, id, { adminId: g.adminId, isAdmin, now });
      return r.ok ? NextResponse.json({ ok: true, draft: r.value }) : NextResponse.json({ error: r.error }, { status: r.status });
    }
    return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/editorial] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
}
