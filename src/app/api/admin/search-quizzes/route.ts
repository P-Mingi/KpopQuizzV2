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
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, slug, play_count, groups(name), profiles!quizzes_creator_id_fkey(username)')
    .eq('status', 'published')
    .ilike('title', `%${query}%`)
    .order('play_count', { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  function extractSingle<T>(val: unknown): T | null {
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T | null;
  }

  const results = (data ?? []).map((q: Record<string, unknown>) => {
    return {
      id: q.id,
      title: q.title,
      slug: q.slug,
      play_count: q.play_count,
      group_name: extractSingle<{ name: string }>(q.groups)?.name ?? '',
      username: extractSingle<{ username: string }>(q.profiles)?.username ?? '',
    };
  });

  return NextResponse.json(results);
}
