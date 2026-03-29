import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getAvatarColors } from '@/lib/utils';
import { RESERVED_USERNAMES } from '@/lib/constants';

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

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    username: trimmed,
    avatar_bg: colors.bg,
    avatar_text: colors.text,
  });

  if (error) {
    console.error('Failed to create profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true, username: trimmed });
}
