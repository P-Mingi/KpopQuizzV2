import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';

import type { NextRequest } from 'next/server';

export type NotificationType = 'milestone' | 'rating' | 'comment' | 'trending';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  quiz_id: string | null;
  /** Slug of the linked quiz (joined via quiz_id). Used for building /q/{slug} URLs. */
  quiz_slug: string | null;
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
  const limit = limitParam ? Math.min(Number(limitParam), 50) : DEFAULT_LIMIT;

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
        'id, user_id, type, title, body, quiz_id, is_read, created_at, quizzes:quiz_id (slug)',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
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
      is_read: row.is_read,
      created_at: row.created_at,
    }),
  );

  return NextResponse.json({
    notifications,
    unreadCount: unreadRes.count ?? 0,
  });
}
