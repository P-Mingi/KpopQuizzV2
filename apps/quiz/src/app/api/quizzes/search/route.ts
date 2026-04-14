import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

const QUIZ_CARD_SELECT = `
  id, title, slug, quiz_type, difficulty, play_count, total_score_sum, total_completions, like_count, question_count, created_at, cover_image_url,
  groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
  profiles!inner (username, avatar_url, avatar_bg, avatar_text)
`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ quizzes: [] });
  }

  const supabase = await createServerClient();

  try {
    // Search by title, group name, or creator username
    const pattern = `%${query}%`;

    // First search quizzes by title
    const { data: byTitle } = await supabase
      .from('quizzes')
      .select(QUIZ_CARD_SELECT)
      .eq('status', 'published')
      .ilike('title', pattern)
      .order('play_count', { ascending: false })
      .limit(50);

    // Also search by group name to find quizzes in matching groups
    const { data: matchingGroups } = await supabase
      .from('groups')
      .select('id')
      .ilike('name', pattern)
      .limit(10);

    let byGroup: typeof byTitle = [];
    if (matchingGroups && matchingGroups.length > 0) {
      const groupIds = matchingGroups.map((g) => g.id);
      const { data } = await supabase
        .from('quizzes')
        .select(QUIZ_CARD_SELECT)
        .eq('status', 'published')
        .in('group_id', groupIds)
        .order('play_count', { ascending: false })
        .limit(30);
      byGroup = data ?? [];
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged = [];
    for (const q of [...(byTitle ?? []), ...byGroup]) {
      const quiz = q as unknown as { id: string };
      if (!seen.has(quiz.id)) {
        seen.add(quiz.id);
        merged.push(q);
      }
    }

    // Transform to QuizCardData format
    const quizzes = merged.map((row: unknown) => {
      const r = row as {
        id: string; title: string; slug: string; quiz_type: string; difficulty: string;
        play_count: number; total_score_sum: number; total_completions: number;
        like_count: number; question_count: number; created_at: string; cover_image_url: string | null;
        groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
        profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
      };
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        quiz_type: r.quiz_type,
        difficulty: r.difficulty,
        play_count: r.play_count,
        total_score_sum: r.total_score_sum,
        total_completions: r.total_completions,
        like_count: r.like_count,
        question_count: r.question_count,
        created_at: r.created_at,
        cover_image_url: r.cover_image_url,
        group_name: r.groups.name,
        group_slug: r.groups.slug,
        display_color: r.groups.display_color,
        text_color: r.groups.text_color,
        fandom_name: r.groups.fandom_name,
        group_logo_url: r.groups.logo_url,
        creator_username: r.profiles.username,
        creator_avatar_url: r.profiles.avatar_url,
        creator_avatar_bg: r.profiles.avatar_bg,
        creator_avatar_text: r.profiles.avatar_text,
      };
    });

    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error('Quiz search failed:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
