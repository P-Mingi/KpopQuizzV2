import { NextResponse } from 'next/server';

import { getCreatorStanding } from '@/lib/creators/data';
import { isEditorialUser } from '@/lib/editorial/accounts';
import { createServerClient } from '@/lib/supabase/server';
import { avatarOf } from '@/lib/ux-v1/p9/format';
import { isUxV12 } from '@/lib/ux-v12';

import type { CreatorStanding } from '@/lib/creators/data';
import type { AvatarView } from '@/lib/ux-v1/p9/format';

// GET /api/creators/standing  (V12 G8): the signed-in fan's own row under the
// creators board, this month and all time, from the SAME cached aggregate as the
// page (so the pinned row can never disagree with the board). READ ONLY. Only the
// viewer's own public fields leave the server (no user id, no email). The page
// itself stays static/ISR: only this island call reads the session.
// Flag off: 404. An editorial account has no row (it is not on the board).
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const AUTH_TIMEOUT_MS = 2500;

export interface StandingResponse {
  signedIn: boolean;
  me: null | { username: string; href: string; avatar: AvatarView; accent: string | null; font: string | null };
  standing: CreatorStanding | null;
}

const SIGNED_OUT: StandingResponse = { signedIn: false, me: null, standing: null };

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

interface OwnProfile {
  username: string | null;
  avatar_url: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  name_accent: string | null;
  name_font: string | null;
}

export async function GET(): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const supabase = await createServerClient();
    type UserResult = { data: { user: { id: string } | null } };
    const res = await withTimeout<UserResult>(supabase.auth.getUser() as unknown as Promise<UserResult>, AUTH_TIMEOUT_MS, { data: { user: null } });
    const user = res.data?.user ?? null;
    if (!user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });
    if (await isEditorialUser(user.id)) return NextResponse.json({ ...SIGNED_OUT, signedIn: true }, { headers: NO_STORE });

    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, avatar_kind, avatar_ref, name_accent, name_font')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const p = data as OwnProfile | null;
    if (!p?.username) return NextResponse.json({ ...SIGNED_OUT, signedIn: true }, { headers: NO_STORE });

    const body: StandingResponse = {
      signedIn: true,
      me: { username: p.username, href: `/u/${encodeURIComponent(p.username)}`, avatar: avatarOf(p), accent: p.name_accent, font: p.name_font },
      standing: await getCreatorStanding(user.id),
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (err) {
    console.warn('[api/creators/standing] degraded:', (err as Error)?.message ?? err);
    return NextResponse.json({ error: 'standing_unavailable' }, { status: 503, headers: NO_STORE });
  }
}
