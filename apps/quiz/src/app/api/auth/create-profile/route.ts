import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getAvatarColors } from '@/lib/utils';
import { RESERVED_USERNAMES } from '@/lib/constants';
import { VIA_RE } from '@/lib/network/types';
import { SITE_ID } from '@/lib/site/registry';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse & validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { username } = body as Record<string, unknown>;

  if (typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const trimmed = username.trim();

  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
    return NextResponse.json(
      { error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' },
      { status: 400 },
    );
  }

  if (RESERVED_USERNAMES.includes(trimmed as typeof RESERVED_USERNAMES[number])) {
    return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
  }

  // 3. Check availability
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', trimmed)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
  }

  // 4. Check if user already has a profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: 'Profile already exists' }, { status: 400 });
  }

  // 5. Create profile
  const colors = getAvatarColors(trimmed);

  // Run O1 (B3): kpop keeps today's insert (the profile trigger makes the kpop membership). Another site goes
  // through create_profile_for_site, which sets the site so the trigger makes that site's membership.
  let error: unknown;
  if (SITE_ID === 'kpop') {
    ({ error } = await supabase.from('profiles').insert({
      id: user.id,
      username: trimmed,
      avatar_bg: colors.bg,
      avatar_text: colors.text,
    }));
  } else {
    const via = (body as Record<string, unknown>).via;
    ({ error } = await supabase.rpc('create_profile_for_site', {
      p_username: trimmed,
      p_site: SITE_ID,
      p_avatar_bg: colors.bg,
      p_avatar_text: colors.text,
      p_via: 'signup',
      p_via_code: typeof via === 'string' && VIA_RE.test(via) ? via : null,
    }));
  }

  if (error) {
    console.error('Failed to create profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true, username: trimmed });
}
