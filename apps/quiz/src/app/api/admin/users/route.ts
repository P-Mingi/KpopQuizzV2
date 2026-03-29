import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = 20;
  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, total_quizzes_created, total_plays_received, created_at, banned_at');

  if (search) {
    query = query.ilike('username', `%${search}%`);
  }

  if (sort === 'most_plays') {
    query = query.order('total_plays_received', { ascending: false });
  } else if (sort === 'most_quizzes') {
    query = query.order('total_quizzes_created', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  // Get total count
  let countQuery = supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.ilike('username', `%${search}%`);
  }
  const { count } = await countQuery;

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}
