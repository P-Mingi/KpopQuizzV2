import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  const adminDb = createServiceRoleClient();

  let query = adminDb
    .from('games')
    .select(`
      id, title, slug, status, play_count, like_count, matchup_count, created_at,
      groups (name),
      profiles!games_creator_id_fkey (username)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }

  return NextResponse.json({ games: data });
}
