import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { supabase } = gate;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  // Run O1: the build's site only (a no-op on kpop with SITE_SCOPE off).
  const { data, error } = await forSite(supabase
    .from('quizzes')
    .select('id, title, slug, play_count, groups(name), profiles!quizzes_creator_id_fkey(username)'))
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

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
