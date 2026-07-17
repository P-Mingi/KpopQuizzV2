import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { getAvatarColors } from '@/lib/utils';
import { RESERVED_USERNAMES } from '@/lib/constants';
import { isValidTheme, ULT_MAX, BIAS_MAX } from '@/lib/passport-themes';
import { isValidNameAccent, isValidNameFont, isValidAvatarKind, isValidAvatarPreset } from '@/lib/passport-flair';

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

  // Validate ult_groups (M1.6): up to ULT_MAX existing group slugs.
  if (input.ult_groups !== undefined) {
    if (!Array.isArray(input.ult_groups) || !input.ult_groups.every((s) => typeof s === 'string')) {
      return NextResponse.json({ error: 'Invalid ult groups' }, { status: 400 });
    }
    const slugs = [...new Set((input.ult_groups as string[]).map((s) => s.trim()).filter(Boolean))];
    if (slugs.length > ULT_MAX) {
      return NextResponse.json({ error: `Pick at most ${ULT_MAX} ult groups` }, { status: 400 });
    }
    if (slugs.length > 0) {
      const { data: found } = await supabase.from('groups').select('slug').in('slug', slugs);
      const valid = new Set(((found ?? []) as Array<{ slug: string }>).map((g) => g.slug));
      if (slugs.some((s) => !valid.has(s))) {
        return NextResponse.json({ error: 'One or more groups do not exist' }, { status: 400 });
      }
    }
    updates.ult_groups = slugs;
  }

  // Validate bias (M1.6): short free text (no structured member roster exists).
  if (input.bias !== undefined) {
    if (input.bias === null || input.bias === '') {
      updates.bias = null;
    } else if (typeof input.bias === 'string') {
      if (input.bias.length > BIAS_MAX) {
        return NextResponse.json({ error: `Bias must be ${BIAS_MAX} characters or less` }, { status: 400 });
      }
      updates.bias = input.bias.trim();
    }
  }

  // Validate profile_theme (M1.6): preset enum only.
  if (input.profile_theme !== undefined) {
    if (typeof input.profile_theme !== 'string' || !isValidTheme(input.profile_theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }
    updates.profile_theme = input.profile_theme;
  }

  // Identity flair (M1.26): curated enums only, validated server-side.
  if (input.name_accent !== undefined) {
    if (typeof input.name_accent !== 'string' || !isValidNameAccent(input.name_accent)) {
      return NextResponse.json({ error: 'Invalid name accent' }, { status: 400 });
    }
    updates.name_accent = input.name_accent;
  }
  if (input.name_font !== undefined) {
    if (typeof input.name_font !== 'string' || !isValidNameFont(input.name_font)) {
      return NextResponse.json({ error: 'Invalid name font' }, { status: 400 });
    }
    updates.name_font = input.name_font;
  }
  if (input.avatar_kind !== undefined) {
    if (typeof input.avatar_kind !== 'string' || !isValidAvatarKind(input.avatar_kind)) {
      return NextResponse.json({ error: 'Invalid avatar kind' }, { status: 400 });
    }
    updates.avatar_kind = input.avatar_kind;
  }
  if (input.avatar_ref !== undefined) {
    if (input.avatar_ref === null || input.avatar_ref === '') {
      updates.avatar_ref = null;
    } else if (typeof input.avatar_ref === 'string' && input.avatar_ref.length <= 600) {
      // A preset ref must be a curated key; photo/custom refs are length-capped strings.
      const kind = (updates.avatar_kind ?? (currentProfile as { avatar_kind?: string }).avatar_kind ?? 'photo') as string;
      if (kind === 'preset' && !isValidAvatarPreset(input.avatar_ref)) {
        return NextResponse.json({ error: 'Invalid avatar preset' }, { status: 400 });
      }
      updates.avatar_ref = input.avatar_ref;
    } else {
      return NextResponse.json({ error: 'Invalid avatar reference' }, { status: 400 });
    }
  }
  if (input.pinned_badge_id !== undefined) {
    if (input.pinned_badge_id === null || input.pinned_badge_id === '') {
      updates.pinned_badge_id = null;
    } else if (typeof input.pinned_badge_id === 'string') {
      // Can only pin a badge you have earned.
      const { data: earned } = await supabase
        .from('user_badges').select('badge_id').eq('user_id', user.id).eq('badge_id', input.pinned_badge_id).maybeSingle();
      if (!earned) {
        return NextResponse.json({ error: 'You have not earned that badge' }, { status: 400 });
      }
      updates.pinned_badge_id = input.pinned_badge_id;
    } else {
      return NextResponse.json({ error: 'Invalid badge' }, { status: 400 });
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
    .select('username, display_name, avatar_url, avatar_bg, avatar_text, bio, ult_groups, bias, profile_theme, name_accent, name_font, pinned_badge_id, avatar_kind, avatar_ref')
    .single();

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  // Bake the identity edit into the static /u/[username] ISR render.
  if (updatedProfile?.username) {
    revalidatePath(`/u/${updatedProfile.username}`);
  }

  return NextResponse.json({ success: true, profile: updatedProfile });
}
