import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getReactionSummary } from '@/lib/verse/essays';

import type { NextRequest } from 'next/server';

// V-ESSAYS-MAX step 3 - essay reactions: counts only, one per real user. GET the
// count + the caller's own state; POST toggles the caller's reaction. The unique
// (user_id, essay_id) constraint makes self-inflation beyond one impossible.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const essayId = Number(new URL(req.url).searchParams.get('essay_id'));
  if (!essayId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const { data: { user } } = await (await createServerClient()).auth.getUser();
  return NextResponse.json({ signedIn: !!user, ...await getReactionSummary(essayId, user?.id ?? null) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const essayId = Number(body.essay_id);
  if (!essayId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const { data: { user } } = await (await createServerClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  // The essay must be public (can't react to a draft/unknown essay).
  const { data: essay } = await svc.from('verse_essays').select('status').eq('id', essayId).maybeSingle();
  if (!essay || (essay as { status: string }).status !== 'featured') return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: existing } = await svc.from('verse_essay_reactions').select('id').eq('essay_id', essayId).eq('user_id', user.id).maybeSingle();
  if (existing) {
    await svc.from('verse_essay_reactions').delete().eq('id', (existing as { id: number }).id);
  } else {
    await svc.from('verse_essay_reactions').insert({ essay_id: essayId, user_id: user.id, kind: 'heart' });
  }
  const summary = await getReactionSummary(essayId, user.id);
  return NextResponse.json({ ok: true, ...summary });
}
