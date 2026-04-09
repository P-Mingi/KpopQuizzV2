import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';

import type { NextRequest } from 'next/server';

/**
 * POST /api/notifications/mark-read
 * Body: { ids?: string[] }
 * When `ids` is provided, marks those notifications as read.
 * When omitted, marks ALL of the caller's notifications as read.
 * RLS enforces ownership.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine - defaults to "mark all"
  }

  const ids =
    typeof body === 'object' && body !== null && Array.isArray((body as { ids?: unknown[] }).ids)
      ? ((body as { ids: unknown[] }).ids.filter((v) => typeof v === 'string') as string[])
      : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let query = supabase
    .from('creator_notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }

  const { data, error } = await query.select('id');

  if (error) {
    console.error('Failed to mark notifications as read:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}
