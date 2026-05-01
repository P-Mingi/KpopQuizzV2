import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

/**
 * GET /api/admin/quizzes?q=&status=all&sort=newest&offset=0&limit=20
 *
 * Server-side quiz search for the admin dashboard.
 * Searches by title or creator username across ALL quizzes.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const status = searchParams.get('status') ?? 'all';
  const sort = searchParams.get('sort') ?? 'newest';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)));

  let q = supabase
    .from('quizzes')
    .select('id, title, slug, status, play_count, report_count, total_score_sum, total_completions, difficulty, created_at, questions, groups(name), profiles!quizzes_creator_id_fkey(username)');

  // Status filter
  if (status === 'published') q = q.eq('status', 'published');
  else if (status === 'flagged') q = q.eq('status', 'flagged');
  else if (status === 'removed') q = q.eq('status', 'removed');

  // Text search by title
  if (query.length >= 2) {
    // First try to find creator IDs matching the query, then search titles too
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', `%${query}%`)
      .limit(50);

    const creatorIds = (matchingProfiles ?? []).map(p => p.id as string);

    if (creatorIds.length > 0) {
      q = q.or(`title.ilike.%${query}%,creator_id.in.(${creatorIds.join(',')})`);
    } else {
      q = q.ilike('title', `%${query}%`);
    }
  }

  // Sort
  if (sort === 'most_played') q = q.order('play_count', { ascending: false });
  else if (sort === 'most_reported') q = q.order('report_count', { ascending: false });
  else q = q.order('created_at', { ascending: false });

  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  function extractSingle<T>(val: unknown): T | null {
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T | null;
  }

  const quizzes = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    status: row.status as string,
    play_count: row.play_count as number,
    report_count: row.report_count as number,
    avg_score: (row.total_completions as number) > 0 && Array.isArray(row.questions) && row.questions.length > 0
      ? Math.round(((row.total_score_sum as number) / (row.total_completions as number)) / row.questions.length * 100)
      : 0,
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
    difficulty: row.difficulty as string,
    created_at: row.created_at as string,
    group_name: extractSingle<{ name: string }>(row.groups)?.name ?? '',
    creator_username: extractSingle<{ username: string }>(row.profiles)?.username ?? '',
  }));

  return NextResponse.json({ quizzes });
}
