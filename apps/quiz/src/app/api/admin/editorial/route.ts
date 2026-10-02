import { NextResponse } from 'next/server';

import { adminGate, generateTemplateDrafts } from '@/lib/editorial/admin-api';
import { checkDraftInput } from '@/lib/editorial/drafts';
import { createDraft } from '@/lib/editorial/pipeline';

import type { NextRequest } from 'next/server';

// /api/admin/editorial (V12 G9, SYSTEM.md 5.6). Admin only, behind the v12 flag,
// 503 not_live before any write until v12-g9-editorial.sql is applied.
//   GET   the queue: every draft (newest first, 200) and the editorial accounts
//   POST  { action: 'create', draft }   a draft written by the admin
//         { action: 'generate' }        template drafts from this week's real data
// A draft is never published from here: approve it with a date
// (PATCH /api/admin/editorial/<id>), the cron publishes it.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const g = await adminGate();
  if (!g.ok) return g.res;
  try {
    const [drafts, accounts] = await Promise.all([g.store.listDrafts(200), g.store.accounts()]);
    return NextResponse.json({ ok: true, drafts, accounts });
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await adminGate();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const b = (body ?? {}) as { action?: unknown; draft?: unknown };
  try {
    if (b.action === 'generate') {
      return NextResponse.json({ ok: true, ...(await generateTemplateDrafts(g.store, Date.now())) });
    }
    if (b.action === 'create') {
      const c = checkDraftInput(b.draft);
      if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
      const r = await createDraft(g.store, c.value, { adminId: g.adminId });
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
      return NextResponse.json({ ok: true, draft: r.value });
    }
    return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/editorial] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }
}
