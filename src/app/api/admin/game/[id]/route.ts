import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// DELETE /api/admin/game/[id] — soft delete (set status = 'removed')
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminDb = createServiceRoleClient();

  const { error } = await adminDb
    .from('games')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove game' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/game/[id] — update title or group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof input.title === 'string' && input.title.trim().length >= 3) {
    updates.title = input.title.trim();
  }
  if ('group_id' in input) {
    updates.group_id = input.group_id ?? null;
  }
  if (typeof input.status === 'string' && ['published', 'removed'].includes(input.status)) {
    updates.status = input.status;
  }

  const adminDb = createServiceRoleClient();
  const { error } = await adminDb.from('games').update(updates).eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
