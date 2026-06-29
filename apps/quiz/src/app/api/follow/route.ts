import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Follow graph endpoint (Workstream M, M1.8). The follower is ALWAYS auth.uid(),
// never client input. GET ?username= returns the viewer's state for that profile;
// POST { username, action } follows/unfollows. Idempotent (the follows PK dedupes),
// rejects self-follow, validates the target exists. Counts are maintained by the
// DB trigger, so this route never touches follower_count directly.
export const dynamic = 'force-dynamic';

async function resolveTarget(supabase: Awaited<ReturnType<typeof createServerClient>>, username: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const username = req.nextUrl.searchParams.get('username') ?? '';
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, isSelf: false, following: false });

  const targetId = await resolveTarget(supabase, username);
  if (!targetId) return NextResponse.json({ signedIn: true, isSelf: false, following: false });
  if (targetId === user.id) return NextResponse.json({ signedIn: true, isSelf: true, following: false });

  const { data: row } = await supabase
    .from('follows').select('follower_id').eq('follower_id', user.id).eq('followed_id', targetId).maybeSingle();
  return NextResponse.json({ signedIn: true, isSelf: false, following: !!row });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { username?: unknown; action?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const username = typeof body.username === 'string' ? body.username : '';
  const action = body.action === 'follow' || body.action === 'unfollow' ? body.action : null;
  if (!username || !action) return NextResponse.json({ error: 'username and action required' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const targetId = await resolveTarget(supabase, username);
  if (!targetId) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  if (action === 'follow') {
    // Idempotent: the PK rejects a duplicate, which we treat as already following.
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, followed_id: targetId });
    if (error && error.code !== '23505') {
      console.error('[api/follow] insert failed:', error.message);
      return NextResponse.json({ error: 'Could not follow' }, { status: 500 });
    }
    return NextResponse.json({ following: true });
  }

  const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', targetId);
  if (error) {
    console.error('[api/follow] delete failed:', error.message);
    return NextResponse.json({ error: 'Could not unfollow' }, { status: 500 });
  }
  return NextResponse.json({ following: false });
}
