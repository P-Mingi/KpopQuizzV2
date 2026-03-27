import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ quizzes: [], groups: [], creators: [] });
  }

  const supabase = await createServerClient();
  const pattern = `%${query}%`;

  try {
    const [quizzesResult, groupsResult, creatorsResult] = await Promise.all([
      // Quizzes by title
      supabase
        .from('quizzes')
        .select(`
          id, title, slug, play_count,
          groups!inner (name, display_color, text_color)
        `)
        .eq('status', 'published')
        .ilike('title', pattern)
        .order('play_count', { ascending: false })
        .limit(5),

      // Groups by name
      supabase
        .from('groups')
        .select('id, name, slug, display_color, text_color, quiz_count')
        .ilike('name', pattern)
        .order('quiz_count', { ascending: false })
        .limit(3),

      // Creators by username
      supabase
        .from('profiles')
        .select('username, avatar_url, avatar_bg, avatar_text, total_quizzes_created')
        .ilike('username', pattern)
        .gt('total_quizzes_created', 0)
        .order('total_plays_received', { ascending: false })
        .limit(3),
    ]);

    // Transform quiz results
    const quizzes = ((quizzesResult.data ?? []) as unknown as Array<{
      id: string;
      title: string;
      slug: string;
      play_count: number;
      groups: { name: string; display_color: string; text_color: string };
    }>).map((q) => ({
      id: q.id,
      title: q.title,
      slug: q.slug,
      play_count: q.play_count,
      group_name: q.groups.name,
      display_color: q.groups.display_color,
      text_color: q.groups.text_color,
    }));

    return NextResponse.json({
      quizzes,
      groups: groupsResult.data ?? [],
      creators: creatorsResult.data ?? [],
    });
  } catch (err) {
    console.error('Search failed:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
