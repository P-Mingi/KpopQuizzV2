import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getAvatarColors } from '@/lib/utils';
import { RESERVED_USERNAMES } from '@/lib/constants';

import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  // Fetch current profile
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !currentProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  // Validate username
  if (input.username !== undefined) {
    if (typeof input.username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    const trimmed = input.username.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' }, { status: 400 });
    }
    if (RESERVED_USERNAMES.includes(trimmed as typeof RESERVED_USERNAMES[number])) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
    }
    if (trimmed !== currentProfile.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }
      updates.username = trimmed;
      const colors = getAvatarColors(trimmed);
      updates.avatar_bg = colors.bg;
      updates.avatar_text = colors.text;
    }
  }

  // Validate display_name
  if (input.display_name !== undefined) {
    if (input.display_name === null || input.display_name === '') {
      updates.display_name = null;
    } else if (typeof input.display_name === 'string') {
      if (input.display_name.length > 40) {
        return NextResponse.json({ error: 'Display name must be 40 characters or less' }, { status: 400 });
      }
      updates.display_name = input.display_name;
    }
  }

  // Validate avatar_url
  if (input.avatar_url !== undefined) {
    if (input.avatar_url === null || input.avatar_url === '') {
      updates.avatar_url = null;
    } else if (typeof input.avatar_url === 'string') {
      if (!/^https?:\/\//.test(input.avatar_url)) {
        return NextResponse.json({ error: 'Avatar URL must start with http:// or https://' }, { status: 400 });
      }
      if (input.avatar_url.length > 500) {
        return NextResponse.json({ error: 'Avatar URL must be 500 characters or less' }, { status: 400 });
      }
      updates.avatar_url = input.avatar_url;
    }
  }

  // Validate bio
  if (input.bio !== undefined) {
    if (input.bio === null || input.bio === '') {
      updates.bio = null;
    } else if (typeof input.bio === 'string') {
      if (input.bio.length > 160) {
        return NextResponse.json({ error: 'Bio must be 160 characters or less' }, { status: 400 });
      }
      updates.bio = input.bio;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true, profile: currentProfile });
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('username, display_name, avatar_url, avatar_bg, avatar_text, bio')
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: updatedProfile });
}
