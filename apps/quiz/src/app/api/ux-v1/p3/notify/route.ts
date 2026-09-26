import { NextResponse } from 'next/server';

import { createPublicReadClient, createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { ALERTS_TABLE, isMissingTable, parseGroupId } from '@/lib/ux-v1/p3/alerts';

import type { NextRequest } from 'next/server';

// v11 group hub, empty state: "Notify me" (tell me when this group gets its first
// quiz). Backed by group_quiz_alerts from docs/pending-migrations/
// v11-p3-group-quiz-alerts.sql, which is NOT applied yet: until the owner runs it,
// GET says { live: false } and POST answers 503 not_live BEFORE any write. Flag
// off: 404, nothing new exists. The fan is ALWAYS auth.uid() (never client
// input); RLS scopes every row to its owner.
export const dynamic = 'force-dynamic';

const notFound = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return notFound();
  const groupId = parseGroupId(req.nextUrl.searchParams.get('group'));
  if (!groupId) return NextResponse.json({ error: 'group required' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Guests: only whether the feature exists (a read that RLS answers with 0 rows).
    const { error } = await createPublicReadClient().from(ALERTS_TABLE).select('group_id').limit(1);
    return NextResponse.json({ live: !isMissingTable(error), signedIn: false, subscribed: false });
  }
  const { data, error } = await supabase
    .from(ALERTS_TABLE)
    .select('group_id, notified_at')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .maybeSingle();
  if (isMissingTable(error)) return NextResponse.json({ live: false, signedIn: true, subscribed: false });
  if (error) return NextResponse.json({ error: 'Could not read' }, { status: 500 });
  const row = data as { notified_at: string | null } | null;
  return NextResponse.json({ live: true, signedIn: true, subscribed: !!row && row.notified_at === null });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return notFound();
  let body: { groupId?: unknown; on?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const groupId = parseGroupId(body.groupId);
  if (!groupId || typeof body.on !== 'boolean') return NextResponse.json({ error: 'groupId and on required' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Fail soft BEFORE any write: the table is a pending migration.
  const probe = await supabase.from(ALERTS_TABLE).select('group_id').eq('user_id', user.id).limit(1);
  if (isMissingTable(probe.error)) return NextResponse.json({ error: 'not_live' }, { status: 503 });

  const { data: group } = await supabase.from('groups').select('id').eq('id', groupId).maybeSingle();
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  if (body.on) {
    // Idempotent: the (user_id, group_id) key rejects a second row.
    const { error } = await supabase.from(ALERTS_TABLE).insert({ user_id: user.id, group_id: groupId });
    if (error && error.code !== '23505') {
      console.error('[api/ux-v1/p3/notify] insert failed:', error.message);
      return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    }
    return NextResponse.json({ subscribed: true });
  }
  const { error } = await supabase.from(ALERTS_TABLE).delete().eq('user_id', user.id).eq('group_id', groupId);
  if (error) {
    console.error('[api/ux-v1/p3/notify] delete failed:', error.message);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ subscribed: false });
}
