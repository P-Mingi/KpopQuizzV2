import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// POST /api/admin/community-reports { id }: restore what the 3rd report hid
// (community_autohidden row id, migration v12-community-posts.sql). The content gets its
// status back, its open reports are dismissed (so the next report starts from zero), and
// the log row records who restored it and when. Admins only; v12 only.
export const dynamic = 'force-dynamic';

const TABLE: Record<string, string> = {
  thread: 'verse_threads', essay: 'verse_essays', comment: 'verse_discussions',
  debate: 'community_debates', challenge: 'community_challenges', reply: 'community_replies',
};
const HAS_UPDATED_AT = new Set(['thread', 'essay', 'comment']);

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { user } = gate;
  let body: { id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data } = await svc.from('community_autohidden').select('id, target_type, target_id, target_ref, prev_status, restored_at').eq('id', id).maybeSingle();
  const row = data as { id: number; target_type: string; target_id: number; target_ref: string | null; prev_status: string; restored_at: string | null } | null;
  if (!row || row.restored_at) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const now = new Date().toISOString();
  // A vote comment of the daily debate (v12-community-comments.sql): shown again, by its uuid.
  if (row.target_type === 'debate_vote') {
    if (!row.target_ref) return NextResponse.json({ error: 'bad_target' }, { status: 400 });
    const { error: ev } = await svc.from('debate_votes').update({ comment_hidden_at: null }).eq('id', row.target_ref);
    if (ev) return NextResponse.json({ error: 'restore_failed' }, { status: 500 });
    await svc.from('verse_flags').update({ status: 'dismissed', resolved_by: user.id, resolved_at: now })
      .eq('target_type', 'debate_vote').eq('target_ref', row.target_ref).eq('status', 'open');
    await svc.from('community_autohidden').update({ restored_at: now, restored_by: user.id }).eq('id', row.id);
    return NextResponse.json({ ok: true });
  }
  const table = TABLE[row.target_type];
  if (!table) return NextResponse.json({ error: 'bad_target' }, { status: 400 });

  const { error: e1 } = await svc.from(table).update({ status: row.prev_status, ...(HAS_UPDATED_AT.has(row.target_type) ? { updated_at: now } : {}) })
    .eq('id', row.target_id).eq('status', 'hidden');
  if (e1) return NextResponse.json({ error: 'restore_failed' }, { status: 500 });
  await svc.from('verse_flags').update({ status: 'dismissed', resolved_by: user.id, resolved_at: now })
    .eq('target_type', row.target_type).eq('target_id', row.target_id).eq('status', 'open');
  await svc.from('community_autohidden').update({ restored_at: now, restored_by: user.id }).eq('id', row.id);
  return NextResponse.json({ ok: true });
}
