import { NextResponse } from 'next/server';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { isMissingTable } from '@/lib/ux-v1/p8/features';
import { verseHidden } from '@/lib/verse/visibility';

// GET /api/ux-v1/p8/viewer: the signed-in fan's OWN community state, read only:
// who they follow (usernames, for the Following tab and the Follow buttons) and what
// they hearted (blog hearts from verse_essay_reactions; other hearts from
// community_likes once the pending store exists). Never anyone else's rows (the
// session user id filters every read). Guests: signedIn false.
export const dynamic = 'force-dynamic';

const CAP = 2000;

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, following: [], liked: [] }, { headers: { 'cache-control': 'private, no-store' } });

  const svc = createServiceRoleClient();
  try {
    const [follows, essays] = await Promise.all([
      fetchAllRows<{ followed_id: string }>(() => svc.from('follows').select('followed_id').eq('follower_id', user.id).order('created_at', { ascending: false })),
      // Blog hearts are Verse rows: not read while the Verse is hidden (verse-gate.ts).
      verseHidden() ? Promise.resolve([] as { essay_id: number }[]) : fetchAllRows<{ essay_id: number }>(() => svc.from('verse_essay_reactions').select('essay_id').eq('user_id', user.id)),
    ]);
    const ids = follows.slice(0, CAP).map((f) => f.followed_id);
    const usernames: string[] = [];
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await svc.from('profiles').select('username').in('id', ids.slice(i, i + 500));
      if (error) throw new Error(error.message);
      for (const r of (data ?? []) as { username: string | null }[]) if (r.username) usernames.push(r.username);
    }
    const liked = essays.map((e) => `essay:${e.essay_id}`);
    const { data: likes, error: likeErr, status } = await svc.from('community_likes').select('target_type, target_id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(CAP);
    if (likeErr && !isMissingTable(likeErr, status)) throw new Error(likeErr.message);
    for (const l of (likes ?? []) as { target_type: string; target_id: string }[]) liked.push(`${l.target_type}:${l.target_id}`);
    return NextResponse.json({ signedIn: true, following: usernames, liked }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (e) {
    console.error('[p8 viewer]', (e as Error).message);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
