import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { getAvatarColors } from '@/lib/utils';
import { RESERVED_USERNAMES } from '@/lib/constants';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  // Use service role client to bypass RLS (admin updating another user's profile)
  const adminDb = createServiceRoleClient();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.username !== undefined) {
    const username = body.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
    }
    if (RESERVED_USERNAMES.includes(username as typeof RESERVED_USERNAMES[number])) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
    }
    // Check availability (skip if same as current)
    const { data: existing } = await adminDb
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }
    updates.username = username;
    const colors = getAvatarColors(username);
    updates.avatar_bg = colors.bg;
    updates.avatar_text = colors.text;
  }

  if (body.display_name !== undefined) {
    updates.display_name = body.display_name?.trim() || null;
  }

  if (body.avatar_url !== undefined) {
    if (body.avatar_url && !/^https?:\/\//.test(body.avatar_url)) {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
    }
    updates.avatar_url = body.avatar_url || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await adminDb
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
