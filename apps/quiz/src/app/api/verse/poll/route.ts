import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 5 - curator creates a space poll (reuses the vote engine, space-
// scoped). 2..6 options, optional expiry. Curator+ only.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const question = String(body.question ?? '').trim().slice(0, 200);
  const options = Array.isArray(body.options) ? body.options.map((o) => String(o).trim().slice(0, 80)).filter(Boolean) : [];
  if (!groupId || !question || options.length < 2 || options.length > 6) {
    return NextResponse.json({ error: 'A poll needs a question and 2 to 6 options.' }, { status: 400 });
  }
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const expiresAt = body.expires_hours != null
    ? new Date(Date.now() + Math.min(Math.max(Number(body.expires_hours), 1), 24 * 30) * 3600_000).toISOString()
    : null;

  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('space_polls')
    .insert({ group_id: groupId, question, options, created_by: user.id, status: 'open', expires_at: expiresAt })
    .select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
