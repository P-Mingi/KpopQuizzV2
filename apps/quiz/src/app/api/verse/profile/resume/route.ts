import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getProfileVisibility, setSectionVisibility, PROFILE_SECTIONS } from '@/lib/verse/profile-visibility';
import { deriveProfileStats } from '@/lib/verse/profile-stats';
import { getUserActivity } from '@/lib/verse/activity';

import type { NextRequest } from 'next/server';
import type { ProfileSection } from '@/lib/verse/profile-visibility';

export const dynamic = 'force-dynamic';

// V-PROFILE-ONE step 3/3b - the owner-scoped fan-resume endpoint. Self-scoped:
// it only ever returns/writes the SIGNED-IN user's own resume, so the owner
// island can reveal all sections (public + private) and flip the per-section
// visibility. Strangers get the server-rendered public band only; this route
// never exposes another user's private sections.

async function ownUsername(userId: string): Promise<string | null> {
  const svc = createServiceRoleClient();
  const { data } = await svc.from('profiles').select('username').eq('id', userId).maybeSingle();
  return (data as { username: string | null } | null)?.username ?? null;
}

export async function GET(): Promise<NextResponse> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false });

  const [username, visibility, stats, activity] = await Promise.all([
    ownUsername(user.id),
    getProfileVisibility(user.id),
    deriveProfileStats(user.id),
    getUserActivity(user.id, { limit: 12 }),
  ]);
  return NextResponse.json({ signedIn: true, username, visibility, stats, activity });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { section?: string; is_public?: boolean };
  if (!body.section || !(PROFILE_SECTIONS as readonly string[]).includes(body.section) || typeof body.is_public !== 'boolean') {
    return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  }
  await setSectionVisibility(user.id, body.section as ProfileSection, body.is_public);
  const visibility = await getProfileVisibility(user.id);
  return NextResponse.json({ ok: true, visibility });
}
