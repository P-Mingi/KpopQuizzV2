import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { resolveLike, type LikeAction } from '@/lib/tier-list/engage';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Like / unlike a published tier list. A like is a ROW in tier_list_likes owned by
// a signed-in user (147), so it is idempotent by its (list_id,user_id) primary key
// and the counter is maintained by the 147 trigger - application code never writes
// tier_lists.likes. Anonymous likes are refused: a fresh id per request is a fresh
// "like", and this counter ranks a public surface. The write uses the cookie client
// so the 147 creator RLS is the guard; the user id is the verified auth.getUser()
// id, never a client-supplied value.
// The current viewer's like state for a slug (to render the filled heart on
// mount). Logged out -> liked:false + needsAuth, still returns the public count.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!slug) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  const supa = await createServerClient();
  const { data: list } = await supa.from('tier_lists').select('id,likes').eq('slug', slug).maybeSingle();
  if (!list) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const { data: { user } } = await supa.auth.getUser();
  const likes = (list as { likes: number }).likes;
  if (!user) return NextResponse.json({ liked: false, likes, needsAuth: true });
  const { data: existing } = await supa.from('tier_list_likes').select('list_id').eq('list_id', (list as { id: string }).id).eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ liked: Boolean(existing), likes, needsAuth: false });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { slug?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!slug) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  const action: LikeAction | undefined = body.action === 'like' ? 'like' : body.action === 'unlike' ? 'unlike' : undefined;

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to like a tier list.', needsAuth: true }, { status: 401 });

  const { data: list } = await supa.from('tier_lists').select('id,likes').eq('slug', slug).maybeSingle();
  if (!list) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const listId = (list as { id: string }).id;

  const { data: existing } = await supa.from('tier_list_likes').select('list_id').eq('list_id', listId).eq('user_id', user.id).maybeSingle();
  const decision = resolveLike(Boolean(existing), action);

  if (decision.op === 'insert') {
    const { error } = await supa.from('tier_list_likes').insert({ list_id: listId, user_id: user.id });
    // A concurrent insert that hits the PK is a benign no-op, not an error.
    if (error && (error as { code?: string }).code !== '23505') return NextResponse.json({ error: 'Could not like.' }, { status: 500 });
  } else if (decision.op === 'delete') {
    const { error } = await supa.from('tier_list_likes').delete().eq('list_id', listId).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Could not unlike.' }, { status: 500 });
  }

  // The trigger has updated the counter; read it back for the response.
  const { data: after } = await supa.from('tier_lists').select('likes').eq('id', listId).maybeSingle();
  const likes = (after as { likes: number } | null)?.likes ?? (list as { likes: number }).likes;
  return NextResponse.json({ liked: decision.liked, likes });
}
