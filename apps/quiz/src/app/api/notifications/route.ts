import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';

import type { NextRequest } from 'next/server';

// Notification type union: single source of truth in lib/notification-types.ts
// (O0 item 8). Re-exported here so existing UI imports keep working.
import type { NotificationType } from '@/lib/notification-types';
export type { NotificationType };

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  quiz_id: string | null;
  /** Slug of the linked quiz (joined via quiz_id). Used for building /q/{slug} URLs. */
  quiz_slug: string | null;
  /** Optional click-through URL set by admin DMs (e.g. Discord invite). */
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationDbRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  quiz_id: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  quizzes: { slug: string } | null;
}

const DEFAULT_LIMIT = 10;

/**
 * GET /api/notifications?limit=10
 * Returns the caller's own notifications (newest first). RLS enforces
 * ownership - unauthenticated calls return an empty list.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!COMMUNITY_FEATURES_ENABLED) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : DEFAULT_LIMIT;
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0') || 0, 0);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const [listRes, unreadRes] = await Promise.all([
    supabase
      .from('creator_notifications')
      .select(
        'id, user_id, type, title, body, quiz_id, link_url, is_read, created_at, quizzes:quiz_id (slug)',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('creator_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ]);

  if (listRes.error) {
    console.error('Failed to fetch notifications:', listRes.error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications: NotificationRow[] = ((listRes.data ?? []) as unknown as NotificationDbRow[]).map(
    (row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body,
      quiz_id: row.quiz_id,
      quiz_slug: row.quizzes?.slug ?? null,
      link_url: row.link_url,
      is_read: row.is_read,
      created_at: row.created_at,
    }),
  );

  return NextResponse.json({
    notifications,
    unreadCount: unreadRes.count ?? 0,
    hasMore: notifications.length === limit,
  });
}

/**
 * DELETE /api/notifications  body { id } or { ids: [...] }
 * O1 item 6: dismiss the caller's own notifications. The mig-122 DELETE RLS
 * policy scopes deletion to the owner, so foreign ids simply delete nothing.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: { id?: unknown; ids?: unknown };
  try { body = (await request.json()) as { id?: unknown; ids?: unknown }; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((x): x is string => typeof x === 'string')
    : typeof body.id === 'string' ? [body.id] : [];
  if (ids.length === 0) return NextResponse.json({ error: 'id or ids required' }, { status: 400 });

  const { error } = await supabase.from('creator_notifications').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: ids.length });
}
