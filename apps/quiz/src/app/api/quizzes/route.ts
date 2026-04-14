import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';
import type { QuizCardData, QuizType, Difficulty } from '@/lib/db/types';

const QUIZ_CARD_SELECT = `
  id, title, slug, quiz_type, difficulty, play_count, total_score_sum, total_completions, like_count, question_count, created_at, cover_image_url,
  groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
  profiles!inner (username, avatar_url, avatar_bg, avatar_text)
`;

interface RawRow {
  id: string; title: string; slug: string; quiz_type: string; difficulty: string;
  play_count: number; total_score_sum: number; total_completions: number;
  like_count: number; question_count: number; created_at: string; cover_image_url: string | null;
  groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
}

function toCard(r: RawRow): QuizCardData {
  return {
    id: r.id, title: r.title, slug: r.slug, quiz_type: r.quiz_type as QuizType, difficulty: r.difficulty as Difficulty,
    play_count: r.play_count, total_score_sum: r.total_score_sum, total_completions: r.total_completions,
    like_count: r.like_count, question_count: r.question_count, created_at: r.created_at,
    cover_image_url: r.cover_image_url, group_name: r.groups.name, group_slug: r.groups.slug,
    display_color: r.groups.display_color, text_color: r.groups.text_color,
    fandom_name: r.groups.fandom_name, logo_url: r.groups.logo_url,
    creator_username: r.profiles.username, creator_avatar_url: r.profiles.avatar_url,
    creator_avatar_bg: r.profiles.avatar_bg, creator_avatar_text: r.profiles.avatar_text,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'trending';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limitParam = parseInt(searchParams.get('limit') ?? '10', 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const groupId = searchParams.get('group_id');
  const quizType = searchParams.get('quiz_type');

  const supabase = await createServerClient();

  try {
    let query = supabase
      .from('quizzes')
      .select(QUIZ_CARD_SELECT)
      .eq('status', 'published');

    // Server-side group filter
    if (groupId) {
      query = query.eq('group_id', parseInt(groupId, 10));
    }

    // Server-side type filter
    if (quizType) {
      query = query.eq('quiz_type', quizType);
    }

    // Sort based on tab
    switch (tab) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'most_liked':
        query = query.gt('like_count', 0).order('like_count', { ascending: false });
        break;
      case 'trending': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', thirtyDaysAgo).order('play_count', { ascending: false });
        break;
      }
      case 'all':
      default:
        query = query.order('play_count', { ascending: false });
        break;
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    let quizzes = (data as unknown as RawRow[]).map(toCard);

    // top_rated: sort by avg score descending
    if (tab === 'top_rated') {
      quizzes.sort((a, b) => {
        const avgA = a.total_completions > 0 && a.question_count > 0
          ? (a.total_score_sum / a.total_completions / a.question_count) * 100 : 0;
        const avgB = b.total_completions > 0 && b.question_count > 0
          ? (b.total_score_sum / b.total_completions / b.question_count) * 100 : 0;
        return avgB - avgA;
      });
    }

    return NextResponse.json({ quizzes });
  } catch (err) {
    console.error('Failed to fetch quizzes:', err);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}
